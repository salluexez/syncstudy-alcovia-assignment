import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useFocusSession } from '../hooks/useFocusSession';
import { FocusTimer } from '../components/FocusTimer';
import { LocalStudentRepository } from '../storage/repositories/studentRepository';
import { LocalFocusEffectRepository } from '../storage/repositories/focusEffectRepository';
import type { Student, LocalFocusEffect } from '../types/domain';

type FocusScreenProps = {
  readonly database: SQLiteDatabase;
  readonly studentId: string;
  readonly deviceId: string;
};

export const FocusScreen: React.FC<FocusScreenProps> = ({
  database,
  studentId,
  deviceId
}) => {
  const {
    activeSession,
    timeLeftMs,
    startSession,
    giveUp,
    clearSessionState,
    lastSucceededSession,
    lastFailedSession,
    isRestoring
  } = useFocusSession(database, studentId, deviceId);

  const [selectedDuration, setSelectedDuration] = useState<number>(25);
  const [studentStats, setStudentStats] = useState<Student | null>(null);
  const [preparedEffects, setPreparedEffects] = useState<LocalFocusEffect[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  // Load student stats from SQLite on mount or when session finishes
  const loadStudentStats = async () => {
    try {
      const repo = new LocalStudentRepository(database);
      const stats = await repo.findById(studentId);
      if (stats) {
        setStudentStats(stats);
      }
    } catch (err) {
      console.error('Failed to load student stats:', err);
    }
  };

  useEffect(() => {
    loadStudentStats();
  }, [database, studentId, activeSession, lastSucceededSession]);

  // Load prepared focus effects for the recently completed session
  useEffect(() => {
    const loadEffects = async () => {
      if (lastSucceededSession) {
        try {
          const repo = new LocalFocusEffectRepository(database);
          const effects = await repo.listBySessionId(lastSucceededSession.id);
          setPreparedEffects(effects);
        } catch (err) {
          console.error('Failed to load prepared effects:', err);
        }
      } else {
        setPreparedEffects([]);
      }
    };
    loadEffects();
  }, [database, lastSucceededSession]);

  const handleStart = async () => {
    setActionError(null);
    try {
      await startSession(selectedDuration);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to start session.');
    }
  };

  const handleGiveUp = async () => {
    setActionError(null);
    try {
      await giveUp();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to abort session.');
    }
  };

  if (isRestoring) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Restoring session state...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Stats Header */}
        <View style={styles.statsHeader}>
          <View>
            <Text style={styles.studentName}>{studentStats?.name ?? 'SyncStudy Student'}</Text>
            <Text style={styles.studentSub}>Offline Study Sync</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Feather name="zap" size={14} color="#f59e0b" style={styles.chipIcon} />
              <Text style={styles.statVal}>{studentStats?.currentStreak ?? 0}d</Text>
            </View>
            <View style={styles.statChip}>
              <Feather name="database" size={14} color="#6366f1" style={styles.chipIcon} />
              <Text style={styles.statVal}>{studentStats?.coins ?? 0}</Text>
            </View>
          </View>
        </View>

        {actionError && (
          <View style={styles.errorAlert}>
            <Feather name="alert-triangle" size={16} color="#ef4444" style={styles.alertIcon} />
            <Text style={styles.errorText}>{actionError}</Text>
          </View>
        )}

        {/* 1. Active Focus State */}
        {activeSession && (
          <View style={styles.activeContainer}>
            <FocusTimer
              timeLeftMs={timeLeftMs}
              targetMinutes={activeSession.targetMinutes}
              onGiveUp={handleGiveUp}
              isExpired={timeLeftMs <= 0}
            />
          </View>
        )}

        {/* 2. Selection Idle State */}
        {!activeSession && !lastSucceededSession && !lastFailedSession && (
          <View style={styles.idleCard}>
            <Text style={styles.cardTitle}>Choose Target Duration</Text>
            <Text style={styles.cardDesc}>
              Select how long you want to focus. Keep the app open and focused.
            </Text>

            <View style={styles.presetsGrid}>
              {[1, 25, 50, 90, 120].map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={[
                    styles.presetBtn,
                    selectedDuration === mins && styles.presetBtnActive
                  ]}
                  onPress={() => setSelectedDuration(mins)}
                >
                  <Text
                    style={[
                      styles.presetBtnText,
                      selectedDuration === mins && styles.presetBtnTextActive
                    ]}
                  >
                    {mins} {mins === 1 ? 'Min' : 'Mins'}
                  </Text>
                  {mins === 1 && (
                    <View style={styles.devTag}>
                      <Text style={styles.devTagText}>Demo</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.8}>
              <Feather name="play" size={18} color="#ffffff" style={styles.startIcon} />
              <Text style={styles.startBtnText}>Start Focus Session</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 3. Successful State */}
        {lastSucceededSession && (
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <Feather name="award" size={48} color="#10b981" />
            </View>
            <Text style={styles.successTitle}>Session Completed!</Text>
            <Text style={styles.successMessage}>
              Incredible job! You focused for {lastSucceededSession.actualMinutes} mins.
            </Text>

            {preparedEffects.length > 0 && (
              <View style={styles.effectsSection}>
                <Text style={styles.effectsHeading}>Queued Operations (Offline)</Text>
                {preparedEffects.map((effect) => {
                  let icon = 'gift';
                  let label = '';
                  if (effect.effectType === 'reward_prepared') {
                    icon = 'database';
                    label = 'Coins Reward Calculation';
                  } else if (effect.effectType === 'streak_update_prepared') {
                    icon = 'zap';
                    label = 'Streak Progress Rollup';
                  } else if (effect.effectType === 'focus_minutes_prepared') {
                    icon = 'clock';
                    label = `Log +${lastSucceededSession.actualMinutes} Focus Minutes`;
                  }
                  return (
                    <View key={effect.id} style={styles.effectItem}>
                      <Feather name={icon as any} size={14} color="#6366f1" style={styles.effectIcon} />
                      <Text style={styles.effectLabel}>{label}</Text>
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>Pending Sync</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={clearSessionState}
              activeOpacity={0.8}
            >
              <Text style={styles.doneBtnText}>Focus Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 4. Failure State */}
        {lastFailedSession && (
          <View style={styles.failedCard}>
            <View style={styles.failedIconCircle}>
              <Feather name="frown" size={48} color="#ef4444" />
            </View>
            <Text style={styles.failedTitle}>Focus Interrupted</Text>

            <View style={styles.failureReasonBox}>
              <Text style={styles.failureReasonLabel}>
                {lastFailedSession.failReason === 'give_up'
                  ? 'Reason: Tapped "Give Up"'
                  : 'Reason: App Switch / Backgrounded'}
              </Text>
              <Text style={styles.failureReasonDesc}>
                {lastFailedSession.failReason === 'give_up'
                  ? 'Every step counts! Try setting a smaller duration next time to build momentum.'
                  : 'Leaving the app breaks focus. Keep the screen active to successfully complete focus sessions.'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.retryBtn}
              onPress={clearSessionState}
              activeOpacity={0.8}
            >
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  activeContainer: {
    marginTop: 8,
    width: '100%'
  },
  alertIcon: {
    marginRight: 8
  },
  cardDesc: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center'
  },
  cardTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center'
  },
  chipIcon: {
    marginRight: 4
  },
  devTag: {
    backgroundColor: '#e0e7ff',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    position: 'absolute',
    right: 4,
    top: 4
  },
  devTagText: {
    color: '#4f46e5',
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  doneBtn: {
    alignItems: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 16,
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 14,
    width: '100%'
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  effectIcon: {
    marginRight: 8
  },
  effectItem: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    flexDirection: 'row',
    marginBottom: 8,
    padding: 12,
    width: '100%'
  },
  effectLabel: {
    color: '#334155',
    flex: 1,
    fontSize: 13,
    fontWeight: '500'
  },
  effectsHeading: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase'
  },
  effectsSection: {
    borderColor: '#e2e8f0',
    borderTopWidth: 1,
    marginTop: 20,
    paddingTop: 16,
    width: '100%'
  },
  errorAlert: {
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 16,
    padding: 16
  },
  errorText: {
    color: '#b91c1c',
    flex: 1,
    fontSize: 14,
    fontWeight: '500'
  },
  failedCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    elevation: 4,
    padding: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    width: '100%'
  },
  failedIconCircle: {
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 48,
    height: 96,
    justifyContent: 'center',
    marginBottom: 20,
    width: 96
  },
  failedTitle: {
    color: '#ef4444',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16
  },
  failureReasonBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    width: '100%'
  },
  failureReasonDesc: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4
  },
  failureReasonLabel: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700'
  },
  idleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    elevation: 4,
    padding: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    width: '100%'
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12
  },
  pendingBadge: {
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  pendingBadgeText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '700'
  },
  presetBtn: {
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    justifyContent: 'center',
    paddingVertical: 16,
    position: 'relative',
    width: '48%'
  },
  presetBtnActive: {
    backgroundColor: '#e0e7ff',
    borderColor: '#6366f1',
    borderWidth: 2
  },
  presetBtnText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600'
  },
  presetBtnTextActive: {
    color: '#6366f1',
    fontWeight: '700'
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 24
  },
  retryBtn: {
    alignItems: 'center',
    backgroundColor: '#475569',
    borderRadius: 16,
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 14,
    width: '100%'
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  safeArea: {
    backgroundColor: '#f8fafc',
    flex: 1
  },
  scrollContent: {
    padding: 24
  },
  startBtn: {
    alignItems: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  },
  startIcon: {
    marginRight: 8
  },
  statChip: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4
  },
  statVal: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700'
  },
  statsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8
  },
  studentName: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800'
  },
  studentSub: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2
  },
  successCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    elevation: 4,
    padding: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    width: '100%'
  },
  successIconCircle: {
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 48,
    height: 96,
    justifyContent: 'center',
    marginBottom: 20,
    width: 96
  },
  successMessage: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center'
  },
  successTitle: {
    color: '#10b981',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8
  }
});
export default FocusScreen;
