// ============================================================
// Game4: パタパタ — Main Game Screen
// ============================================================

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { COLORS, SIZES, FONTS } from '../../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Game4State,
  Player,
  Difficulty,
  SowStep,
  createInitialState,
} from './game4Types';
import {
  sowSeeds,
  checkWinner,
  getValidPits,
  opponent,
  cloneBoard,
} from './game4Logic';
import { getAIMove } from './game4AI';
import { MancalaBoard } from './components/MancalaBoard';
import { isSubscriptionActive } from '../../monetize/iapService';

const CPU_DELAY = 100;
const SOW_STEP_DELAY = 500;

interface Game4ScreenProps {
  mode?: 'cpu' | 'local';
  difficulty?: Difficulty;
  humanSide?: Player;
  onExit?: () => void;
  onGameEnd?: (result: 'player' | 'cpu' | 'draw' | 'timeout') => void;
}

const Game4Screen: React.FC<Game4ScreenProps> = ({
  mode = 'cpu',
  difficulty = 'normal',
  humanSide = 'A',
  onExit,
  onGameEnd,
}) => {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<Game4State>(() =>
    createInitialState(mode, difficulty, humanSide),
  );
  const [highlightSlot, setHighlightSlot] = useState<string | null>(null);
  const [inputLocked, setInputLocked] = useState(false);
  const messageAnim = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Show message animation
  const showMessage = useCallback(
    (msg: string, duration = 1200) => {
      setState((s) => ({ ...s, message: msg }));
      Animated.sequence([
        Animated.timing(messageAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(duration),
        Animated.timing(messageAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isMounted.current) {
          setState((s) => ({ ...s, message: null }));
        }
      });
    },
    [messageAnim],
  );

  // Animate sowing steps one by one
  const animateSow = useCallback(
    (steps: SowStep[]): Promise<void> => {
      return new Promise((resolve) => {
        let i = 0;
        const next = () => {
          if (!isMounted.current || i >= steps.length) {
            setHighlightSlot(null);
            resolve();
            return;
          }
          const step = steps[i];
          setHighlightSlot(step.target);
          setState((s) => ({ ...s, board: step.boardAfter }));
          i++;
          setTimeout(next, SOW_STEP_DELAY);
        };
        next();
      });
    },
    [],
  );

  // Ref to hold latest triggerAI to break circular dependency
  const triggerAIRef = useRef<(board: typeof state.board, player: Player) => void>(() => {});

  // Execute move with a specific board (for AI chaining and human moves)
  const executeMoveFromBoard = useCallback(
    async (board: typeof state.board, player: Player, pitIndex: number) => {
      setInputLocked(true);
      setState((s) => ({ ...s, phase: 'sowing' }));

      const result = sowSeeds(board, player, pitIndex);

      if (result.steps.length > 0) {
        await animateSow(result.steps);
      }

      if (!isMounted.current) return;

      setState((s) => ({ ...s, board: result.board, phase: 'playing' }));

      const winner = checkWinner(result.board);
      if (winner !== null) {
        setState((s) => ({
          ...s,
          board: result.board,
          winner,
          phase: 'finished',
        }));
        setInputLocked(false);
        return;
      }

      if (result.extraTurn) {
        showMessage('もう一回!');
        setState((s) => ({
          ...s,
          board: result.board,
          currentPlayer: player,
          phase: 'playing',
        }));

        if (mode === 'cpu' && player !== humanSide) {
          setTimeout(() => {
            if (isMounted.current) triggerAIRef.current(result.board, player);
          }, CPU_DELAY + 500);
        } else {
          setInputLocked(false);
        }
      } else {
        const nextPlayer = opponent(player);
        setState((s) => ({
          ...s,
          board: result.board,
          currentPlayer: nextPlayer,
          phase: 'playing',
        }));

        if (mode === 'cpu' && nextPlayer !== humanSide) {
          setTimeout(() => {
            if (isMounted.current) triggerAIRef.current(result.board, nextPlayer);
          }, CPU_DELAY);
        } else {
          setInputLocked(false);
        }
      }
    },
    [mode, humanSide, animateSow, showMessage],
  );

  // Trigger AI move
  const triggerAI = useCallback(
    (board: typeof state.board, player: Player) => {
      const validPits = getValidPits(board, player);
      if (validPits.length === 0) return;

      const pit = getAIMove(board, player, difficulty);
      if (pit >= 0) {
        executeMoveFromBoard(board, player, pit);
      }
    },
    [difficulty, executeMoveFromBoard],
  );

  // Keep ref in sync with latest triggerAI
  triggerAIRef.current = triggerAI;

  // Handle pit selection by human
  const handleSelectPit = useCallback(
    (player: Player, pitIndex: number) => {
      if (inputLocked) return;
      if (state.phase !== 'playing') return;
      if (state.currentPlayer !== player) return;

      // In CPU mode, only allow human side
      if (mode === 'cpu' && player !== humanSide) return;

      const pits = player === 'A' ? state.board.a : state.board.b;
      if (pits[pitIndex] === 0) return;

      executeMoveFromBoard(state.board, player, pitIndex);
    },
    [inputLocked, state, mode, humanSide, executeMoveFromBoard],
  );

  // Trigger initial AI move if CPU goes first
  useEffect(() => {
    if (
      mode === 'cpu' &&
      state.phase === 'playing' &&
      state.currentPlayer !== humanSide &&
      !state.winner
    ) {
      setTimeout(() => {
        if (isMounted.current) triggerAI(state.board, state.currentPlayer);
      }, CPU_DELAY);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset game
  const doReset = useCallback(() => {
    setState(createInitialState(mode, difficulty, humanSide));
    setInputLocked(false);
    setHighlightSlot(null);
  }, [mode, difficulty, humanSide]);

  const handleReset = useCallback(() => {
    if (!isSubscriptionActive()) {
      Alert.alert(
        'プレミアム限定',
        '「最初から」はプレミアム会員限定の機能です。',
        [{ text: 'OK', style: 'cancel' }],
      );
      return;
    }
    doReset();
  }, [doReset]);

  // Notify parent when game ends (for ResultScreen navigation)
  useEffect(() => {
    if (state.winner !== null && onGameEnd) {
      const timer = setTimeout(() => {
        if (mode === 'cpu') {
          onGameEnd(state.winner === humanSide ? 'player' : 'cpu');
        } else {
          // In local mode, player A winning counts as 'player'
          onGameEnd(state.winner === 'A' ? 'player' : 'cpu');
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [state.winner, mode, humanSide, onGameEnd]);

  // Determine input enabled
  const inputEnabled =
    !inputLocked &&
    state.phase === 'playing' &&
    !state.winner;

  // Turn display
  const turnLabel = (() => {
    if (state.winner) {
      if (mode === 'cpu') {
        return state.winner === humanSide ? 'あなたの勝ち!' : 'CPUの勝ち...';
      }
      return `プレイヤー${state.winner}の勝ち!`;
    }
    if (state.phase === 'sowing') return 'コインを配り中...';
    if (mode === 'cpu') {
      return state.currentPlayer === humanSide
        ? 'あなたのターン'
        : 'CPUが考え中...';
    }
    return `プレイヤー${state.currentPlayer}のターン`;
  })();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* Header */}
      <View style={styles.header}>
        {onExit && (
          <TouchableOpacity onPress={onExit} style={styles.exitButton}>
            <Text style={styles.exitText}>{'< 戻る'}</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>パタパタ</Text>
      </View>

      {/* Turn indicator */}
      <View style={styles.turnContainer}>
        <Text
          style={[
            styles.turnText,
            state.winner && styles.winnerText,
          ]}
        >
          {turnLabel}
        </Text>
      </View>

      {/* Message overlay (もう一回! etc.) */}
      {state.message && (
        <Animated.View
          style={[
            styles.messageOverlay,
            { opacity: messageAnim, transform: [{ scale: messageAnim }] },
          ]}
        >
          <Text style={styles.messageText}>{state.message}</Text>
        </Animated.View>
      )}

      {/* Player B label */}
      <Text style={styles.sideLabel}>
        {mode === 'cpu' && humanSide === 'B' ? 'あなた' : mode === 'cpu' ? 'CPU' : 'プレイヤーB'}
      </Text>

      {/* Board */}
      <MancalaBoard
        board={state.board}
        currentPlayer={state.currentPlayer}
        humanSide={humanSide}
        inputEnabled={inputEnabled}
        onSelectPit={handleSelectPit}
        highlightSlot={highlightSlot}
      />

      {/* Player A label */}
      <Text style={styles.sideLabel}>
        {mode === 'cpu' && humanSide === 'A' ? 'あなた' : mode === 'cpu' ? 'CPU' : 'プレイヤーA'}
      </Text>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={handleReset} style={styles.button}>
          <Text style={styles.buttonText}>リセット</Text>
        </TouchableOpacity>
      </View>

      {/* Game Over Overlay */}
      {state.winner !== null && (
        <View style={styles.overlay}>
          <View style={styles.resultBox}>
            <Text
              style={[
                styles.resultText,
                mode === 'cpu' && state.winner !== humanSide && styles.resultTextLoss,
              ]}
            >
              {mode === 'cpu'
                ? state.winner === humanSide
                  ? '勝利！'
                  : '敗北...'
                : `プレイヤー${state.winner}の勝ち！`}
            </Text>
            <View style={styles.overlayButtonRow}>
              <TouchableOpacity onPress={handleReset} style={styles.overlayButton}>
                <Text style={styles.overlayButtonText}>もう一度</Text>
              </TouchableOpacity>
              {onExit && (
                <TouchableOpacity onPress={onExit} style={styles.overlayButtonSecondary}>
                  <Text style={styles.overlayButtonSecondaryText}>戻る</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  exitButton: {
    position: 'absolute',
    left: 16,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  exitText: {
    ...FONTS.bold,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  title: {
    ...FONTS.heavy,
    fontSize: 24,
    color: COLORS.gold,
  },
  turnContainer: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: COLORS.cardBg,
    marginBottom: 8,
  },
  turnText: {
    ...FONTS.bold,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  winnerText: {
    color: COLORS.gold,
    fontSize: 20,
  },
  messageOverlay: {
    position: 'absolute',
    top: SIZES.screenHeight * 0.35,
    zIndex: 100,
    backgroundColor: 'rgba(255,215,0,0.95)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
  },
  messageText: {
    ...FONTS.heavy,
    fontSize: 28,
    color: COLORS.bg,
  },
  sideLabel: {
    ...FONTS.bold,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginVertical: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 24,
  },
  scoreBox: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  scoreLabel: {
    ...FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  scoreValue: {
    ...FONTS.heavy,
    fontSize: 20,
    color: COLORS.gold,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 16,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorderActive,
  },
  buttonText: {
    ...FONTS.bold,
    fontSize: 14,
    color: COLORS.gold,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  resultBox: {
    backgroundColor: COLORS.bg,
    borderRadius: 20,
    padding: 32,
    borderWidth: 2,
    borderColor: COLORS.gold,
    alignItems: 'center',
  },
  resultText: {
    ...FONTS.heavy,
    fontSize: 32,
    color: COLORS.gold,
    marginBottom: 24,
  },
  resultTextLoss: {
    color: '#ff4444',
  },
  resultTextDraw: {
    color: COLORS.textSecondary,
  },
  overlayButtonRow: {
    flexDirection: 'row',
    gap: 16,
  },
  overlayButton: {
    backgroundColor: COLORS.gold,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  overlayButtonText: {
    ...FONTS.heavy,
    fontSize: 16,
    color: COLORS.bg,
  },
  overlayButtonSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
  },
  overlayButtonSecondaryText: {
    ...FONTS.bold,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});

export default Game4Screen;
