import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

type FocusTimerProps = {
  readonly timeLeftMs: number;
  readonly targetMinutes: number;
  readonly onGiveUp: () => void;
  readonly isExpired: boolean;
};

export const FocusTimer: React.FC<FocusTimerProps> = ({
  timeLeftMs,
  targetMinutes,
  onGiveUp,
  isExpired
}) => {
  const totalSeconds = targetMinutes * 60;
  const elapsedSeconds = Math.max(0, totalSeconds - Math.floor(timeLeftMs / 1000));
  const progress = totalSeconds > 0 ? elapsedSeconds / totalSeconds : 0;

  const minutes = Math.floor(timeLeftMs / 60_000);
  const seconds = Math.floor((timeLeftMs % 60_000) / 1000);

  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Feather name="clock" size={20} color="#6366f1" style={styles.icon} />
        <Text style={styles.sessionTitle}>Focusing Active</Text>
      </View>

      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{formattedTime}</Text>
        <Text style={styles.targetLabel}>Target: {targetMinutes} mins</Text>
      </View>

      {/* Modern progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.progressLabels}>
        <Text style={styles.progressPercent}>{Math.round(progress * 100)}% complete</Text>
        <Text style={styles.progressLabelDetail}>
          {Math.floor(elapsedSeconds / 60)}m elapsed / {targetMinutes}m
        </Text>
      </View>

      <View style={styles.animationIndicator}>
        <ActivityIndicator size="small" color="#6366f1" />
        <Text style={styles.breathingText}>Stay in the app to keep focusing...</Text>
      </View>

      <TouchableOpacity
        style={styles.giveUpButton}
        onPress={onGiveUp}
        activeOpacity={0.8}
        disabled={isExpired}
      >
        <Feather name="x-circle" size={18} color="#ffffff" style={styles.buttonIcon} />
        <Text style={styles.giveUpButtonText}>Give Up</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  animationIndicator: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    marginTop: 8
  },
  breathingText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8
  },
  buttonIcon: {
    marginRight: 6
  },
  card: {
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
  giveUpButton: {
    alignItems: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 14,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8
  },
  giveUpButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16
  },
  icon: {
    marginRight: 8
  },
  progressBar: {
    backgroundColor: '#6366f1',
    borderRadius: 6,
    height: '100%'
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  progressLabelDetail: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500'
  },
  progressPercent: {
    color: '#6366f1',
    fontSize: 12,
    fontWeight: '600'
  },
  progressTrack: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    height: 10,
    marginBottom: 8,
    overflow: 'hidden',
    width: '100%'
  },
  sessionTitle: {
    color: '#6366f1',
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  targetLabel: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 24
  },
  timerText: {
    color: '#0f172a',
    fontSize: 64,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: -1
  }
});
export default FocusTimer;
