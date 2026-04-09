import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { COLORS, FONTS, SIZES } from '../../utils/theme';
import type { CoinType, GameState, Difficulty } from '../../game/types';
import { COINS, CPU_COIN_MAP, createInitialGameState } from '../../game/types';
import {
  handlePlace,
  handleSelect,
  executeCpuPlace,
  executeCpuMove,
  checkGameOver,
  getValidMoves,
  canPlayerMove,
} from './game1Logic';
import { useGame1Timer, getTimeForRound } from './game1Timer';
import { DEFAULT_TIMER_CONFIG } from './game1Types';
import type { Game1Result } from './game1Types';

import Board from './components/Board';
import Timer from './components/Timer';
import PhaseIndicator from './components/PhaseIndicator';
import Coin from './components/Coin';

// Navigation types matching App.tsx RootStackParamList
type Game1Params = {
  Game: { coin: CoinType; difficulty: Difficulty; mode?: 'cpu' | 'local'; coin2?: CoinType };
  Result: { result: Game1Result; coin: CoinType; mode: 'cpu' | 'local' | 'online' };
};

interface Game1Props {
  mode?: 'cpu' | 'local';
  coin2?: CoinType;
}

const CPU_DELAY = 800;
const PASS_DEVICE_DELAY = 2000;

