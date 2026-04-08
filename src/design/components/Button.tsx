/**
 * Shinra Pocket - Game Button
 * Gradient background with press animation and haptic feedback.
 */

import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  Pressable,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, SIZES, FONTS, SHADOWS } from '../theme';
import { SPRING_CONFIGS } from '../animations';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const GRADIENT_MAP: Record<string, readonly [string, string]> = {
  primary: COLORS.buttonPrimary,
  secondary: COLORS.buttonSecondary,
  danger: COLORS.buttonDanger,
};

const HEIGHT_MAP: Record<ButtonSize, number> = {
  sm: SIZES.buttonHeightSm,
  md: SIZES.buttonHeight,
  lg: SIZES.buttonHeightLg,
};

const FONT_SIZE_MAP: Record<ButtonSize, number> = {
  sm: 13,
  md: 15,
  lg: 17,
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon,
  style,
  textStyle,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.93, SPRING_CONFIGS.press);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIGS.press);
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSequence(
      withSpring(0.93, SPRING_CONFIGS.press),
      withSpring(1, SPRING_CONFIGS.press),
    );
    onPress();
  }, [onPress, scale]);

  const height = HEIGHT_MAP[size];
  const fontSize = FONT_SIZE_MAP[size];
  const isGhost = variant === 'ghost';
  const textColor =
    variant === 'primary' ? COLORS.bg : COLORS.textPrimary;

  if (isGhost) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[
          animatedStyle,
          styles.base,
          styles.ghost,
          { height },
          disabled && styles.disabled,
          style,
        ]}
      >
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <Text
          style={[
            styles.text,
            { fontSize, color: COLORS.gold },
            textStyle,
          ]}
        >
          {title}
        </Text>
      </AnimatedPressable>
    );
  }

  const gradient = GRADIENT_MAP[variant] ?? COLORS.buttonPrimary;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        animatedStyle,
        disabled && styles.disabled,
        variant === 'primary' ? SHADOWS.gold : SHADOWS.md,
        style,
      ]}
    >
      <LinearGradient
        colors={disabled ? ['#333', '#222'] : [gradient[0], gradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.base, styles.gradient, { height }]}
      >
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <Text
          style={[
            styles.text,
            {
              fontSize,
              color: disabled ? COLORS.textMuted : textColor,
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.lg,
    gap: SIZES.sm,
  },
  gradient: {
    overflow: 'hidden',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  text: {
    ...FONTS.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  icon: {
    fontSize: 18,
  },
  disabled: {
    opacity: 0.45,
  },
});
