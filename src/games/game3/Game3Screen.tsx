// ============================================================
// Game3: 三つ巴 — Full Game Screen
// ============================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { COLORS, SIZES, FONTS } from '../../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type {
  Player,
  CoinNumber,
  StackCell,
  PlayerHand,
  Game3State,
  Game3Mode,
  Game3Action,
  Difficulty,
} from './game3Types';
import {
  PLAYERS,
  PLAYER_EMOJI,
  PLAYER_LABEL,
  createInitialGame3State,
  DEFAULT_GAME3_CONFIG,
} from './game3Types';
import {
  topOwner,
  topNumber,
  topLayer,
  getValidPlacements,
  getPlayableHandCoins,
  getMovableCells,
  getValidMoveDestinations,
  getAllActions,
  executeTurn,
} from './game3Logic';
import { getAIAction } from './game3AI';
import type { CoinType } from '../../game/types';

// ------------------------------------------------------------------
// Props
// ------------------------------------------------------------------

interface Game3ScreenProps {
  coin?: CoinType;
  difficulty?: 'normal' | 'hard';
  onGameEnd?: (result: 'player' | 'cpu' | 'draw' | 'timeout') => void;
  onBack?: () => void;
}

// ------------------------------------------------------------------
// Color mapping
// ------------------------------------------------------------------

const PLAYER_COLORS: Record<Player, { bg: string; text: string; border: string }> = {
  fire: { bg: '#cc220033', text: '#ffaa44', border: '#cc2200' },
  water: { bg: '#0044cc33', text: '#44ddff', border: '#0044cc' },
  swirl: { bg: '#5500cc33', text: '#dd88ff', border: '#5500cc' },
};

const COIN_BG: Record<Player, string> = {
  fire: '#ff6622',
  water: '#2288ff',
  swirl: '#aa44ff',
};

// ------------------------------------------------------------------
// Main Component
// ------------------------------------------------------------------

