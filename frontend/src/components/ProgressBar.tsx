import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

type ProgressBarProps = {
  readonly progress: number; // between 0 and 1
  readonly height?: number;
  readonly showPercentage?: boolean;
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 8,
  showPercentage = false
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round(progress * 100)));

  return (
    <View style={styles.container}>
      <View style={[styles.track, { height }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${percentage}%`,
              backgroundColor: percentage === 100 ? '#10b981' : '#6366f1'
            }
          ]}
        />
      </View>
      {showPercentage && <Text style={styles.percentageText}>{percentage}%</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%'
  },
  fill: {
    borderRadius: 4,
    height: '100%'
  },
  percentageText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
    minWidth: 32,
    textAlign: 'right'
  },
  track: {
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    flex: 1,
    overflow: 'hidden'
  }
});

export default ProgressBar;
