/**
 * Shinra Pocket - Coin View
 * Renders a coin with gradient background per type (fire/water/swirl).
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { CoinType, COINS } from '../../game/types';
import { COLORS, SIZES, SHADOWS } from '../theme';
import { SPRING_CONFIGS } from '../animations';

type CoinSize = 'sm' | 'md' | 'lg';

interface CoinViewProps {
  type: CoinType;
  size?: CoinSize;
  animated?: boolean;
  pulse?: boolean;
  style?: ViewStyle;
}

const SIZE_MAP: Record<CoinSize, number> = {
  sm: SIZES.coinSizeSmall,
  md: SIZES.coinSize,
  lg: SIZES.coinSizeLarge,
};

const EMOJI_SIZE_MAP: Record<CoinSize, number> = {
  sm: 16,
  md: 26,
  lg: 36,
};

export default function CoinView({
  type,
  size = 'md',
  animated = false,
  pulse: shouldPulse = false,
  style,
}: CoinViewProps) {
  const coin = COINS[type];
  const coinSize = SIZE_MAP[size];
  const emojiSize = EMOJI_SIZE_MAP[size];

  const scale = useSharedValue(animated ? 0 : 1);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (animated) {
      scale.value = 0;
      scale.value = withSpring(1, SPRING_CONFIGS.bouncy);
    }
  }, [animated, scale]);

  useEffect(() => {
    if (shouldPulse) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, {
            duration: 900,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(0.95, {
            duration: 900,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        true,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [shouldPulse, pulseScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulseScale.value }],
  }));

  const gradientColors = COLORS[type] as [string, string];

  return (
    <Animated.View
      style={[
        animatedStyle,
        SHADOWS.md,
        {
          width: coinSize,
          height: coinSize,
          borderRadius: coinSize / 2,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[gradientColors[0], gradientColors[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          {
            width: coinSize,
            height: coinSize,
            borderRadius: coinSize / 2,
          },
        ]}
      >
        {/* Inner highlight ring */}
        <Animated.View
          style={[
            styles.innerRing,
            {
              width: coinSize - 6,
              height: coinSize - 6,
              borderRadius: (coinSize - 6) / 2,
            },
          ]}
        >
          <Text
            style={[styles.emoji, { fontSize: emojiSize }]}
            allowFontScaling={false}
          >
            {coin.emoji}
          </Text>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  innerRing: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  emoji: {
    textAlign: 'center',
  },
});
