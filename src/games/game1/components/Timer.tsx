import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../../../utils/theme';

interface TimerProps {
  timeLeft: number;
  isRunning: boolean;
  isPlayerTurn: boolean;
}

const Timer: React.FC<TimerProps> = ({ timeLeft, isRunning, isPlayerTurn }) => {
  if (!isRunning && timeLeft <= 0) return null;

  const isUrgent = timeLeft <= 5;
  const textColor = isUrgent ? COLORS.red : isPlayerTurn ? COLORS.gold : COLORS.blue;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: COLORS.textSecondary }]}>
        {isPlayerTurn ? 'あなたのターン' : 'CPU思考中...'}
      </Text>
      {isPlayerTurn && isRunning && (
        <Text style={[styles.time, { color: textColor }]}>
          {timeLeft}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    ...FONTS.bold,
  },
  time: {
    fontSize: 36,
    ...FONTS.heavy,
    marginTop: 2,
  },
});

export default React.memo(Timer);
