import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { COLORS, FONTS } from '../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();

    const timer = setTimeout(() => {
      navigation.replace('Menu');
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={[COLORS.splashBg, COLORS.bgGradientStart, COLORS.bg]}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text style={styles.logoEmoji}>🪙</Text>
        <Text style={styles.title}>SHINRA</Text>
        <Text style={styles.subtitle}>POCKET</Text>
      </Animated.View>

      <Animated.Text
        style={[
          styles.tagline,
          {
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.4, 1],
            }),
          },
        ]}
      >
        コインで決める、運命の一手
      </Animated.Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 48,
    color: COLORS.gold,
    letterSpacing: 12,
    ...FONTS.heavy,
  },
  subtitle: {
    fontSize: 24,
    color: COLORS.textSecondary,
    letterSpacing: 8,
    marginTop: 4,
    ...FONTS.bold,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.gold,
    marginTop: 48,
    letterSpacing: 2,
    ...FONTS.regular,
  },
});
