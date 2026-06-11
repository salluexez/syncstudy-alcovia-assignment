import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useSync } from '../hooks/useSync';
import { MetadataRepository, METADATA_KEYS } from '../storage/repositories/metadataRepository';
import { LocalOperationRepository } from '../storage/repositories/operationRepository';
import { LocalStudentRepository } from '../storage/repositories/studentRepository';
import type { PendingOperation, Student } from '../types/domain';

type DevPanelScreenProps = {
  readonly database: SQLiteDatabase;
  readonly studentId: string;
  readonly deviceId: string;
  readonly deviceLabel: string;
};

export const DevPanelScreen: React.FC<DevPanelScreenProps> = ({
  database,
  studentId,
  deviceId,
  deviceLabel
}) => {
  const {
    isSyncing,
    lastSyncTime,
    syncError,
    pendingCount,
    networkMode,
    triggerSync,
    toggleNetworkMode,
    checkPendingCount
  } = useSync(database);

  const [metadataRows, setMetadataRows] = useState<Record<string, string>>({});
  const [allOperations, setAllOperations] = useState<PendingOperation[]>([]);
  const [studentStats, setStudentStats] = useState<Student | null>(null);

  const loadMetadata = async () => {
    try {
      const repo = new MetadataRepository(database);
      const keys = Object.values(METADATA_KEYS);
      const values: Record<string, string> = {};
      for (const key of keys) {
        const val = await repo.get(key);
        values[key] = val ?? 'N/A';
      }
      setMetadataRows(values);
    } catch (err) {
      console.error('Failed to load metadata rows:', err);
    }
  };

  const loadOperations = async () => {
    try {
      const repo = new LocalOperationRepository(database);
      const list = await repo.listAll();
      setAllOperations(list);
    } catch (err) {
      console.error('Failed to load all operations:', err);
    }
  };

  const loadStudentStats = async () => {
    try {
      const repo = new LocalStudentRepository(database);
      const stats = await repo.findById(studentId);
      if (stats) {
        setStudentStats(stats);
      }
    } catch (err) {
      console.error('Failed to load student stats in dev panel:', err);
    }
  };

  // Reload statistics on trigger or sync
  useEffect(() => {
    loadMetadata();
    loadOperations();
    loadStudentStats();
  }, [database, isSyncing]);

  const handleResetDatabase = () => {
    Alert.alert(
      'Reset Local Database',
      'This will delete all local SQLite data and restart the local storage context. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete tables contents
              await database.withExclusiveTransactionAsync(async (transaction) => {
                await transaction.runAsync('delete from local_students');
                await transaction.runAsync('delete from local_subjects');
                await transaction.runAsync('delete from local_chapters');
                await transaction.runAsync('delete from local_tasks');
                await transaction.runAsync('delete from local_focus_sessions');
                await transaction.runAsync('delete from pending_operations');
                await transaction.runAsync('delete from local_focus_effects');
                await transaction.runAsync('delete from local_metadata');
              });
              Alert.alert('Database Reset', 'Please close and reopen the app to reinitialize storage.');
            } catch (err) {
              console.error('Failed to reset local DB:', err);
            }
          }
        }
      ]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return <View style={[styles.badge, styles.badgeSynced]}><Text style={styles.badgeTextSynced}>SYNCED</Text></View>;
      case 'syncing':
        return <View style={[styles.badge, styles.badgeSyncing]}><Text style={styles.badgeTextSyncing}>SYNCING</Text></View>;
      case 'failed':
        return <View style={[styles.badge, styles.badgeFailed]}><Text style={styles.badgeTextFailed}>FAILED</Text></View>;
      default:
        return <View style={[styles.badge, styles.badgePending]}><Text style={styles.badgeTextPending}>PENDING</Text></View>;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Device Sync Controls */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Device Sync Manager</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Device Label:</Text>
            <Text style={styles.infoVal}>{deviceLabel}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Device ID:</Text>
            <Text style={styles.infoValSmall}>{deviceId}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Network State:</Text>
            <View style={styles.networkStatusWrapper}>
              <View style={[styles.statusIndicator, { backgroundColor: networkMode === 'online' ? '#10b981' : '#ef4444' }]} />
              <Text style={[styles.networkStatusText, { color: networkMode === 'online' ? '#10b981' : '#ef4444' }]}>
                {networkMode.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: networkMode === 'online' ? '#ef4444' : '#10b981' }]}
              onPress={toggleNetworkMode}
            >
              <Feather name={networkMode === 'online' ? 'wifi-off' : 'wifi'} size={14} color="#ffffff" style={styles.btnIcon} />
              <Text style={styles.btnText}>
                Go {networkMode === 'online' ? 'Offline' : 'Online'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.syncBtn]}
              onPress={triggerSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Feather name="refresh-cw" size={14} color="#ffffff" style={styles.btnIcon} />
                  <Text style={styles.btnText}>Trigger Sync</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {lastSyncTime && (
            <Text style={styles.logText}>Last Sync: {lastSyncTime}</Text>
          )}
          {syncError && (
            <View style={styles.errorBox}>
              <Feather name="alert-triangle" size={14} color="#ef4444" style={styles.errorBoxIcon} />
              <Text style={styles.errorBoxText}>{syncError}</Text>
            </View>
          )}
        </View>

        {/* Database Metadata */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Local Metadata (SQLite)</Text>
          {Object.entries(metadataRows).map(([key, val]) => (
            <View key={key} style={styles.metaRow}>
              <Text style={styles.metaKey}>{key}</Text>
              <Text style={styles.metaVal}>{val}</Text>
            </View>
          ))}
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Student Coins</Text>
            <Text style={styles.metaVal}>{studentStats?.coins ?? 0}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Student Streak</Text>
            <Text style={styles.metaVal}>{studentStats?.currentStreak ?? 0} days</Text>
          </View>
        </View>

        {/* Pending Operations Queue */}
        <View style={styles.card}>
          <View style={styles.opHeaderRow}>
            <Text style={styles.cardTitle}>Operations Queue</Text>
            <View style={styles.pendingOpsCountBadge}>
              <Text style={styles.pendingOpsCountText}>{pendingCount} Pending</Text>
            </View>
          </View>
          
          {allOperations.length === 0 ? (
            <Text style={styles.emptyText}>No operations logged in queue.</Text>
          ) : (
            <ScrollView horizontal style={styles.horizontalScroll}>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { width: 140 }]}>Operation Type</Text>
                  <Text style={[styles.th, { width: 80 }]}>Lamport</Text>
                  <Text style={[styles.th, { width: 90 }]}>Status</Text>
                  <Text style={[styles.th, { width: 180 }]}>Entity ID</Text>
                </View>
                {allOperations.slice().reverse().map((op) => (
                  <View key={op.id} style={styles.tableRow}>
                    <Text style={[styles.td, styles.tdOpType, { width: 140 }]}>
                      {op.operationType}
                    </Text>
                    <Text style={[styles.td, { width: 80 }]}>{op.lamport}</Text>
                    <View style={[{ width: 90 }, styles.tdBadge]}>
                      {getStatusBadge(op.syncStatus)}
                    </View>
                    <Text style={[styles.td, styles.tdId, { width: 180 }]}>{op.entityId}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Reset Database Options */}
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={handleResetDatabase}
          activeOpacity={0.8}
        >
          <Feather name="trash-2" size={14} color="#ef4444" style={styles.btnIcon} />
          <Text style={styles.resetBtnText}>Reset Local Database / Clear Seed</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  badgeFailed: {
    backgroundColor: '#fee2e2'
  },
  badgePending: {
    backgroundColor: '#fef3c7'
  },
  badgeSynced: {
    backgroundColor: '#d1fae5'
  },
  badgeSyncing: {
    backgroundColor: '#e0e7ff'
  },
  badgeTextFailed: {
    color: '#b91c1c',
    fontSize: 9,
    fontWeight: '700'
  },
  badgeTextPending: {
    color: '#92400e',
    fontSize: 9,
    fontWeight: '700'
  },
  badgeTextSynced: {
    color: '#065f46',
    fontSize: 9,
    fontWeight: '700'
  },
  badgeTextSyncing: {
    color: '#4338ca',
    fontSize: 9,
    fontWeight: '700'
  },
  btn: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12
  },
  btnIcon: {
    marginRight: 6
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16
  },
  btnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    elevation: 3,
    marginBottom: 20,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10
  },
  cardTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    fontStyle: 'italic'
  },
  errorBox: {
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 12,
    padding: 12
  },
  errorBoxIcon: {
    marginRight: 6
  },
  errorBoxText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '500'
  },
  horizontalScroll: {
    marginTop: 8
  },
  infoLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600'
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6
  },
  infoVal: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700'
  },
  infoValSmall: {
    color: '#64748b',
    fontSize: 11,
    fontVariant: ['tabular-nums']
  },
  logText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center'
  },
  metaKey: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600'
  },
  metaRow: {
    alignItems: 'center',
    borderBottomColor: '#f1f5f9',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8
  },
  metaVal: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700'
  },
  networkStatusText: {
    fontSize: 12,
    fontWeight: '800'
  },
  networkStatusWrapper: {
    alignItems: 'center',
    flexDirection: 'row'
  },
  opHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  pendingOpsCountBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  pendingOpsCountText: {
    color: '#d97706',
    fontSize: 11,
    fontWeight: '700'
  },
  resetBtn: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#fee2e2',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
    paddingVertical: 14
  },
  resetBtnText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700'
  },
  safeArea: {
    backgroundColor: '#f8fafc',
    flex: 1
  },
  scrollContent: {
    padding: 24
  },
  statusIndicator: {
    borderRadius: 4,
    height: 8,
    marginRight: 6,
    width: 8
  },
  syncBtn: {
    backgroundColor: '#6366f1'
  },
  table: {
    borderColor: '#cbd5e1',
    borderWidth: 1,
    flexDirection: 'column'
  },
  tableHeader: {
    backgroundColor: '#f1f5f9',
    flexDirection: 'row'
  },
  tableRow: {
    backgroundColor: '#ffffff',
    borderTopColor: '#cbd5e1',
    borderTopWidth: 1,
    flexDirection: 'row'
  },
  td: {
    color: '#475569',
    fontSize: 12,
    padding: 10
  },
  tdBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6
  },
  tdId: {
    color: '#94a3b8',
    fontSize: 10
  },
  tdOpType: {
    color: '#334155',
    fontWeight: '700'
  },
  th: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
    padding: 10
  }
});

export default DevPanelScreen;
