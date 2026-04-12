// ============================
// Game5: 日月の戦い — Main Screen
// ============================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  AlertButton,
} from 'react-native';
import { COLORS, SIZES, FONTS } from '../../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Game5State,
  Position,
  PieceType,
  Side,
  Difficulty,
  GameMode,
} from './game5Types';
import {
  createInitialState,
  getValidMoves,
  getValidDropsForPiece,
  movePiece,
  dropPiece,
  getAllLegalActions,
} from './game5Logic';
import { getAIMove } from './game5AI';
import ShogiBoard from './components/ShogiBoard';
import HandPieces from './components/HandPieces';
import { isSubscriptionActive } from '../../monetize/iapService';

const TURN_TIME_LIMIT = 30; // seconds per turn

interface Game5ScreenProps {
  mode?: GameMode;
  difficulty?: Difficulty;
  playerSide?: Side;
  onBack?: () => void;
  onGameEnd?: (result: 'player' | 'cpu' | 'draw' | 'timeout') => void;
}

export const Game5Screen: React.FC<Game5ScreenProps> = ({
  mode = 'cpu',
  difficulty = 'normal',
  playerSide = 'sun',
  onBack,
  onGameEnd,
}) => {
  const insets = useSafeAreaInsets();
  const [gameState, setGameState] = useState<Game5State>(createInitialState);
  const [showCheckAlert, setShowCheckAlert] = useState(false);
  const aiThinking = useRef(false);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const [timeLeft, setTimeLeft] = useState(TURN_TIME_LIMIT);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cpuSide: Side = playerSide === 'sun' ? 'moon' : 'sun';
  const isPlayerTurn =
    mode === 'local' || gameState.turn === playerSide;

  // ─── Turn timer ───
  useEffect(() => {
    // Reset timer on turn change
    if (gameState.phase === 'gameover') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setTimeLeft(TURN_TIME_LIMIT);
    if (timerRef.current) clearInterval(timerRef.current);

    // Only run countdown when it's a human player's turn
    const shouldCountdown = mode === 'local' || gameState.turn === playerSide;
    if (!shouldCountdown) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up — current player loses
          if (timerRef.current) clearInterval(timerRef.current);
          setGameState(gs => {
            if (gs.phase === 'gameover') return gs;
            return {
              ...gs,
              winner: gs.turn === 'sun' ? 'moon' : 'sun',
              phase: 'gameover' as const,
            };
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState.turn, gameState.phase, gameState.moveCount, mode, playerSide]);

  // ─── Check for no legal moves at start of turn ───
  useEffect(() => {
    if (gameState.phase === 'gameover') return;
    const actions = getAllLegalActions(gameState, gameState.turn);
    if (actions.length === 0) {
      // Current player has no legal moves — they lose
      setGameState(prev => ({
        ...prev,
        winner: prev.turn === 'sun' ? 'moon' : 'sun',
        phase: 'gameover' as const,
      }));
    }
  }, [gameState.turn, gameState.moveCount, gameState.phase]);

  // ─── Check alert ───
  useEffect(() => {
    if (gameState.isCheck && gameState.phase !== 'gameover') {
      setShowCheckAlert(true);
      const timer = setTimeout(() => setShowCheckAlert(false), 1500);
      return () => clearTimeout(timer);
    }
    setShowCheckAlert(false);
  }, [gameState.isCheck, gameState.moveCount]);

  // ─── AI turn ───
  useEffect(() => {
    if (mode !== 'cpu') return;
    if (gameState.turn !== cpuSide) return;
    if (gameState.phase === 'gameover') return;
    if (aiThinking.current) return;

    aiThinking.current = true;
    const timer = setTimeout(() => {
      try {
        const action = getAIMove(gameStateRef.current, cpuSide, difficulty);
        setGameState(prev => {
          if (action.kind === 'move') {
            return movePiece(prev, action.from, action.to);
          } else {
            return dropPiece(prev, action.piece, action.to);
          }
        });
      } catch {
        // No legal moves - shouldn't happen if checkmate detected properly
      }
      aiThinking.current = false;
    }, 600);

    return () => {
      clearTimeout(timer);
      aiThinking.current = false;
    };
  }, [gameState.turn, gameState.phase, mode, cpuSide, difficulty]);

  // ─── Board cell press ───
  const handleCellPress = useCallback(
    (pos: Position) => {
      if (gameState.phase === 'gameover') return;
      if (!isPlayerTurn) return;

      const { board, selectedPos, selectedHandPiece, validMoves } = gameState;
      const cell = board[pos.row][pos.col];

      // If a hand piece is selected and this is a valid drop target
      if (selectedHandPiece !== null) {
        const isValidDrop = validMoves.some(
          p => p.row === pos.row && p.col === pos.col
        );
        if (isValidDrop) {
          setGameState(prev => dropPiece(prev, selectedHandPiece, pos));
          return;
        }
        // Deselect hand piece if clicking elsewhere
        setGameState(prev => ({
          ...prev,
          selectedHandPiece: null,
          validMoves: [],
          phase: 'select',
        }));
        // Fall through to possibly select a board piece
      }

      // If a board piece is selected and clicking a valid move target
      if (selectedPos !== null) {
        const isValidTarget = validMoves.some(
          p => p.row === pos.row && p.col === pos.col
        );
        if (isValidTarget) {
          setGameState(prev => movePiece(prev, selectedPos, pos));
          return;
        }
      }

      // Select own piece on the board
      if (cell && cell.side === gameState.turn) {
        const moves = getValidMoves(board, pos, gameState.moveHistory);
        setGameState(prev => ({
          ...prev,
          selectedPos: pos,
          selectedHandPiece: null,
          validMoves: moves,
          phase: 'move',
        }));
        return;
      }

      // Deselect
      setGameState(prev => ({
        ...prev,
        selectedPos: null,
        selectedHandPiece: null,
        validMoves: [],
        phase: 'select',
      }));
    },
    [gameState, isPlayerTurn]
  );

  // ─── Hand piece press ───
  const handleHandPiecePress = useCallback(
    (pieceType: PieceType) => {
      if (gameState.phase === 'gameover') return;
      if (!isPlayerTurn) return;

      // Toggle selection
      if (gameState.selectedHandPiece === pieceType) {
        setGameState(prev => ({
          ...prev,
          selectedHandPiece: null,
          selectedPos: null,
          validMoves: [],
          phase: 'select',
        }));
        return;
      }

      const drops = getValidDropsForPiece(
        gameState.board,
        gameState.turn,
        pieceType,
        gameState.moveHistory
      );
      setGameState(prev => ({
        ...prev,
        selectedHandPiece: pieceType,
        selectedPos: null,
        validMoves: drops,
        phase: 'drop',
      }));
    },
    [gameState, isPlayerTurn]
  );

  // ─── Notify parent on game end ───
  useEffect(() => {
    if (gameState.phase === 'gameover' && gameState.winner && onGameEnd) {
      const isTimeout = timeLeft <= 0;
      const timer = setTimeout(() => {
        if (isTimeout) {
          onGameEnd('timeout');
        } else {
          onGameEnd(gameState.winner === playerSide ? 'player' : 'cpu');
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [gameState.phase, gameState.winner, playerSide, onGameEnd, timeLeft]);

  // ─── Reset ───
  const doReset = useCallback(() => {
    setGameState(createInitialState());
    setTimeLeft(TURN_TIME_LIMIT);
    aiThinking.current = false;
  }, []);

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

  // ─── Render ───
  const turnLabel = gameState.turn === 'sun'
    ? 'あなたの番'
    : 'CPUの番';

  const isTimeout = gameState.phase === 'gameover' && timeLeft <= 0;
  const winnerLabel = isTimeout
    ? '時間切れ — 負け'
    : gameState.winner === playerSide
    ? '勝利！'
    : gameState.winner === cpuSide
    ? '敗北...'
    : '';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>← 戻る</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>日月の戦い</Text>
      </View>

      {/* Turn / Status */}
      <View style={styles.statusRow}>
        {gameState.phase === 'gameover' ? (
          <Text style={styles.statusWinner}>{winnerLabel}</Text>
        ) : (
          <Text style={styles.statusTurn}>{turnLabel}</Text>
        )}
      </View>

      {/* Timer */}
      {gameState.phase !== 'gameover' && (
        <View style={styles.timerRow}>
          <Text
            style={[
              styles.timerText,
              timeLeft <= 10 && styles.timerTextUrgent,
            ]}
          >
            {timeLeft}秒
          </Text>
        </View>
      )}

      {/* Check Alert */}
      {showCheckAlert && (
        <View style={styles.checkAlert}>
          <Text style={styles.checkAlertText}>王手！</Text>
        </View>
      )}

      {/* Moon hand (top) */}
      <HandPieces
        hand={gameState.moonHand}
        side="moon"
        isActive={gameState.turn === 'moon' && isPlayerTurn}
        selectedPiece={
          gameState.turn === 'moon' ? gameState.selectedHandPiece : null
        }
        onPiecePress={handleHandPiecePress}
      />

      {/* Board */}
      <View style={styles.boardContainer}>
        <ShogiBoard
          board={gameState.board}
          selectedPos={gameState.selectedPos}
          validMoves={gameState.validMoves}
          onCellPress={handleCellPress}
        />
      </View>

      {/* Sun hand (bottom) */}
      <HandPieces
        hand={gameState.sunHand}
        side="sun"
        isActive={gameState.turn === 'sun' && isPlayerTurn}
        selectedPiece={
          gameState.turn === 'sun' ? gameState.selectedHandPiece : null
        }
        onPiecePress={handleHandPiecePress}
      />

      {/* AI thinking indicator */}
      {mode === 'cpu' && !isPlayerTurn && gameState.phase !== 'gameover' && (
        <Text style={styles.thinkingText}>CPU思考中...</Text>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
          <Text style={styles.resetText}>{'\u{1F504}'} 最初から</Text>
        </TouchableOpacity>
      </View>

      {/* Move count */}
      <Text style={styles.moveCount}>
        手数: {gameState.moveCount}
      </Text>

      {/* Game Over Overlay */}
      {gameState.phase === 'gameover' && gameState.winner && (
        <View style={styles.overlay}>
          <View style={styles.resultBox}>
            <Text
              style={[
                styles.resultText,
                (mode === 'cpu' && gameState.winner === cpuSide) || isTimeout
                  ? styles.resultTextLoss
                  : undefined,
              ]}
            >
              {winnerLabel}
            </Text>
            <View style={styles.overlayButtonRow}>
              <TouchableOpacity onPress={handleReset} style={styles.overlayButton}>
                <Text style={styles.overlayButtonText}>もう一度</Text>
              </TouchableOpacity>
              {onBack && (
                <TouchableOpacity onPress={onBack} style={styles.overlayButtonSecondary}>
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
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  backBtn: {
    marginRight: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 22,
    ...FONTS.heavy,
  },
  statusRow: {
    marginBottom: 8,
    alignItems: 'center',
  },
  statusTurn: {
    color: COLORS.gold,
    fontSize: 18,
    ...FONTS.bold,
  },
  statusWinner: {
    color: COLORS.red,
    fontSize: 20,
    ...FONTS.heavy,
  },
  timerRow: {
    marginBottom: 4,
    alignItems: 'center',
  },
  timerText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    ...FONTS.bold,
  },
  timerTextUrgent: {
    color: COLORS.red,
    fontSize: 18,
    ...FONTS.heavy,
  },
  checkAlert: {
    backgroundColor: 'rgba(255, 50, 50, 0.2)',
    borderColor: COLORS.red,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 6,
  },
  checkAlertText: {
    color: COLORS.red,
    fontSize: 18,
    ...FONTS.heavy,
  },
  boardContainer: {
    marginVertical: 12,
    alignItems: 'center',
  },
  thinkingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  resetBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  resetText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    ...FONTS.bold,
  },
  moveCount: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 12,
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
    color: COLORS.gold,
    fontSize: 32,
    ...FONTS.heavy,
    marginBottom: 24,
  },
  resultTextLoss: {
    color: '#ff4444',
  },
  resultTextDraw: {
    color: COLORS.blue,
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
    color: COLORS.bg,
    fontSize: 16,
    ...FONTS.heavy,
  },
  overlayButtonSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
  },
  overlayButtonSecondaryText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    ...FONTS.bold,
  },
});

export default Game5Screen;
