import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, GameId } from '../../App';
import { COLORS, FONTS } from '../utils/theme';
import { getTotalTickets, isGame6Unlocked } from '../monetize/ticketStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { t } from '../i18n';
import { CoinType } from '../game/types';

const COIN_OPTIONS: CoinType[] = ['fire', 'water', 'swirl'];

type Props = NativeStackScreenProps<RootStackParamList, 'GameSelect'>;

interface GameItem {
  id: GameId;
  title: string;
  subtitle: string;
  emoji: string;
  /** Not available in online mode (game3 = 3-player, game6 = single-player puzzle) */
  onlineDisabled?: boolean;
  /** Not available in local mode (game6 = single-player puzzle) */
  localDisabled?: boolean;
}

const GAMES: GameItem[] = [
  {
    id: 'game1',
    title: t('game.game1.title'),
    subtitle: t('game.game1.subtitle'),
    emoji: '🪙',
  },
  {
    id: 'game2',
    title: t('game.game2.title'),
    subtitle: t('game.game2.subtitle'),
    emoji: '⚔️',
  },
  {
    id: 'game3',
    title: t('game.game3.title'),
    subtitle: t('game.game3.subtitle'),
    emoji: '🔱',
    onlineDisabled: true,
  },
  {
    id: 'game4',
    title: t('game.game4.title'),
    subtitle: t('game.game4.subtitle'),
    emoji: '🫳',
  },
  {
    id: 'game5',
    title: t('game.game5.title'),
    subtitle: t('game.game5.subtitle'),
    emoji: '☀️',
  },
  {
    id: 'game6',
    title: t('game.game6.title'),
    subtitle: t('game.game6.subtitle'),
    emoji: '🧩',
    onlineDisabled: true,
    localDisabled: true,
  },
];

export default function GameSelectScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { mode } = route.params;
  const [tickets, setTickets] = useState(getTotalTickets());

  useFocusEffect(
    useCallback(() => {
      setTickets(getTotalTickets());
    }, [])
  );
  const ticketLabel = tickets === Infinity ? '∞' : `${tickets}${t('menu.tickets') || '枚'}`;

  const handleGamePress = (game: GameItem) => {
    // In online mode, game3 (3-player) and game6 (single-player) are unavailable
    if (mode === 'online' && game.onlineDisabled) {
      Alert.alert(
        t('gameSelect.onlineUnavailable'),
        t('gameSelect.onlineUnavailableMessage'),
        [{ text: t('common.ok'), style: 'cancel' }],
      );
      return;
    }

    // In local mode, game6 (single-player) is unavailable
    if (mode === 'local' && game.localDisabled) {
      Alert.alert(
        t('gameSelect.localUnavailable'),
        t('gameSelect.localUnavailableMessage'),
        [{ text: t('common.ok'), style: 'cancel' }],
      );
      return;
    }

    // Game6 is subscriber-only
    if (game.id === 'game6' && !isGame6Unlocked()) {
      Alert.alert(
        t('gameSelect.premiumOnly'),
        t('gameSelect.premiumOnlyMessage'),
        [{ text: t('common.close'), style: 'cancel' }],
      );
      return;
    }

    // Game5 & Game6 go directly to the game screen (no coin select needed)
    if (game.id === 'game5' || game.id === 'game6') {
      navigation.navigate('Game', {
        coin: 'fire',
        difficulty: 'normal',
        gameId: game.id,
        mode,
      });
      return;
    }

    // Online mode: skip coin selection, assign random coin, go directly to lobby
    if (mode === 'online') {
      const randomCoin = COIN_OPTIONS[Math.floor(Math.random() * COIN_OPTIONS.length)];
      navigation.navigate('OnlineLobby', { coin: randomCoin });
      return;
    }

    // Local mode: skip coin selection, assign random coins, go directly to game
    // 一騎打ち (game2) のローカルはCPUモードに変更
    if (mode === 'local') {
      if (game.id === 'game2') {
        // 一騎打ちはローカル非対応 → CPUモードでコイン選択へ
        navigation.navigate('CoinSelect', { mode: 'cpu', gameId: game.id });
        return;
      }
      // ランダムコイン割り当て（P1とP2は異なるコイン）
      const shuffled = [...COIN_OPTIONS].sort(() => Math.random() - 0.5);
      navigation.navigate('Game', {
        coin: shuffled[0],
        difficulty: 'normal',
        gameId: game.id,
        mode: 'local',
        coin2: shuffled[1],
      });
      return;
    }

    // CPU mode: go to CoinSelect
    navigation.navigate('CoinSelect', { mode, gameId: game.id });
  };

  return (
    <LinearGradient
      colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd, COLORS.bg]}
      style={styles.container}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { top: insets.top + 10 }]}
        >
          <Text style={styles.backText}>{t('gameSelect.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('gameSelect.title')}</Text>
        <Text style={styles.subtitle}>
          {mode === 'online' ? t('gameSelect.online') : mode === 'local' ? t('gameSelect.local') : t('gameSelect.cpu')}
        </Text>
        <Text style={styles.ticketBadge}>
          {'🎫'} {ticketLabel}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {GAMES.map((game) => {
            const locked = game.id === 'game6' && !isGame6Unlocked();
            const disabledOnline = mode === 'online' && game.onlineDisabled;
            const disabledLocal = mode === 'local' && game.localDisabled;

            return (
              <TouchableOpacity
                key={game.id}
                style={[
                  styles.gameCard,
                  locked && styles.gameCardLocked,
                  (disabledOnline || disabledLocal) && styles.gameCardDisabled,
                ]}
                onPress={() => handleGamePress(game)}
                activeOpacity={0.7}
              >
                <Text style={styles.gameEmoji}>{game.emoji}</Text>
                <Text style={styles.gameTitle}>{game.title}</Text>
                <Text style={styles.gameSubtitle}>
                  {locked
                    ? t('gameSelect.premiumOnly')
                    : disabledOnline
                      ? t('gameSelect.onlineUnavailable')
                      : disabledLocal
                        ? t('gameSelect.localUnavailable')
                        : game.subtitle}
                </Text>
                {locked && (
                  <View style={styles.lockOverlay}>
                    <Text style={styles.lockIcon}>{'🔒'}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 20,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    position: 'absolute',
    left: 20,
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
    marginTop: 6,
    ...FONTS.bold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  gameCard: {
    width: '47%',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 20,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  gameCardLocked: {
    opacity: 0.6,
  },
  gameCardDisabled: {
    opacity: 0.4,
  },
  gameEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  gameTitle: {
    fontSize: 15,
    color: COLORS.textPrimary,
    ...FONTS.bold,
    textAlign: 'center',
    marginBottom: 4,
  },
  gameSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    ...FONTS.regular,
    textAlign: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  lockIcon: {
    fontSize: 18,
  },
});
