import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { COLORS, FONTS } from '../utils/theme';
import { success as hapticSuccess, error as hapticError, warning as hapticWarning, lightTap } from '../utils/haptics';
import { COINS } from '../game/types';
import { logScreenView } from '../analytics/analyticsService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../i18n';
import { isSubscriptionActive } from '../monetize/iapService';
import { usePreloadSounds } from '../sound/useSoundEffect';
import { playSound } from '../sound/audioService';
import { SFX_MAP } from '../sound/soundMap';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

const RESULT_CONFIG = {
  player: { emoji: '🏆', title: '勝利！', subtitle: '見事な一手だった', color: COLORS.gold },
  cpu: { emoji: '😢', title: '敗北...', subtitle: '次こそリベンジ', color: COLORS.red },
  draw: { emoji: '🤝', title: '引き分け', subtitle: '実力は互角', color: COLORS.blue },
  timeout: { emoji: '⏰', title: '時間切れ', subtitle: '次はもっと早く', color: COLORS.orange },
};

export default function ResultScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { result, coin, mode, gameId = 'game1', difficulty = 'normal', coin2 } = route.params;
  const config = RESULT_CONFIG[result];
  const coinInfo = COINS[coin];
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Sound effects
  usePreloadSounds(['victory', 'defeat', 'reward']);

  useEffect(() => {
    logScreenView('Result');

    // Fire haptic + sound based on result
    if (result === 'player') { hapticSuccess(); playSound('victory', { volume: SFX_MAP.victory.volume }); }
    else if (result === 'cpu') { hapticError(); playSound('defeat', { volume: SFX_MAP.defeat.volume }); }
    else if (result === 'timeout') hapticWarning();

    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd, COLORS.bg]}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <View style={styles.resultArea}>
        <Animated.Text
          style={[
            styles.emoji,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {config.emoji}
        </Animated.Text>
        <Text style={[styles.title, { color: config.color }]}>
          {config.title}
        </Text>
        <Text style={styles.subtitle}>{config.subtitle}</Text>

        <View style={styles.coinBadge}>
          <Text style={styles.coinEmoji}>{coinInfo.emoji}</Text>
          <Text style={styles.coinLabel}>{coinInfo.label}</Text>
        </View>
      </View>

      <Animated.View style={[styles.buttons, { opacity: fadeAnim }]}>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => { lightTap(); navigation.navigate('CoinSelect', { mode, gameId }); }}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>コイン選択に戻る</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => { lightTap(); navigation.navigate('Menu'); }}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>メニューに戻る</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  resultArea: {
    alignItems: 'center',
    marginBottom: 48,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 40,
    letterSpacing: 4,
    ...FONTS.heavy,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8,
    ...FONTS.regular,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  coinEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  coinLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  buttons: {
    gap: 12,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 16,
  },
  primaryButtonText: {
    fontSize: 20,
    color: '#000',
    letterSpacing: 2,
    ...FONTS.heavy,
  },
  secondaryButton: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    ...FONTS.bold,
  },
});
