// === Online Lobby Screen ===

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameSocket } from './useGameSocket';
import { getOrCreateToken } from './authService';
import { CoinType, COINS } from '../game/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  needsTicket,
  canPlay,
  consumeTicket,
  getTotalTickets,
} from '../monetize/ticketStore';
import type { GameId, Difficulty, GameMode } from '../monetize/ticketTypes';

// Param list mirrors RootStackParamList from App.tsx
type ParamList = {
  OnlineLobby: { coin: CoinType };
  OnlineGame: { coin: CoinType; roomId: string; playerId: string };
  Menu: undefined;
};

type Props = NativeStackScreenProps<ParamList, 'OnlineLobby'>;

export default function OnlineLobbyScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { coin } = route.params;
  const coinInfo = COINS[coin];

  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [ticketConsumed, setTicketConsumed] = useState(false);

  const {
    connectionState,
    connect,
    disconnect,
    queueStatus,
    matchFound,
    joinQueue,
    leaveQueue,
    error,
    clearError,
  } = useGameSocket({ autoConnect: false }); // connect manually after auth

  // --- Ticket gate: consume ticket before connecting ---
  useEffect(() => {
    const gid = 'game1' as GameId; // online battles are generic
    const diff = 'normal' as Difficulty;
    const gmode = 'online' as GameMode;
    const required = needsTicket(gid, diff, gmode);

    if (!required) {
      setTicketConsumed(true);
      return;
    }

    if (!canPlay(gid, diff, gmode)) {
      Alert.alert(
        'チケット不足',
        'チケットが足りません。ショップで広告を見てチケットを獲得できます。',
        [
          { text: 'ショップへ', onPress: () => navigation.goBack() },
          { text: '閉じる', onPress: () => navigation.goBack() },
        ],
      );
      return;
    }

    Alert.alert(
      'チケット消費',
      'チケットを1枚消費します。よろしいですか？',
      [
        {
          text: 'いいえ',
          style: 'cancel',
          onPress: () => navigation.goBack(),
        },
        {
          text: 'はい',
          onPress: async () => {
            const ok = await consumeTicket();
            if (ok) {
              setTicketConsumed(true);
            } else {
              navigation.goBack();
            }
          },
        },
      ],
    );
  }, [navigation]);

  // --- Authenticate then connect (only after ticket consumed) ---
  useEffect(() => {
    if (!ticketConsumed) return;
    let cancelled = false;
    (async () => {
      try {
        await getOrCreateToken();
        if (!cancelled) {
          setAuthReady(true);
          connect();
        }
      } catch (err) {
        if (!cancelled) {
          setAuthError(err instanceof Error ? err.message : 'Authentication failed');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [ticketConsumed, connect]);

  const [dots, setDots] = useState('');
  const [elapsedSec, setElapsedSec] = useState(0);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const joinedQueue = useRef(false);

  // --- Dot animation ---
  useEffect(() => {
    const iv = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(iv);
  }, []);

  // --- Elapsed timer ---
  useEffect(() => {
    const iv = setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // --- Spin animation ---
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spinAnim]);

  // --- Pulse animation ---
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // --- Join queue once connected ---
  useEffect(() => {
    if (connectionState === 'connected' && !joinedQueue.current) {
      joinedQueue.current = true;
      joinQueue(coin);
    }
  }, [connectionState, coin, joinQueue]);

  // --- Navigate on match found ---
  useEffect(() => {
    if (matchFound) {
      navigation.replace('OnlineGame', {
        coin,
        roomId: matchFound.roomId,
        playerId: matchFound.playerId,
      });
    }
  }, [matchFound, coin, navigation]);

  // --- Cancel ---
  const handleCancel = useCallback(() => {
    leaveQueue();
    disconnect();
    navigation.goBack();
  }, [leaveQueue, disconnect, navigation]);

  // --- Format time ---
  const formatTime = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Spin interpolation
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const queueCount = queueStatus?.playersInQueue ?? 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>ONLINE BATTLE</Text>
        <Text style={styles.subtitle}>
          {coinInfo.emoji} {coinInfo.label}
        </Text>
      </View>

      {/* Center: waiting animation */}
      <View style={styles.center}>
        {!authReady && !authError ? (
          <View style={styles.errorBox}>
            <ActivityIndicator size="large" color={COLORS.gold} />
            <Text style={[styles.statusText, { marginTop: 16 }]}>
              Authenticating{dots}
            </Text>
          </View>
        ) : authError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{authError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setAuthError(null);
                setAuthReady(false);
                (async () => {
                  try {
                    await getOrCreateToken();
                    setAuthReady(true);
                    connect();
                  } catch (err) {
                    setAuthError(
                      err instanceof Error ? err.message : 'Authentication failed'
                    );
                  }
                })();
              }}
            >
              <Text style={styles.retryButtonText}>RETRY</Text>
            </TouchableOpacity>
          </View>
        ) : connectionState === 'connecting' ? (
          <Text style={styles.statusText}>Connecting{dots}</Text>
        ) : connectionState === 'error' ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error ?? 'Connection error'}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                clearError();
                joinedQueue.current = false;
                connect();
              }}
            >
              <Text style={styles.retryButtonText}>RETRY</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Spinning coin */}
            <Animated.View
              style={[
                styles.spinnerContainer,
                { transform: [{ rotate: spin }, { scale: pulseAnim }] },
              ]}
            >
              <Text style={styles.coinEmoji}>{coinInfo.emoji}</Text>
            </Animated.View>

            <Text style={styles.searchingText}>
              Searching for opponent{dots}
            </Text>

            <Text style={styles.timerText}>{formatTime(elapsedSec)}</Text>

            {queueCount > 0 && (
              <Text style={styles.queueInfo}>
                Players in queue: {queueCount}
              </Text>
            )}
          </>
        )}
      </View>

      {/* Cancel button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>CANCEL</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.cardBg,
    borderWidth: 2,
    borderColor: COLORS.cardBorderActive,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  coinEmoji: {
    fontSize: 48,
  },
  searchingText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  queueInfo: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.blue,
  },
  errorBox: {
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.red,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.blue,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.blue,
  },
  footer: {
    alignItems: 'center',
  },
  cancelButton: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.red,
    backgroundColor: 'rgba(255,68,85,0.1)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.red,
    letterSpacing: 1,
  },
});
