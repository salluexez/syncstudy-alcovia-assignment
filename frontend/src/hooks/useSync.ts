import { useState, useEffect, useRef, useCallback } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import { SyncClient } from '../sync/syncClient';
import { LocalOperationRepository } from '../storage/repositories/operationRepository';
import { MetadataRepository, METADATA_KEYS } from '../storage/repositories/metadataRepository';
import type { NetworkMode } from '../types/domain';

export type UseSyncResult = {
  readonly isSyncing: boolean;
  readonly lastSyncTime: string | null;
  readonly syncError: string | null;
  readonly pendingCount: number;
  readonly networkMode: NetworkMode;
  readonly triggerSync: () => Promise<void>;
  readonly toggleNetworkMode: () => Promise<void>;
  readonly checkPendingCount: () => Promise<void>;
};

export function useSync(database: SQLiteDatabase): UseSyncResult {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [networkMode, setNetworkMode] = useState<NetworkMode>('online');

  const clientRef = useRef<SyncClient | null>(null);
  const opRepoRef = useRef<LocalOperationRepository | null>(null);
  const metadataRef = useRef<MetadataRepository | null>(null);

  if (!clientRef.current) {
    clientRef.current = new SyncClient(database);
  }
  if (!opRepoRef.current) {
    opRepoRef.current = new LocalOperationRepository(database);
  }
  if (!metadataRef.current) {
    metadataRef.current = new MetadataRepository(database);
  }

  const syncClient = clientRef.current;
  const opRepo = opRepoRef.current;
  const metadataRepo = metadataRef.current;

  // Check pending operations count in SQLite
  const checkPendingCount = useCallback(async () => {
    try {
      const pending = await opRepo.listPending();
      setPendingCount(pending.length);
    } catch (err) {
      console.error('Failed to count pending operations:', err);
    }
  }, [opRepo]);

  // Load network mode on mount
  const loadNetworkMode = useCallback(async () => {
    try {
      const mode = await metadataRepo.getNetworkMode();
      setNetworkMode(mode);
    } catch (err) {
      console.error('Failed to load network mode:', err);
    }
  }, [metadataRepo]);

  // Fetch metrics on mount & poll/refresh periodically
  useEffect(() => {
    checkPendingCount();
    loadNetworkMode();

    const interval = setInterval(() => {
      checkPendingCount();
    }, 3000);

    return () => clearInterval(interval);
  }, [checkPendingCount, loadNetworkMode]);

  // Execute sync push-pull cycle
  const triggerSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncError(null);

    try {
      await syncClient.sync();
      setLastSyncTime(new Date().toLocaleTimeString());
      setSyncError(null);
    } catch (err: any) {
      setSyncError(err instanceof Error ? err.message : 'Synchronization failed.');
    } finally {
      setIsSyncing(false);
      await checkPendingCount();
    }
  };

  // Toggle network online/offline state
  const toggleNetworkMode = async () => {
    const nextMode = networkMode === 'online' ? 'offline' : 'online';
    try {
      await metadataRepo.setNetworkMode(nextMode);
      setNetworkMode(nextMode);
    } catch (err) {
      console.error('Failed to change network mode:', err);
    }
  };

  return {
    checkPendingCount,
    isSyncing,
    lastSyncTime,
    networkMode,
    pendingCount,
    syncError,
    toggleNetworkMode,
    triggerSync
  };
}
