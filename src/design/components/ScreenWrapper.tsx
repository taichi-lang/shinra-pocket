/**
 * Shinra Pocket - Screen Wrapper
 * Base screen layout with gradient background and safe area insets.
 */

import React from 'react';
import { StyleSheet, ViewStyle, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../theme';

interface ScreenWrapperProps {
  children: React.ReactNode;
  /** Override gradient start color */
  gradientStart?: string;
  /** Override gradient end color */
  gradientEnd?: string;
  /** Center content vertically */
  centered?: boolean;
  /** Extra padding around content */
  padding?: number;
  /** Additional style */
  style?: ViewStyle;
}

export default function ScreenWrapper({
  children,
  gradientStart = COLORS.bgGradientStart,
  gradientEnd = COLORS.bgGradientEnd,
  centered = false,
  padding = SIZES.md,
  style,
}: ScreenWrapperProps) {
  return (
    <LinearGradient
      colors={[gradientStart, COLORS.bg, gradientEnd]}
      locations={[0, 0.45, 1]}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={styles.gradient}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView
        style={[
          styles.safe,
          centered && styles.centered,
          { paddingHorizontal: padding },
          style,
        ]}
      >
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  safe: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
