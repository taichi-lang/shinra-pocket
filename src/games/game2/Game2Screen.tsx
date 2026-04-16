// Game2Screen — 一騎打ち (One-on-One) full game screen
// Redesigned: intuitive tap-based UI, no mode buttons

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { COLORS, SIZES, FONTS } from '../../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CoinType, COINS, CPU_COIN_MAP } from '../../game/types';
import {
  Game2State,
  Player,
  CoinNumber,
  Hand,
  ActionType,
  Game2Phase,
  createInitialGame2State,
} from './game2Types';
import {
  getValidPlacements,
  getMovableCoins,
  getValidMoveTargets,
  placeFromHand,
  moveOnBoard,
  checkWinner,
  isGameOver,
  canPlace,
  canMove,
  hasAnyAction,
  getTopCoin,
} from './game2Logic';
import { chooseAIAction } from './game2AI';
import StackCellView from './components/StackCellView';
import CoinStack from './components/CoinStack';
import { isSubscriptionActive } from '../../monetize/iapService';
import { usePreloadSounds } from '../../sound/useSoundEffect';
import { playSound } from '../../sound/audioService';
import { SFX_MAP } from '../../sound/soundMap';

interface Game2ScreenProps {
  playerCoin: CoinType;
  difficulty: 'normal' | 'hard';
  onGameEnd: (result: 'player' | 'cpu' | 'draw') => void;
  onBack?: () => void;
}

const CPU_DELAY = 100;

// Selection state for the new unified interaction
type Selection =
  | { type: 'none' }
  | { type: 'hand'; coinNumber: CoinNumber; handIndex: number }
  | { type: 'board'; boardIndex: number };