const Game1Screen: React.FC<Game1Props> = ({ mode: modeProp, coin2: coin2Prop }) => {
  const navigation = useNavigation<NativeStackNavigationProp<Game1Params>>();
  const route = useRoute<RouteProp<Game1Params, 'Game'>>();

  const gameMode = modeProp ?? 'cpu';
  const isLocal = gameMode === 'local';
  const playerCoin = route.params.coin;
  const cpuCoin = isLocal && coin2Prop ? coin2Prop : CPU_COIN_MAP[playerCoin];
  const difficulty: Difficulty = isLocal ? 'normal' : (route.params.difficulty ?? 'normal');

  const [showPassDevice, setShowPassDevice] = useState(false);

  const [gameState, setGameState] = useState<GameState>(createInitialGameState);
  const [result, setResult] = useState<Game1Result | null>(null);
  const cpuThinking = useRef(false);
  const gameOverNavigated = useRef(false);
  const resultRef = useRef<Game1Result | null>(null);

  const timer = useGame1Timer(DEFAULT_TIMER_CONFIG);

  // === 有効な移動先 ===
  const validTargets =
    gameState.selected !== null
      ? getValidMoves(gameState.board, gameState.selected)
      : [];

  // resultRef をリアルタイムに同期
  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  // === ゲーム終了時のナビゲーション ===
  useEffect(() => {
    if (result && !gameOverNavigated.current) {
      gameOverNavigated.current = true;
      timer.stopTimer();
      const timeout = setTimeout(() => {
        navigation.replace('Result', {
          result,
          coin: playerCoin,
          mode: gameMode,
        });
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [result, navigation, playerCoin, timer]);

  // === ゲーム状態変化の監視 ===
  useEffect(() => {
    if (!gameState.active && result === null) {
      const outcome = checkGameOver(gameState);
      if (outcome) {
        setResult(outcome);
      }
    }
  }, [gameState, result]);

  // === 移動フェーズ: プレイヤーターンのタイマー開始 ===
  useEffect(() => {
    if (isLocal) {
      // In local mode, both turns get the timer during move phase
      if (
        gameState.active &&
        gameState.phase === 'move' &&
        !showPassDevice
      ) {
        timer.startTimer(gameState.moveRound, () => {
          resultRef.current = 'timeout';
          setResult('timeout');
          setGameState((prev) => ({ ...prev, active: false }));
        });
      }
      if (!gameState.active || showPassDevice) {
        timer.stopTimer();
      }
    } else {
      if (
        gameState.active &&
        gameState.phase === 'move' &&
        gameState.turn === 'player' &&
        !cpuThinking.current
      ) {
        timer.startTimer(gameState.moveRound, () => {
          resultRef.current = 'timeout';
          setResult('timeout');
          setGameState((prev) => ({ ...prev, active: false }));
        });
      }
      if (gameState.turn === 'cpu' || !gameState.active) {
        timer.stopTimer();
      }
    }
  }, [gameState.phase, gameState.turn, gameState.active, gameState.moveRound, isLocal, showPassDevice]);

  // === ローカル対戦: ターン切り替え時に「端末を渡してください」表示 ===
  const prevTurnRef = useRef(gameState.turn);
  useEffect(() => {
    if (isLocal && gameState.active && !result) {
      if (prevTurnRef.current !== gameState.turn) {
        setShowPassDevice(true);
        const timeout = setTimeout(() => {
          setShowPassDevice(false);
        }, PASS_DEVICE_DELAY);
        prevTurnRef.current = gameState.turn;
        return () => clearTimeout(timeout);
      }
    }
    prevTurnRef.current = gameState.turn;
  }, [gameState.turn, gameState.active, isLocal, result]);

  // === CPUターンの実行 (CPU mode only) ===
  useEffect(() => {
    // In local mode, CPU turn is handled by human input
    if (isLocal) return;

    if (
      !gameState.active ||
      gameState.turn !== 'cpu' ||
      cpuThinking.current
    ) {
      return;
    }

    cpuThinking.current = true;
    const timeout = setTimeout(() => {
      setGameState((prev) => {
        if (!prev.active || prev.turn !== 'cpu') return prev;
        if (prev.phase === 'place') {
          return executeCpuPlace(prev, difficulty);
        } else {
          return executeCpuMove(prev, difficulty);
        }
      });
      cpuThinking.current = false;
    }, CPU_DELAY);

    return () => {
      clearTimeout(timeout);
      cpuThinking.current = false;
    };
  }, [gameState.turn, gameState.active, gameState.phase, difficulty, isLocal]);

  // === セル押下ハンドラ ===
  // Guard logic is inside the state updater to always check the latest state,
  // preventing stale closures from blocking rapid taps.
  const handleCellPress = useCallback(
    (index: number) => {
      if (resultRef.current) return;
      if (showPassDevice) return;

      setGameState((prev) => {
        // In local mode, both 'player' and 'cpu' turns accept human input
        if (!prev.active) return prev;
        if (!isLocal && prev.turn !== 'player') return prev;
        if (prev.phase === 'place') {
          return handlePlace(prev, index, isLocal);
        } else {
          return handleSelect(prev, index, isLocal);
        }
      });
    },
    [isLocal, showPassDevice],
  );

  // === 結果テキスト ===
  const getResultText = (): string | null => {
    if (!result) return null;
    if (isLocal) {
      switch (result) {
        case 'player':
          return 'P1の勝ち!';
        case 'cpu':
          return 'P2の勝ち!';
        case 'draw':
          return '引き分け';
        case 'timeout':
          return '時間切れ...';
      }
    }
    switch (result) {
      case 'player':
        return '勝利！';
      case 'cpu':
        return '敗北...';
      case 'draw':
        return '引き分け';
      case 'timeout':
        return '時間切れ...';
    }
  };

  const resultText = getResultText();
  const resultColor =
    result === 'player'
      ? COLORS.gold
      : result === 'cpu' || result === 'timeout'
      ? COLORS.red
      : COLORS.blue;

  return (
    <LinearGradient
      colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safe}>
        {/* 戻るボタン + ヘッダー: コイン情報 */}
        <View style={styles.backRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>{'< 戻る'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.header}>
          <View style={styles.coinInfo}>
            <Coin type={playerCoin} size={SIZES.coinSizeSmall} />
            <Text style={[styles.coinLabel, isLocal && gameState.turn === 'player' && styles.activeTurnLabel]}>
              {isLocal ? 'P1' : 'あなた'}
            </Text>
          </View>
          <Text style={styles.vs}>VS</Text>
          <View style={styles.coinInfo}>
            <Coin type={cpuCoin} size={SIZES.coinSizeSmall} />
            <Text style={[styles.coinLabel, isLocal && gameState.turn === 'cpu' && styles.activeTurnLabel]}>
              {isLocal ? 'P2' : 'CPU'}
            </Text>
          </View>
        </View>

        {/* フェーズ表示 */}
        <PhaseIndicator
          phase={gameState.phase}
          playerPlaced={gameState.playerPlaced}
          cpuPlaced={gameState.cpuPlaced}
          moveRound={gameState.moveRound}
        />

        {/* タイマー / ターン表示 */}
        <Timer
          timeLeft={timer.timeLeft}
          isRunning={timer.isRunning}
          isPlayerTurn={isLocal ? true : gameState.turn === 'player'}
        />

        {/* ボード */}
        <Board
          board={gameState.board}
          playerCoin={playerCoin}
          cpuCoin={cpuCoin}
          selectedCell={gameState.selected}
          validTargets={validTargets}
          winLine={gameState.winLine}
          onCellPress={handleCellPress}
        />

        {/* ヒントテキスト */}
        {gameState.active && !result && !showPassDevice && (
          <View style={styles.hintContainer}>
            <Text style={[styles.hint, isLocal && { color: gameState.turn === 'player' ? '#FFD700' : '#44ddff' }]}>
              {isLocal
                ? `${gameState.turn === 'player' ? 'P1' : 'P2'}の番 - ${
                    gameState.phase === 'place'
                      ? '空いているマスをタップしてコインを配置'
                      : gameState.selected !== null
                      ? '光っているマスへ移動'
                      : '自分のコインをタップして選択'
                  }`
                : gameState.turn === 'cpu'
                  ? 'CPU思考中...'
                  : gameState.phase === 'place'
                  ? '空いているマスをタップしてコインを配置'
                  : gameState.selected !== null
                  ? '光っているマスへ移動'
                  : '自分のコインをタップして選択'}
            </Text>
          </View>
        )}

        {/* 端末を渡してくださいオーバーレイ (ローカル対戦) */}
        {showPassDevice && (
          <View style={styles.passDeviceOverlay}>
            <Text style={styles.passDeviceText}>
              {gameState.turn === 'player' ? 'P1' : 'P2'}の番です
            </Text>
            <Text style={styles.passDeviceSubText}>
              端末を渡してください
            </Text>
          </View>
        )}

        {/* 結果オーバーレイ */}
        {resultText && (
          <View style={styles.resultOverlay}>
            <Text style={[styles.resultText, { color: resultColor }]}>
              {resultText}
            </Text>
          </View>
        )}

        {/* 難易度表示 / モード表示 */}
        <View style={styles.footer}>
          <Text style={styles.difficultyText}>
            {isLocal ? 'ローカル対戦' : difficulty === 'hard' ? '🔥 つよい' : '⭐ ふつう'}
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 16,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  backBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    ...FONTS.regular,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    gap: 24,
  },
  coinInfo: {
    alignItems: 'center',
    gap: 4,
  },
  coinLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    ...FONTS.bold,
  },
  vs: {
    color: COLORS.textMuted,
    fontSize: 18,
    ...FONTS.heavy,
  },
  hintContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  hint: {
    color: COLORS.textSecondary,
    fontSize: 13,
    ...FONTS.regular,
    textAlign: 'center',
  },
  activeTurnLabel: {
    color: COLORS.gold,
    fontSize: 14,
  },
  passDeviceOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 10,
  },
  passDeviceText: {
    fontSize: 36,
    color: COLORS.gold,
    ...FONTS.heavy,
    marginBottom: 12,
  },
  passDeviceSubText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    ...FONTS.regular,
  },
  resultOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  resultText: {
    fontSize: 48,
    ...FONTS.heavy,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 'auto',
    marginBottom: 16,
  },
  difficultyText: {
    color: COLORS.textMuted,
    fontSize: 12,
    ...FONTS.regular,
  },
});

export default Game1Screen;
