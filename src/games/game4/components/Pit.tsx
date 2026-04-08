// ============================================================
// Game4: パタパタ — Pit Component
// ============================================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { COLORS, SIZES, FONTS } from '../../../utils/theme';

interface PitProps {
  /** Number of coins in this pit */
  coins: number;
  /** Whether this pit can be tapped */
  enabled: boolean;
  /** Called when pit is tapped */
  onPress?: () => void;
  /** Is this a goal pit (larger, on the side) */
  isGoal?: boolean;
  /** Label to show (e.g., "A1", "PIT") */
  label?: string;
  /** Whether this pit just received a coin (for animation) */
  highlight?: boolean;
}

export const Pit: React.FC<PitProps> = ({
  coins,
  enabled,
  onPress,
  isGoal = false,
  label,
  highlight = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (highlight) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [highlight, coins]);

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      enabled ? COLORS.cardBorderActive : COLORS.cardBorder,
      COLORS.gold,
    ],
  });

  const content = (
    <Animated.View
      style={[
        isGoal ? styles.goalPit : styles.pit,
        enabled && !isGoal && styles.pitEnabled,
        { transform: [{ scale: scaleAnim }], borderColor },
      ]}
    >
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <Text style={[styles.coinCount, isGoal && styles.coinCountGoal]}>
        {coins}
      </Text>
      {/* Coin dots visualization */}
      {!isGoal && coins > 0 && coins <= 8 && (
        <View style={styles.dotsContainer}>
          {Array.from({ length: Math.min(coins, 8) }).map((_, i) => (
            <View key={i} style={styles.dot} />
          ))}
        </View>
      )}
    </Animated.View>
  );

  if (enabled && onPress && !isGoal) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const PIT_SIZE = Math.min((SIZES.screenWidth - 140) / 3, 80);
const GOAL_WIDTH = 50;
const GOAL_HEIGHT = PIT_SIZE * 2.2;

const styles = StyleSheet.create({
  pit: {
    width: PIT_SIZE,
    height: PIT_SIZE,
    borderRadius: PIT_SIZE / 2,
    backgroundColor: COLORS.cardBg,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
  },
  pitEnabled: {
    borderColor: COLORS.cardBorderActive,
    backgroundColor: 'rgba(255,215,0,0.08)',
  },
  goalPit: {
    width: GOAL_WIDTH,
    height: GOAL_HEIGHT,
    borderRadius: GOAL_WIDTH / 2,
    backgroundColor: 'rgba(255,215,0,0.06)',
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...FONTS.regular,
    fontSize: 9,
    color: COLORS.textMuted,
    position: 'absolute',
    top: 4,
  },
  coinCount: {
    ...FONTS.heavy,
    fontSize: 22,
    color: COLORS.textPrimary,
  },
  coinCountGoal: {
    fontSize: 18,
    color: COLORS.gold,
  },
  dotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: PIT_SIZE - 16,
    position: 'absolute',
    bottom: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
    margin: 1,
    opacity: 0.7,
  },
});

export default Pit;