export default function Game2Screen({
  playerCoin,
  difficulty,
  onGameEnd,
  onBack,
}: Game2ScreenProps) {
  const insets = useSafeAreaInsets();
  const cpuCoin = CPU_COIN_MAP[playerCoin];

  const [state, setState] = useState<Game2State>(createInitialGame2State);
  const [selection, setSelection] = useState<Selection>({ type: 'none' });
  const [highlightedCells, setHighlightedCells] = useState<number[]>([]);
  const [message, setMessage] = useState<string>('コインを選んで配置しよう');

  const isProcessing = useRef(false);

  // Sound effects
  usePreloadSounds(['coinPlace', 'coinMove', 'victory', 'defeat', 'turnChange', 'error']);

  // ---- Derived ----
  const {
    board,
    turn,
    phase,
    playerHand,
    cpuHand,
    winner,
    winLine,
    active,
  } = state;

  const isPlayerTurn = turn === 'player' && active && phase !== 'cpuThinking' && phase !== 'gameOver';

  // ---- Clear Selection ----
  const clearSelection = useCallback(() => {
    setSelection({ type: 'none' });
    setHighlightedCells([]);
  }, []);

  // ---- End Turn & Switch ----
  const endTurn = useCallback(
    (newState: Game2State) => {
      // Check win
      const winResult = checkWinner(newState.board);
      if (winResult) {
        setState({
          ...newState,
          winner: winResult.winner,
          winLine: winResult.winLine,
          phase: 'gameOver',
          active: false,
          selectedAction: null,
          selectedCoinNumber: null,
          selectedBoardIndex: null,
        });
        setHighlightedCells([]);
        setSelection({ type: 'none' });
        setMessage(winResult.winner === 'player' ? 'あなたの勝ち!' : 'CPUの勝ち...');
        if (winResult.winner === 'player') playSound('victory', { volume: SFX_MAP.victory.volume });
        else playSound('defeat', { volume: SFX_MAP.defeat.volume });
        return;
      }

      // Check draw
      const gameEnd = isGameOver(newState);
      if (gameEnd.over) {
        setState({
          ...newState,
          winner: 'draw',
          phase: 'gameOver',
          active: false,
          selectedAction: null,
          selectedCoinNumber: null,
          selectedBoardIndex: null,
        });
        setHighlightedCells([]);
        setSelection({ type: 'none' });
        setMessage('引き分け');
        return;
      }

      // Switch turn
      const nextTurn: Player = newState.turn === 'player' ? 'cpu' : 'player';
      const nextPhase: Game2Phase = nextTurn === 'cpu' ? 'cpuThinking' : 'selectAction';

      // Check if next player can act; if not, skip
      const tempState: Game2State = {
        ...newState,
        turn: nextTurn,
        phase: nextPhase,
        selectedAction: null,
        selectedCoinNumber: null,
        selectedBoardIndex: null,
        turnCount: newState.turnCount + 1,
      };

      if (!hasAnyAction(tempState, nextTurn)) {
        // Skip this player's turn
        const skipTurn: Player = nextTurn === 'player' ? 'cpu' : 'player';
        setState({
          ...tempState,
          turn: skipTurn,
          phase: skipTurn === 'cpu' ? 'cpuThinking' : 'selectAction',
        });
        setHighlightedCells([]);
        setSelection({ type: 'none' });
        setMessage(nextTurn === 'player' ? 'あなたは動けない! CPUのターン' : 'CPUは動けない! あなたのターン');
      } else {
        setState(tempState);
        setHighlightedCells([]);
        setSelection({ type: 'none' });
        if (nextTurn === 'player') {
          // Determine hint message
          const canPlaceCoins = canPlace(tempState, 'player');
          const canMoveCoins = canMove(tempState, 'player');
          if (canPlaceCoins && canMoveCoins) {
            setMessage('コインを選んで配置 or タップして移動');
          } else if (canPlaceCoins) {
            setMessage('コインを選んで配置しよう');
          } else {
            setMessage('ボード上のコインをタップして移動');
          }
        } else {
          setMessage('CPU思考中...');
        }
      }
    },
    [],
  );

  // ---- CPU Turn ----
  useEffect(() => {
    if (turn !== 'cpu' || phase !== 'cpuThinking' || !active) return;
    if (isProcessing.current) return;
    isProcessing.current = true;

    const timer = setTimeout(() => {
      const action = chooseAIAction(state, difficulty, cpuCoin, playerCoin);
      if (!action) {
        isProcessing.current = false;
        return;
      }

      let newState: Game2State;
      if (action.type === 'place') {
        newState = placeFromHand(state, 'cpu', action.coinNumber, action.targetIndex, cpuCoin);
      } else {
        newState = moveOnBoard(state, action.fromIndex, action.toIndex);
      }

      newState = { ...newState, turn: 'cpu', phase: 'cpuThinking' };
      endTurn(newState);
      isProcessing.current = false;
    }, CPU_DELAY);

    return () => {
      clearTimeout(timer);
      isProcessing.current = false;
    };
  }, [turn, phase, active, state, difficulty, cpuCoin, playerCoin, endTurn]);

  // ---- Hand Coin Tap ----
  const handleHandCoinTap = (coinNumber: CoinNumber, handIndex: number) => {
    if (!isPlayerTurn) return;

    // If same coin tapped again, deselect
    if (selection.type === 'hand' && selection.coinNumber === coinNumber && selection.handIndex === handIndex) {
      clearSelection();
      setMessage('コインを選んで配置 or タップして移動');
      return;
    }

    // Check count
    const count = coinNumber === 1 ? playerHand.count1 : playerHand.count2;
    if (count <= 0) return;

    const validTargets = getValidPlacements(board, coinNumber, 'player');
    if (validTargets.length === 0) {
      setMessage(`${coinNumber}を置ける場所がありません`);
      return;
    }

    setSelection({ type: 'hand', coinNumber, handIndex });
    setHighlightedCells(validTargets);
    setMessage('置く場所をタップ');
  };

  // ---- Board Cell Tap ----
  const handleCellPress = (index: number) => {
    if (!isPlayerTurn) return;

    // === If a hand coin is selected, try to place ===
    if (selection.type === 'hand') {
      if (highlightedCells.includes(index)) {
        playSound('coinPlace', { volume: SFX_MAP.coinPlace.volume });
        const newState = placeFromHand(state, 'player', selection.coinNumber, index, playerCoin);
        endTurn({ ...newState, turn: 'player' });
      } else {
        playSound('error', { volume: SFX_MAP.error.volume });
        setMessage('そこには置けません');
      }
      return;
    }

    // === If a board coin is selected, try to move ===
    if (selection.type === 'board') {
      // Tapping the same coin → deselect
      if (index === selection.boardIndex) {
        clearSelection();
        setMessage('コインを選んで配置 or タップして移動');
        return;
      }

      // Tapping a valid move target → move
      if (highlightedCells.includes(index)) {
        playSound('coinMove', { volume: SFX_MAP.coinMove.volume });
        const newState = moveOnBoard(state, selection.boardIndex, index);
        endTurn({ ...newState, turn: 'player' });
        return;
      }

      // Tapping another own coin → switch selection
      const topCoin = getTopCoin(board[index]);
      if (topCoin && topCoin.owner === 'player') {
        const moveTargets = getValidMoveTargets(board, index);
        if (moveTargets.length === 0) {
          setMessage('このコインは動かせません');
          return;
        }
        setSelection({ type: 'board', boardIndex: index });
        setHighlightedCells(moveTargets);
        setMessage('移動先をタップ');
        return;
      }

      setMessage('そこには移動できません');
      return;
    }

    // === Nothing selected → try selecting a board coin ===
    const topCoin = getTopCoin(board[index]);
    if (topCoin && topCoin.owner === 'player') {
      const moveTargets = getValidMoveTargets(board, index);
      if (moveTargets.length === 0) {
        setMessage('このコインは動かせません');
        return;
      }
      setSelection({ type: 'board', boardIndex: index });
      setHighlightedCells(moveTargets);
      setMessage('移動先をタップ');
    }
  };

  // ---- Game Over Effect ----
  useEffect(() => {
    if (winner && !active) {
      const timer = setTimeout(() => {
        onGameEnd(winner);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [winner, active, onGameEnd]);

  // ---- Reset ----
  const doReset = () => {
    setState(createInitialGame2State());
    clearSelection();
    setMessage('コインを選んで配置しよう');
    isProcessing.current = false;
  };

  const handleReset = () => {
    if (!isSubscriptionActive()) {
      Alert.alert(
        'プレミアム限定',
        '「最初から」はプレミアム会員限定の機能です。',
        [{ text: 'OK', style: 'cancel' }],
      );
      return;
    }
    doReset();
  };

  // ---- Build hand coin items for player ----
  const buildHandItems = (hand: Hand): { coinNumber: CoinNumber; handIndex: number }[] => {
    const items: { coinNumber: CoinNumber; handIndex: number }[] = [];
    let idx = 0;
    for (let i = 0; i < hand.count1; i++) {
      items.push({ coinNumber: 1, handIndex: idx++ });
    }
    for (let i = 0; i < hand.count2; i++) {
      items.push({ coinNumber: 2, handIndex: idx++ });
    }
    return items;
  };

  // ---- Render: Turn Indicator ----
  const renderTurnIndicator = () => {
    const isPlayer = turn === 'player' && phase !== 'gameOver';
    const turnColor = isPlayer ? COLORS.gold : COLORS.blue;
    const turnText = phase === 'gameOver'
      ? '試合終了'
      : isPlayer
      ? 'あなたのターン'
      : 'CPUのターン';

    return (
      <View style={[styles.turnIndicator, { borderColor: turnColor }]}>
        <View style={[styles.turnDot, { backgroundColor: turnColor }]} />
        <Text style={[styles.turnText, { color: turnColor }]}>{turnText}</Text>
      </View>
    );
  };

  // ---- Render: CPU Hand (compact, info only) ----
  const renderCpuHand = () => (
    <View style={styles.cpuHandRow}>
      <Text style={styles.cpuHandLabel}>CPU</Text>
      <View style={styles.cpuHandCoins}>
        {cpuHand.count1 > 0 && (
          <View style={styles.cpuCoinBadge}>
            <CoinStack coinType={cpuCoin} coinNumber={1} owner="cpu" size={24} />
            <Text style={styles.cpuCoinCount}>x{cpuHand.count1}</Text>
          </View>
        )}
        {cpuHand.count2 > 0 && (
          <View style={styles.cpuCoinBadge}>
            <CoinStack coinType={cpuCoin} coinNumber={2} owner="cpu" size={24} />
            <Text style={styles.cpuCoinCount}>x{cpuHand.count2}</Text>
          </View>
        )}
        {cpuHand.count1 === 0 && cpuHand.count2 === 0 && (
          <Text style={styles.cpuCoinCount}>手持ちなし</Text>
        )}
      </View>
    </View>
  );

  // ---- Render: Board ----
  const renderBoard = () => {
    // Check if a board coin is selected to show it highlighted
    const selectedBoardIdx = selection.type === 'board' ? selection.boardIndex : -1;

    return (
      <View style={styles.boardContainer}>
        <View style={styles.boardGrid}>
          {board.map((cell, i) => {
            const isSelected = i === selectedBoardIdx;
            return (
              <StackCellView
                key={i}
                cell={cell}
                index={i}
                onPress={handleCellPress}
                highlighted={highlightedCells.includes(i) || isSelected}
                isWinCell={winLine ? winLine.includes(i) : false}
                disabled={false}
              />
            );
          })}
        </View>
      </View>
    );
  };

  // ---- Render: Player Hand (big tappable coins) ----
  const renderPlayerHand = () => {
    const items = buildHandItems(playerHand);
    const hasCoins = items.length > 0;
    const canMoveOnBoard = canMove(state, 'player');

    return (
      <View style={styles.playerHandSection}>
        <Text style={styles.playerHandLabel}>あなたの手持ち</Text>
        <View style={styles.playerHandRow}>
          {hasCoins ? (
            items.map((item) => {
              const isSelected =
                selection.type === 'hand' &&
                selection.coinNumber === item.coinNumber &&
                selection.handIndex === item.handIndex;

              return (
                <TouchableOpacity
                  key={`hand-${item.handIndex}`}
                  onPress={() => handleHandCoinTap(item.coinNumber, item.handIndex)}
                  activeOpacity={0.7}
                  style={[
                    styles.handCoinBtn,
                    isSelected && styles.handCoinBtnSelected,
                  ]}
                >
                  <CoinStack
                    coinType={playerCoin}
                    coinNumber={item.coinNumber}
                    owner="player"
                    size={HAND_COIN_SIZE}
                  />
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={styles.noCoinsText}>
              {canMoveOnBoard ? 'ボード上のコインをタップして移動' : '手持ちなし'}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{'< 戻る'}</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>一騎打ち</Text>
        <Text style={styles.difficultyLabel}>
          {difficulty === 'hard' ? 'つよい' : 'ふつう'}
        </Text>
      </View>

      {/* Turn Indicator */}
      {renderTurnIndicator()}

      {/* CPU Hand (compact) */}
      {renderCpuHand()}

      {/* Message */}
      <View style={styles.messageBox}>
        <Text style={styles.messageText}>{message}</Text>
      </View>

      {/* Board */}
      {renderBoard()}

      {/* Player Hand (big tappable coins) */}
      {renderPlayerHand()}

      {/* Game Over Overlay */}
      {winner && (
        <View style={styles.overlay}>
          <View style={styles.resultBox}>
            <Text
              style={[
                styles.resultText,
                winner === 'cpu' && { color: '#ff4444' },
                winner === 'draw' && { color: COLORS.blue },
              ]}
            >
              {winner === 'player'
                ? '勝利!'
                : winner === 'cpu'
                ? '敗北...'
                : '引き分け'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ========== CONSTANTS ==========
const BOARD_SIZE = Math.min(SIZES.screenWidth - 24, 340);
const HAND_COIN_SIZE = 52;

// ========== STYLES ==========

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    paddingBottom: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  backBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  title: {
    color: COLORS.gold,
    fontSize: 22,
    ...FONTS.heavy,
  },
  difficultyLabel: {
    position: 'absolute',
    right: 16,
    color: COLORS.textSecondary,
    fontSize: 12,
  },

  // Turn Indicator
  turnIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 4,
    marginBottom: 6,
  },
  turnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  turnText: {
    fontSize: 13,
    ...FONTS.bold,
  },

  // CPU Hand
  cpuHandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  cpuHandLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    ...FONTS.bold,
  },
  cpuHandCoins: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  cpuCoinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cpuCoinCount: {
    color: COLORS.textMuted,
    fontSize: 11,
  },

  // Message
  messageBox: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  messageText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    ...FONTS.bold,
  },

  // Board
  boardContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    width: BOARD_SIZE,
    height: BOARD_SIZE,
  },
  boardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  // Player Hand
  playerHandSection: {
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    flex: 1,
    justifyContent: 'center',
  },
  playerHandLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 8,
    ...FONTS.bold,
  },
  playerHandRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  handCoinBtn: {
    padding: 8,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  handCoinBtnSelected: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(255,215,0,0.15)',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  noCoinsText: {
    color: COLORS.textMuted,
    fontSize: 13,
    ...FONTS.bold,
  },

  // Game Over
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 16,
  },
  resetBtn: {
    backgroundColor: COLORS.gold,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  resetBtnText: {
    color: COLORS.bg,
    fontSize: 16,
    ...FONTS.heavy,
  },
  backBtn2: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
  },
  backBtn2Text: {
    color: COLORS.textSecondary,
    fontSize: 16,
    ...FONTS.bold,
  },
});
