import { useEffect, useState, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { FocusSessionService, APP_SWITCH_GRACE_PERIOD_MS } from '../services/focusSessionService';
import { MetadataRepository } from '../storage/repositories/metadataRepository';
import type { FocusSession, FocusSessionFailReason } from '../types/domain';

export type UseFocusSessionResult = {
  readonly activeSession: FocusSession | null;
  readonly timeLeftMs: number;
  readonly startSession: (targetMinutes: number) => Promise<FocusSession>;
  readonly giveUp: () => Promise<FocusSession>;
  readonly clearSessionState: () => void;
  readonly lastSucceededSession: FocusSession | null;
  readonly lastFailedSession: FocusSession | null;
  readonly isRestoring: boolean;
  readonly studentId: string;
  readonly deviceId: string;
};

const HEARTBEAT_KEY = 'focus_session_heartbeat';

export function useFocusSession(
  database: SQLiteDatabase,
  studentId: string,
  deviceId: string
): UseFocusSessionResult {
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  const [lastSucceededSession, setLastSucceededSession] = useState<FocusSession | null>(null);
  const [lastFailedSession, setLastFailedSession] = useState<FocusSession | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(true);

  const serviceRef = useRef<FocusSessionService | null>(null);
  const metadataRef = useRef<MetadataRepository | null>(null);
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const backgroundTimerRef = useRef<NodeJS.Timeout | null>(null);
  const backgroundTimeRef = useRef<number | null>(null);

  // Initialize service and metadata repo
  if (!serviceRef.current) {
    serviceRef.current = new FocusSessionService(database);
  }
  if (!metadataRef.current) {
    metadataRef.current = new MetadataRepository(database);
  }

  const focusService = serviceRef.current;
  const metadataRepo = metadataRef.current;

  // Cleanup helper
  const stopTimers = () => {
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (backgroundTimerRef.current) {
      clearTimeout(backgroundTimerRef.current);
      backgroundTimerRef.current = null;
    }
  };

  // Helper to record foreground heartbeat
  const updateHeartbeat = async () => {
    try {
      await metadataRepo.set(HEARTBEAT_KEY, String(Date.now()));
    } catch (error) {
      console.error('Failed to update focus session heartbeat:', error);
    }
  };

  // Trigger local session success completion
  const handleSuccess = async (session: FocusSession) => {
    stopTimers();
    try {
      const completed = await focusService.completeSession(session.id);
      setActiveSession(null);
      setTimeLeftMs(0);
      setLastSucceededSession(completed);
      setLastFailedSession(null);
    } catch (err) {
      console.error('Failed to complete focus session:', err);
    }
  };

  // Trigger local session failure
  const handleFailure = async (session: FocusSession, reason: FocusSessionFailReason) => {
    stopTimers();
    try {
      const failed = await focusService.failSession(session.id, reason);
      setActiveSession(null);
      setTimeLeftMs(0);
      setLastFailedSession(failed);
      setLastSucceededSession(null);
    } catch (err) {
      console.error('Failed to fail focus session:', err);
    }
  };

  // Check database for active sessions and run crash recovery logic on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const session = await focusService.getActiveSession(studentId);
        if (session) {
          const heartbeatVal = await metadataRepo.get(HEARTBEAT_KEY);
          const lastHeartbeat = heartbeatVal ? Number(heartbeatVal) : 0;
          const now = Date.now();
          const inactiveMs = now - lastHeartbeat;

          if (lastHeartbeat > 0 && inactiveMs > APP_SWITCH_GRACE_PERIOD_MS) {
            // App was closed/killed/backgrounded for longer than grace period. Recover by failing it.
            const failed = await focusService.failSession(session.id, 'app_switch');
            setLastFailedSession(failed);
            setActiveSession(null);
            setTimeLeftMs(0);
          } else {
            // Re-activate active session and compute remaining time
            setActiveSession(session);
            const elapsed = now - Date.parse(session.startedAtClient);
            const targetMs = session.targetMinutes * 60_000;
            const remaining = Math.max(0, targetMs - elapsed);
            setTimeLeftMs(remaining);

            if (remaining <= 0) {
              await handleSuccess(session);
            } else {
              // Immediately update heartbeat on restore
              await updateHeartbeat();
            }
          }
        }
      } catch (err) {
        console.error('Error during focus session restore:', err);
      } finally {
        setIsRestoring(false);
      }
    };

    restoreSession();
    return () => stopTimers();
  }, [database, studentId]);

  // Timers controller for running session
  useEffect(() => {
    if (!activeSession) {
      stopTimers();
      return;
    }

    // Tick countdown once per second
    tickIntervalRef.current = setInterval(async () => {
      const now = Date.now();
      const elapsed = now - Date.parse(activeSession.startedAtClient);
      const targetMs = activeSession.targetMinutes * 60_000;
      const remaining = Math.max(0, targetMs - elapsed);

      setTimeLeftMs(remaining);

      if (remaining <= 0) {
        await handleSuccess(activeSession);
      }
    }, 1000);

    // Heartbeat updates metadata once per second
    heartbeatIntervalRef.current = setInterval(() => {
      updateHeartbeat();
    }, 1000);

    return () => stopTimers();
  }, [activeSession]);

  // Monitor AppState to handle background limits (fails session if backgrounded > 5 seconds)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (!activeSession) return;

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background
        backgroundTimeRef.current = Date.now();

        // 1. Fallback: Start background failure timer in Javascript memory
        backgroundTimerRef.current = setTimeout(async () => {
          await handleFailure(activeSession, 'app_switch');
        }, APP_SWITCH_GRACE_PERIOD_MS);

      } else if (nextAppState === 'active') {
        // App returned to foreground. Cancel javascript background timer.
        if (backgroundTimerRef.current) {
          clearTimeout(backgroundTimerRef.current);
          backgroundTimerRef.current = null;
        }

        const bgTime = backgroundTimeRef.current;
        backgroundTimeRef.current = null;

        if (bgTime !== null) {
          const timeInBackground = Date.now() - bgTime;
          if (timeInBackground > APP_SWITCH_GRACE_PERIOD_MS) {
            // User was backgrounded for more than grace period. Fail immediately.
            await handleFailure(activeSession, 'app_switch');
          } else {
            // Less than 5 seconds. Resume heartbeat & re-sync time
            await updateHeartbeat();
            const now = Date.now();
            const elapsed = now - Date.parse(activeSession.startedAtClient);
            const targetMs = activeSession.targetMinutes * 60_000;
            const remaining = Math.max(0, targetMs - elapsed);
            setTimeLeftMs(remaining);

            if (remaining <= 0) {
              await handleSuccess(activeSession);
            }
          }
        } else {
          // If backgroundTimeRef was null, perform a check against metadata heartbeat
          const heartbeatVal = await metadataRepo.get(HEARTBEAT_KEY);
          const lastHeartbeat = heartbeatVal ? Number(heartbeatVal) : 0;
          const timeSinceHeartbeat = Date.now() - lastHeartbeat;

          if (lastHeartbeat > 0 && timeSinceHeartbeat > APP_SWITCH_GRACE_PERIOD_MS) {
            await handleFailure(activeSession, 'app_switch');
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [activeSession]);

  // Start a new session
  const startSession = async (targetMinutes: number): Promise<FocusSession> => {
    if (activeSession) {
      throw new Error('A focus session is already running.');
    }
    const session = await focusService.startSession({
      deviceId,
      studentId,
      targetMinutes
    });

    setLastSucceededSession(null);
    setLastFailedSession(null);
    setActiveSession(session);
    setTimeLeftMs(targetMinutes * 60_000);
    await updateHeartbeat();

    return session;
  };

  // Give up on current session
  const giveUp = async (): Promise<FocusSession> => {
    if (!activeSession) {
      throw new Error('No focus session is currently running.');
    }
    const failedSession = await focusService.failSession(activeSession.id, 'give_up');
    stopTimers();
    setActiveSession(null);
    setTimeLeftMs(0);
    setLastFailedSession(failedSession);
    setLastSucceededSession(null);

    return failedSession;
  };

  const clearSessionState = () => {
    setLastSucceededSession(null);
    setLastFailedSession(null);
  };

  return {
    activeSession,
    clearSessionState,
    deviceId,
    giveUp,
    isRestoring,
    lastFailedSession,
    lastSucceededSession,
    startSession,
    studentId,
    timeLeftMs
  };
}
