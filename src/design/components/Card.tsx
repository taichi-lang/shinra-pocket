/**
 * Shinra Pocket - Glass Card
 * Frosted glass morphism card with subtle border glow.
 */

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS } from '../theme';

interface CardProps {
  children: React.ReactNode;
  active?: boolean;
  glow?: boolean;
  padding?: number;
  style?: ViewStyle;
}

export default function Card({
  children,
  active = false,
  glow = false,
  padding = SIZES.md,
  style,
}: CardProps) {
  return (
    <View
      style={[
        styles.outer,
        glow && SHADOWS.gold,
        style,
      ]}
    >
      {/* Border gradient layer */}
      <LinearGradient
        colors={
          active
            ? ['rgba(255,215,0,0.35)', 'rgba(255,215,0,0.08)']
            : ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.03)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.borderGradient}
      >
        {/* Inner glass surface */}
        <View
          style={[
            styles.inner,
            { padding },
            active && styles.innerActive,
          ]}
        >
          {children}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: SIZES.radiusLg,
    overflow: 'hidden',
  },
  borderGradient: {
    borderRadius: SIZES.radiusLg,
    padding: 1, // border width via padding
  },
  inner: {
    backgroundColor: COLORS.glassBg,
    borderRadius: SIZES.radiusLg - 1,
    overflow: 'hidden',
  },
  innerActive: {
    backgroundColor: 'rgba(255,215,0,0.04)',
  },
});