export default function Game3Screen({ coin, difficulty: propDifficulty, onGameEnd, onBack }: Game3ScreenProps) {
  const insets = useSafeAreaInsets();
  const [gameState, setGameState] = useState<Game3State | null>(null);
  const [mode, setMode] = useState<Game3Mode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(propDifficulty ?? 'normal');
  const [showTurnSwitch, setShowTurnSwitch] = useState(false);
  const [message, setMessage] = useState<string>('');
  const cpuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ------------------------------------------------------------------
  // Start game
  // ------------------------------------------------------------------

  const startGame = useCallback((m: Game3Mode, d: Difficulty) => {
    setMode(m);
    setDifficulty(d);
    const state = createInitialGame3State(m, d);
    setGameState(state);
    setMessage('');
    setShowTurnSwitch(false);
  }, []);

  const resetToMenu = useCallback(() => {
    if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current);
    if (onBack) {
      onBack();
      return;
    }
    setGameState(null);
    setMode(null);
    setShowTurnSwitch(false);
    setMessage('');
  }, [onBack]);

  // Convert game3 winner to standard result for navigation
  const toResult = useCallback((winner: Player | null): 'player' | 'cpu' | 'draw' => {
    if (!winner) return 'draw';
    // In vsCPU mode, 'fire' is the human player
    return winner === 'fire' ? 'player' : 'cpu';
  }, []);

  // ------------------------------------------------------------------
  // CPU turn
  // ------------------------------------------------------------------

  const isCPU = useCallback(
    (player: Player): boolean => {
      if (!mode) return false;
      if (mode === 'vsCPU') return player !== 'fire';
      return false; // local3P: all human
    },
    [mode],
  );

  const doCPUTurn = useCallback(
    (state: Game3State) => {
      if (state.phase !== 'playing') return;
      if (!isCPU(state.currentPlayer)) return;

      cpuTimerRef.current = setTimeout(() => {
        const action = getAIAction(state, difficulty);
        if (!action) return;
        const newState = executeTurn(state, action);
        // Track which cell the CPU acted on for highlighting
        const cpuTargetCell = action.type === 'place' ? action.targetCell : action.toCell;
        setGameState({ ...newState, lastCpuCell: cpuTargetCell });

        if (newState.phase === 'finished') {
          if (newState.winner) {
            setMessage(
              `${PLAYER_EMOJI[newState.winner]} ${PLAYER_LABEL[newState.winner]}の勝ち!`,
            );
          } else {
            setMessage('引き分け!');
          }
          if (onGameEnd && mode === 'vsCPU') {
            onGameEnd(toResult(newState.winner));
          }
        }
        // No recursive chaining — the useEffect watching currentPlayer/phase
        // will re-trigger doCPUTurn for the next CPU player automatically.
      }, DEFAULT_GAME3_CONFIG.cpuDelay);
    },
    [difficulty, isCPU, onGameEnd, mode, toResult],
  );

  // Trigger CPU turn when game state changes
  useEffect(() => {
    if (!gameState || gameState.phase !== 'playing') return;
    if (isCPU(gameState.currentPlayer)) {
      doCPUTurn(gameState);
    }
    return () => {
      if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current);
    };
  }, [gameState?.currentPlayer, gameState?.phase, doCPUTurn, isCPU]);

  // ------------------------------------------------------------------
  // Player actions
  // ------------------------------------------------------------------

  const handlePostTurn = useCallback(
    (newState: Game3State) => {
      if (newState.phase === 'finished') {
        if (newState.winner) {
          setMessage(
            `${PLAYER_EMOJI[newState.winner]} ${PLAYER_LABEL[newState.winner]}の勝ち!`,
          );
        } else {
          setMessage('引き分け!');
        }
        if (onGameEnd && mode === 'vsCPU') {
          onGameEnd(toResult(newState.winner));
        }
        return;
      }

      // Local 3P: show turn switch screen
      if (mode === 'local3P') {
        setShowTurnSwitch(true);
      }
    },
    [mode, onGameEnd, toResult],
  );

  const handleSelectHandCoin = useCallback(
    (coin: CoinNumber) => {
      if (!gameState || gameState.phase !== 'playing') return;
      if (isCPU(gameState.currentPlayer)) return;

      setGameState(prev => {
        if (!prev) return prev;
        // Toggle selection
        if (prev.selectedHandCoin === coin) {
          return { ...prev, selectedHandCoin: null, selectedBoardCell: null };
        }
        return { ...prev, selectedHandCoin: coin, selectedBoardCell: null };
      });
    },
    [gameState, isCPU],
  );

  const handleSelectBoardCell = useCallback(
    (cellIdx: number) => {
      if (!gameState || gameState.phase !== 'playing') return;
      if (isCPU(gameState.currentPlayer)) return;

      const { selectedHandCoin, selectedBoardCell, currentPlayer, board, hands } =
        gameState;

      // Case 1: We have a hand coin selected -> place it
      if (selectedHandCoin !== null) {
        const validTargets = getValidPlacements(board, selectedHandCoin);
        if (validTargets.includes(cellIdx)) {
          const action: Game3Action = {
            type: 'place',
            coinNumber: selectedHandCoin,
            targetCell: cellIdx,
          };
          const newState = executeTurn(gameState, action);
          setGameState({ ...newState, lastCpuCell: null });
          handlePostTurn(newState);
          return;
        }
        // Invalid target — deselect
        setGameState(prev => prev ? { ...prev, selectedHandCoin: null } : prev);
        return;
      }

      // Case 2: We have a board cell selected -> move to target
      if (selectedBoardCell !== null) {
        if (cellIdx === selectedBoardCell) {
          // Deselect
          setGameState(prev =>
            prev ? { ...prev, selectedBoardCell: null } : prev,
          );
          return;
        }
        const validDests = getValidMoveDestinations(board, selectedBoardCell);
        if (validDests.includes(cellIdx)) {
          const action: Game3Action = {
            type: 'move',
            fromCell: selectedBoardCell,
            toCell: cellIdx,
          };
          const newState = executeTurn(gameState, action);
          setGameState({ ...newState, lastCpuCell: null });
          handlePostTurn(newState);
          return;
        }
        // Invalid — deselect
        setGameState(prev =>
          prev ? { ...prev, selectedBoardCell: null } : prev,
        );
        return;
      }

      // Case 3: Nothing selected -> select own top coin for move
      if (topOwner(board[cellIdx]) === currentPlayer) {
        const movable = getMovableCells(board, currentPlayer);
        if (movable.includes(cellIdx)) {
          setGameState(prev =>
            prev
              ? { ...prev, selectedBoardCell: cellIdx, selectedHandCoin: null }
              : prev,
          );
        }
      }
    },
    [gameState, isCPU, handlePostTurn],
  );

  const dismissTurnSwitch = useCallback(() => {
    setShowTurnSwitch(false);
  }, []);

  // ------------------------------------------------------------------
  // Render: Mode Select
  // ------------------------------------------------------------------

  if (!gameState) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.title}>三つ巴</Text>
        <Text style={styles.subtitle}>3人コイン重ねバトル</Text>

        <View style={styles.menuSection}>
          <Text style={styles.menuLabel}>CPU対戦 (1人プレイ)</Text>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => startGame('vsCPU', 'normal')}
          >
            <Text style={styles.menuButtonText}>ふつう</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuButton, styles.menuButtonHard]}
            onPress={() => startGame('vsCPU', 'hard')}
          >
            <Text style={styles.menuButtonText}>つよい</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuLabel}>ローカル3人対戦</Text>
          <TouchableOpacity
            style={[styles.menuButton, styles.menuButtonLocal]}
            onPress={() => startGame('local3P', 'normal')}
          >
            <Text style={styles.menuButtonText}>3人で遊ぶ</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ------------------------------------------------------------------
  // Render: Turn Switch Screen (local 3P)
  // ------------------------------------------------------------------

  if (showTurnSwitch && gameState.phase === 'playing') {
    const cp = gameState.currentPlayer;
    return (
      <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
        <View style={styles.turnSwitchBox}>
          <Text style={styles.turnSwitchEmoji}>{PLAYER_EMOJI[cp]}</Text>
          <Text style={styles.turnSwitchText}>
            {PLAYER_LABEL[cp]}の番です!
          </Text>
          <TouchableOpacity
            style={[
              styles.turnSwitchButton,
              { borderColor: PLAYER_COLORS[cp].border },
            ]}
            onPress={dismissTurnSwitch}
          >
            <Text style={styles.turnSwitchButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ------------------------------------------------------------------
  // Render: Game Board
  // ------------------------------------------------------------------

  const {
    board,
    hands,
    currentPlayer,
    phase,
    winner,
    winLine,
    selectedHandCoin,
    selectedBoardCell,
    lastCpuCell,
  } = gameState;

  const isMyTurn = !isCPU(currentPlayer) && phase === 'playing';

  // Valid targets for highlighting
  let validTargets: number[] = [];
  if (isMyTurn && selectedHandCoin !== null) {
    validTargets = getValidPlacements(board, selectedHandCoin);
  } else if (isMyTurn && selectedBoardCell !== null) {
    validTargets = getValidMoveDestinations(board, selectedBoardCell);
  }

  // In local3P, only show current player's hand
  const visiblePlayers =
    mode === 'local3P' ? [currentPlayer] : PLAYERS;

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 10 }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={resetToMenu} style={styles.backTouchable}>
          <Text style={styles.backButton}>{'< 戻る'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>三つ巴</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Turn Indicator */}
      <View
        style={[
          styles.turnIndicator,
          { borderColor: PLAYER_COLORS[currentPlayer].border },
        ]}
      >
        <Text style={styles.turnText}>
          {phase === 'finished'
            ? message
            : `${PLAYER_EMOJI[currentPlayer]} ${PLAYER_LABEL[currentPlayer]}のターン`}
        </Text>
      </View>

      {/* Board */}
      <View style={styles.boardContainer}>
        {[0, 1, 2].map(row => (
          <View key={row} style={styles.boardRow}>
            {[0, 1, 2].map(col => {
              const idx = row * 3 + col;
              const cell = board[idx];
              const isWinCell = winLine?.includes(idx);
              const isSelected = selectedBoardCell === idx;
              const isValidTarget = validTargets.includes(idx);
              const isCpuLastMove = lastCpuCell === idx;
              const owner = topOwner(cell);
              const num = topNumber(cell);

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.cell,
                    isWinCell && styles.cellWin,
                    isSelected && styles.cellSelected,
                    isValidTarget && styles.cellValidTarget,
                    isCpuLastMove && styles.cellCpuLastMove,
                  ]}
                  onPress={() => handleSelectBoardCell(idx)}
                  disabled={phase === 'finished'}
                >
                  {cell.length > 0 && owner && num ? (
                    <View style={styles.cellContent}>
                      <View
                        style={[
                          styles.coinOnBoard,
                          { backgroundColor: COIN_BG[owner] },
                        ]}
                      >
                        <Text style={styles.coinEmoji}>
                          {PLAYER_EMOJI[owner]}
                        </Text>
                        <Text style={styles.coinNumber}>{num}</Text>
                      </View>
                      {cell.length > 1 && (
                        <View style={styles.layerBadge}>
                          <Text style={styles.layerBadgeText}>
                            x{cell.length}
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.emptyCell} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Player Hands */}
      <View style={styles.handsContainer}>
        {visiblePlayers.map(player => (
          <PlayerHandView
            key={player}
            player={player}
            hand={hands[player]}
            isActive={currentPlayer === player && phase === 'playing'}
            isSelectable={isMyTurn && currentPlayer === player}
            selectedCoin={
              currentPlayer === player ? selectedHandCoin : null
            }
            board={board}
            onSelectCoin={handleSelectHandCoin}
          />
        ))}
      </View>

      {/* Restart / Menu */}
      {phase === 'finished' && (
        <View style={styles.finishedActions}>
          <TouchableOpacity
            style={styles.restartButton}
            onPress={() => startGame(mode!, difficulty)}
          >
            <Text style={styles.restartButtonText}>もう一度</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuReturnButton} onPress={resetToMenu}>
            <Text style={styles.menuReturnButtonText}>メニューへ</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

// ------------------------------------------------------------------
// PlayerHandView sub-component
// ------------------------------------------------------------------

interface PlayerHandViewProps {
  player: Player;
  hand: PlayerHand;
  isActive: boolean;
  isSelectable: boolean;
  selectedCoin: CoinNumber | null;
  board: StackCell[];
  onSelectCoin: (coin: CoinNumber) => void;
}

function PlayerHandView({
  player,
  hand,
  isActive,
  isSelectable,
  selectedCoin,
  board,
  onSelectCoin,
}: PlayerHandViewProps) {
  const colors = PLAYER_COLORS[player];
  const playable = isSelectable ? getPlayableHandCoins(board, hand) : [];

  return (
    <View
      style={[
        styles.handBox,
        {
          backgroundColor: isActive ? colors.bg : 'rgba(255,255,255,0.02)',
          borderColor: isActive ? colors.border : 'rgba(255,255,255,0.08)',
        },
      ]}
    >
      <Text style={[styles.handLabel, { color: colors.text }]}>
        {PLAYER_EMOJI[player]} {PLAYER_LABEL[player]}
      </Text>
      <View style={styles.handCoins}>
        {([1, 2, 3] as CoinNumber[]).map(num => {
          const count = hand[num];
          const canPlay = playable.includes(num);
          const isSelected = selectedCoin === num;

          return (
            <TouchableOpacity
              key={num}
              style={[
                styles.handCoinSlot,
                {
                  backgroundColor: count > 0 ? COIN_BG[player] + '44' : 'transparent',
                  borderColor: isSelected
                    ? COLORS.gold
                    : canPlay
                    ? colors.border
                    : 'rgba(255,255,255,0.1)',
                  opacity: count > 0 ? 1 : 0.3,
                },
                isSelected && styles.handCoinSelected,
              ]}
              onPress={() => canPlay && onSelectCoin(num)}
              disabled={!canPlay}
            >
              <Text style={styles.handCoinNumber}>{num}</Text>
              <Text style={styles.handCoinCount}>x{count}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ------------------------------------------------------------------
// Styles
// ------------------------------------------------------------------

const BOARD_SIZE = SIZES.boardSize;
const CELL_SIZE = BOARD_SIZE / 3 - 6;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },

  // -- Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  backTouchable: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  backButton: {
    color: COLORS.textSecondary,
    fontSize: 14,
    ...FONTS.bold,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    ...FONTS.heavy,
  },

  // -- Title / Menu
  title: {
    color: COLORS.gold,
    fontSize: 36,
    ...FONTS.heavy,
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 32,
  },
  menuSection: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  menuLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 8,
    ...FONTS.bold,
  },
  menuButton: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginBottom: 8,
    width: 220,
    alignItems: 'center',
  },
  menuButtonHard: {
    borderColor: COLORS.red + '66',
  },
  menuButtonLocal: {
    borderColor: COLORS.blue + '66',
  },
  menuButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    ...FONTS.bold,
  },

  // -- Turn indicator
  turnIndicator: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  turnText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    ...FONTS.bold,
    textAlign: 'center',
  },

  // -- Board
  boardContainer: {
    width: BOARD_SIZE,
    marginBottom: 16,
  },
  boardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellWin: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(255,215,0,0.15)',
  },
  cellSelected: {
    borderColor: COLORS.gold,
    borderWidth: 2,
  },
  cellValidTarget: {
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cellCpuLastMove: {
    borderColor: '#ff6622',
    borderWidth: 2,
    backgroundColor: 'rgba(255,102,34,0.12)',
  },

  // -- Cell content
  cellContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  coinOnBoard: {
    width: CELL_SIZE * 0.7,
    height: CELL_SIZE * 0.7,
    borderRadius: CELL_SIZE * 0.35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinEmoji: {
    fontSize: 18,
  },
  coinNumber: {
    color: '#fff',
    fontSize: 14,
    ...FONTS.heavy,
    marginTop: -2,
  },
  emptyCell: {
    width: CELL_SIZE * 0.5,
    height: CELL_SIZE * 0.5,
  },
  layerBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  layerBadgeText: {
    color: '#fff',
    fontSize: 10,
    ...FONTS.bold,
  },

  // -- Hands
  handsContainer: {
    width: '100%',
    marginBottom: 12,
  },
  handBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  handLabel: {
    fontSize: 13,
    ...FONTS.bold,
    marginBottom: 6,
  },
  handCoins: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  handCoinSlot: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handCoinSelected: {
    borderWidth: 2.5,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  handCoinNumber: {
    color: '#fff',
    fontSize: 18,
    ...FONTS.heavy,
  },
  handCoinCount: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    ...FONTS.bold,
  },

  // -- Turn switch
  turnSwitchBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  turnSwitchEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  turnSwitchText: {
    color: COLORS.textPrimary,
    fontSize: 24,
    ...FONTS.heavy,
    marginBottom: 24,
  },
  turnSwitchButton: {
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 48,
  },
  turnSwitchButtonText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    ...FONTS.bold,
  },

  // -- Finished actions
  finishedActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  restartButton: {
    backgroundColor: COLORS.gold + '22',
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  restartButtonText: {
    color: COLORS.gold,
    fontSize: 15,
    ...FONTS.bold,
  },
  menuReturnButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  menuReturnButtonText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    ...FONTS.bold,
  },
});
