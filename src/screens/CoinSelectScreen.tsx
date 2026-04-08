import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { COLORS, FONTS } from '../utils/theme';
import { lightTap, mediumTap, heavyTap } from '../utils/haptics';
import { CoinType, COINS } from '../game/types';
import {
  needsTicket,
  canPlay,
  consumeTicket,
  getTotalTickets,
} from '../monetize/ticketStore';
import type { GameId, Difficulty, GameMode } from '../monetize/ticketTypes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'CoinSelect'>;

const COIN_OPTIONS: CoinType[] = ['fire', 'water', 'swirl'];

export default function CoinSelectScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { mode, gameId = 'game1' } = route.params;
  const [selected, setSelected] = useState<CoinType | null>(null);
  const [selected2, setSelected2] = useState<CoinType | null>(null);
  const [difficulty, setDifficulty] = useState<'normal' | 'hard'>('normal');
  const isLocal = mode === 'local';

  const proceedToGame = () => {
    if (!selected) return;
    if (mode === 'online') {
      navigation.navigate('OnlineLobby', { coin: selected });
    } else if (mode === 'local') {
      if (!selected2) return;
      navigation.navigate('Game', { coin: selected, difficulty: 'normal', gameId, mode: 'local', coin2: selected2 });
    } else {
      navigation.navigate('Game', { coin: selected, difficulty, gameId });
    }
  };

  const handleConfirm = () => {
    if (!selected) return;
    if (isLocal && !selected2) return;
    if (isLocal && selected === selected2) {
      Alert.alert(t('coinSelect.selectDifferentCoins'));
      return;
    }
    heavyTap();

    // Local mode skips ticket check
    if (isLocal) {
      proceedToGame();
      return;
    }

    const gid = (gameId ?? 'game1') as GameId;
    const diff = difficulty as Difficulty;
    const gmode = mode as GameMode;
    const ticketRequired = needsTicket(gid, diff, gmode);

    if (!ticketRequired) {
      proceedToGame();
      return;
    }

    if (!canPlay(gid, diff, gmode)) {
      Alert.alert(
        'チケット不足',
        'チケットが足りません。ショップで広告を見てチケットを獲得できます。',
        [
          { text: 'ショップへ', onPress: () => navigation.goBack() },
          { text: '閉じる', style: 'cancel' },
        ],
      );
      return;
    }

    Alert.alert(
      'チケット消費',
      'チケットを1枚消費します。よろしいですか？',
      [
        { text: 'いいえ', style: 'cancel' },
        {
          text: 'はい',
          onPress: async () => {
            const ok = await consumeTicket();
            if (ok) {
              proceedToGame();
            }
          },
        },
      ],
    );
  };

  return (
    <LinearGradient
      colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd, COLORS.bg]}
      style={styles.container}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => { lightTap(); navigation.goBack(); }}
          style={[styles.backButton, { top: insets.top + 10 }]}
          accessibilityLabel="戻る"
          accessibilityRole="button"
        >
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>コインを選べ</Text>
        <Text style={styles.subtitle}>
          {mode === 'online' ? 'オンライン対戦' : mode === 'local' ? 'ローカル対戦' : 'CPU対戦'}
        </Text>
        <Text style={styles.ticketBadge}>
          {'\uD83C\uDFAB'} {getTotalTickets() === Infinity ? '\u221E' : `${getTotalTickets()}枚`}
        </Text>
      </View>

      {isLocal && (
        <Text style={styles.playerLabel}>{t('coinSelect.player1')}</Text>
      )}
      <View style={styles.coinList}>
        {COIN_OPTIONS.map((type) => {
          const coin = COINS[type];
          const isSelected = selected === type;

          return (
            <TouchableOpacity
              key={type}
              style={[styles.coinCard, isSelected && styles.coinCardSelected]}
              onPress={() => { lightTap(); setSelected(type); }}
              activeOpacity={0.7}
              accessibilityLabel={coin.label}
              accessibilityRole="button"
            >
              <LinearGradient
                colors={coin.colors}
                style={styles.coinCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.coinEmoji}>{coin.emoji}</Text>
              </LinearGradient>
              <Text style={styles.coinLabel}>{coin.label}</Text>
              <Text style={styles.coinDesc}>{coin.description}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLocal && (
        <>
          <Text style={[styles.playerLabel, { marginTop: 24 }]}>{t('coinSelect.player2')}</Text>
          <View style={styles.coinList}>
            {COIN_OPTIONS.map((type) => {
              const coin = COINS[type];
              const isP2Selected = selected2 === type;

              return (
                <TouchableOpacity
                  key={`p2-${type}`}
                  style={[styles.coinCard, isP2Selected && styles.coinCardSelected]}
                  onPress={() => { lightTap(); setSelected2(type); }}
                  activeOpacity={0.7}
                  accessibilityLabel={`${t('coinSelect.player2')} ${coin.label}`}
                  accessibilityRole="button"
                >
                  <LinearGradient
                    colors={coin.colors}
                    style={styles.coinCircle}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.coinEmoji}>{coin.emoji}</Text>
                  </LinearGradient>
                  <Text style={styles.coinLabel}>{coin.label}</Text>
                  <Text style={styles.coinDesc}>{coin.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {mode === 'cpu' && (
        <View style={styles.difficultyContainer}>
          <Text style={styles.difficultyLabel}>難易度</Text>
          <View style={styles.difficultyButtons}>
            <TouchableOpacity
              style={[
                styles.diffButton,
                difficulty === 'normal' && styles.diffButtonActive,
              ]}
              onPress={() => { lightTap(); setDifficulty('normal'); }}
              accessibilityLabel="難易度ふつう"
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.diffButtonText,
                  difficulty === 'normal' && styles.diffButtonTextActive,
                ]}
              >
                ふつう
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.diffButton,
                difficulty === 'hard' && styles.diffButtonActive,
              ]}
              onPress={() => { lightTap(); setDifficulty('hard'); }}
              accessibilityLabel="難易度つよい"
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.diffButtonText,
                  difficulty === 'hard' && styles.diffButtonTextActive,
                ]}
              >
                つよい
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.confirmButton, !(isLocal ? selected && selected2 : selected) && styles.confirmButtonDisabled]}
        onPress={handleConfirm}
        disabled={!(isLocal ? selected && selected2 : selected)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={(isLocal ? selected && selected2 : selected) ? [COLORS.gold, COLORS.orange] : ['#333', '#222']}
          style={styles.confirmGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text
            style={[
              styles.confirmText,
              !(isLocal ? selected && selected2 : selected) && styles.confirmTextDisabled,
            ]}
          >
            {mode === 'online' ? 'マッチング開始' : mode === 'local' ? 'ローカル対戦開始！' : 'バトル開始！'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    ...FONTS.regular,
  },
  title: {
    fontSize: 28,
    color: COLORS.gold,
    letterSpacing: 4,
    ...FONTS.heavy,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
    ...FONTS.regular,
  },
  ticketBadge: {
    fontSize: 14,
    color: COLORS.gold,
    marginTop: 8,
    ...FONTS.bold,
  },
  playerLabel: {
    fontSize: 16,
    color: COLORS.gold,
    ...FONTS.bold,
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  coinList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  coinCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    padding: 16,
    alignItems: 'center',
  },
  coinCardSelected: {
    borderColor: COLORS.cardBorderActive,
    backgroundColor: 'rgba(255,215,0,0.06)',
  },
  coinCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  coinEmoji: {
    fontSize: 28,
  },
  coinLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    ...FONTS.bold,
    textAlign: 'center',
  },
  coinDesc: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    ...FONTS.regular,
  },
  difficultyContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  difficultyLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
    ...FONTS.regular,
  },
  difficultyButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  diffButton: {
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.cardBg,
  },
  diffButtonActive: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(255,215,0,0.1)',
  },
  diffButtonText: {
    fontSize: 15,
    color: COLORS.textMuted,
    ...FONTS.bold,
  },
  diffButtonTextActive: {
    color: COLORS.gold,
  },
  confirmButton: {
    marginTop: 'auto',
    marginBottom: 40,
    borderRadius: 16,
    overflow: 'hidden',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 16,
  },
  confirmText: {
    fontSize: 20,
    color: '#000',
    letterSpacing: 2,
    ...FONTS.heavy,
  },
  confirmTextDisabled: {
    color: COLORS.textMuted,
  },
});
