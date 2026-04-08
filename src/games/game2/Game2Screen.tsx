// Game2Screen — 一騎打ち (One-on-One) full game screen

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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

interface Game2ScreenProps {
  playerCoin: CoinType;
  difficulty: 'normal' | 'hard';
  onGameEnd: (result: 'player' | 'cpu' | 'draw') => void;
  onBack?: () => void;
}

const CPU_DELAY = 800;

export default function Game2Screen({
  playerCoin,
  difficulty,
  onGameEnd,
  onBack,
}: Game2ScreenProps) {
  const insets = useSafeAreaInsets();
  const cpuCoin = CPU_COIN_MAP[playerCoin];

  const [state, setState] = useState<Game2State>(createInitialGame2State);
  const [highlightedCells, setHighlightedCells] = useState<number[]>([]);
  const [message, setMessage] = useState<string>('あなたのターン');

  const isProcessing = useRef(false);

  // ---- Derived ----
  const {
    board,
    turn,
    phase,
    playerHand,
    cpuHand,
    selectedAction,
    selectedCoinNumber,
    selectedBoardIndex,
    winner,
    winLine,
    active,
  } = state;

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
        setMessage(winResult.winner === 'player' ? 'あなたの勝ち!' : 'CPUの勝ち...');
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
        setMessage(nextTurn === 'player' ? 'あなたは動けない! CPUのターン' : 'CPUは動けない! あなたのターン');
      } else {
        setState(tempState);
        setHighlightedCells([]);
        setMessage(nextTurn === 'player' ? 'あなたのターン' : 'CPU思考中...');
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
        // CPU can't move — game should already handle this
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

  // ---- Action Selection ----
  const handleSelectAction = (actionType: ActionType) => {
    if (phase !== 'selectAction' || turn !== 'player') return;

    if (actionType === 'place') {
      if (!canPlace(state, 'player')) {
        setMessage('配置できるコインがありません');
        return;
      }
      setState(s => ({ ...s, selectedAction: 'place', phase: 'selectHandCoin' }));
      setMessage('置くコインを選んでください');
    } else {
      if (!canMove(state, 'player')) {
        setMessage('動かせるコインがありません');
        return;
      }
      setState(s => ({ ...s, selectedAction: 'move', phase: 'selectBoardCoin' }));
      const movable = getMovableCoins(board, 'player');
      setHighlightedCells(movable);
      setMessage('動かすコインを選んでください (お手付き注意!)');
    }
  };

  // ---- Select Hand Coin ----
  const handleSelectHandCoin = (coinNumber: CoinNumber) => {
    if (phase !== 'selectHandCoin') return;
    const count = coinNumber === 1 ? playerHand.count1 : playerHand.count2;
    if (count <= 0) {
      setMessage(`${coinNumber}のコインがありません`);
      return;
    }

    const validTargets = getValidPlacements(board, coinNumber);
    if (validTargets.length === 0) {
      setMessage(`${coinNumber}を置ける場所がありません`);
      return;
    }

    setState(s => ({ ...s, selectedCoinNumber: coinNumber, phase: 'selectTarget' }));
    setHighlightedCells(validTargets);
    setMessage('置く場所を選んでください');
  };

  // ---- Board Cell Press ----
  const handleCellPress = (index: number) => {
    if (!active || turn !== 'player') return;

    // Phase: selectTarget (placing from hand)
    if (phase === 'selectTarget' && selectedCoinNumber !== null) {
      if (!highlightedCells.includes(index)) {
        setMessage('そこには置けません');
        return;
      }
      const newState = placeFromHand(state, 'player', selectedCoinNumber, index, playerCoin);
      endTurn({ ...newState, turn: 'player' });
      return;
    }

    // Phase: selectBoardCoin (choosing which coin to move)
    if (phase === 'selectBoardCoin') {
      if (!highlightedCells.includes(index)) {
        setMessage('自分の上面コインを選んでください');
        return;
      }
      // Touch rule: once selected, must move
      const moveTargets = getValidMoveTargets(board, index);
      if (moveTargets.length === 0) {
        setMessage('このコインは動かせません (行き先なし)');
        return;
      }
      setState(s => ({
        ...s,
        selectedBoardIndex: index,
        phase: 'selectTarget',
      }));
      setHighlightedCells(moveTargets);
      setMessage('移動先を選んでください (キャンセル不可)');
      return;
    }

    // Phase: selectTarget (moving on board)
    if (phase === 'selectTarget' && selectedBoardIndex !== null) {
      if (!highlightedCells.includes(index)) {
        setMessage('そこには移動できません');
        return;
      }
      const newState = moveOnBoard(state, selectedBoardIndex, index);
      endTurn({ ...newState, turn: 'player' });
      return;
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
  const handleReset = () => {
    setState(createInitialGame2State());
    setHighlightedCells([]);
    setMessage('あなたのターン');
    isProcessing.current = false;
  };

  // ---- Render Helpers ----
  const renderHandCoin = (
    coinNumber: CoinNumber,
    count: number,
    coinType: CoinType,
    isPlayer: boolean,
  ) => {
    const isSelectable = isPlayer && phase === 'selectHandCoin' && count > 0;
    const isSelected = isPlayer && selectedCoinNumber === coinNumber && phase === 'selectTarget';

    return (
      <TouchableOpacity
        key={`hand-${isPlayer ? 'p' : 'c'}-${coinNumber}`}
        onPress={() => isSelectable && handleSelectHandCoin(coinNumber)}
        disabled={!isSelectable}
        style={[
          styles.handCoinContainer,
          isSelected && styles.handCoinSelected,
          !isSelectable && isPlayer && styles.handCoinDisabled,
        ]}
      >
        <CoinStack
          coinType={coinType}
          coinNumber={coinNumber}
          owner={isPlayer ? 'player' : 'cpu'}
          size={SIZES.coinSizeSmall}
          dimmed={count === 0}
        />
        <Text style={styles.handCount}>x{count}</Text>
      </TouchableOpacity>
    );
  };

  const renderHand = (hand: Hand, coinType: CoinType, label: string, isPlayer: boolean) => (
    <View style={styles.handSection}>
      <Text style={styles.handLabel}>{label}</Text>
      <View style={styles.handRow}>
        {renderHandCoin(1, hand.count1, coinType, isPlayer)}
        {renderHandCoin(2, hand.count2, coinType, isPlayer)}
      </View>
    </View>
  );

  const renderBoard = () => (
    <View style={[styles.board, { width: SIZES.boardSize, height: SIZES.boardSize }]}>
      <View style={styles.boardGrid}>
        {board.map((cell, i) => (
          <StackCellView
            key={i}
            cell={cell}
            index={i}
            onPress={handleCellPress}
            highlighted={highlightedCells.includes(i)}
            isWinCell={winLine ? winLine.includes(i) : false}
            disabled={!active || turn !== 'player' || (phase !== 'selectTarget' && phase !== 'selectBoardCoin')}
          />
        ))}
      </View>
    </View>
  );

  const renderActionButtons = () => {
    if (phase !== 'selectAction' || turn !== 'player') return null;
    const placeable = canPlace(state, 'player');
    const moveable = canMove(state, 'player');

    return (
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, !placeable && styles.actionBtnDisabled]}
          onPress={() => handleSelectAction('place')}
          disabled={!placeable}
        >
          <Text style={styles.actionBtnText}>配置</Text>
          <Text style={styles.actionBtnSub}>手持ちから置く</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, !moveable && styles.actionBtnDisabled]}
          onPress={() => handleSelectAction('move')}
          disabled={!moveable}
        >
          <Text style={styles.actionBtnText}>移動</Text>
          <Text style={styles.actionBtnSub}>ボードで動かす</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
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

      {/* CPU Hand */}
      {renderHand(cpuHand, cpuCoin, `CPU (${COINS[cpuCoin].emoji})`, false)}

      {/* Message */}
      <View style={styles.messageBox}>
        <Text style={styles.messageText}>{message}</Text>
      </View>

      {/* Board */}
      {renderBoard()}

      {/* Action Buttons */}
      {renderActionButtons()}

      {/* Player Hand */}
      {renderHand(playerHand, playerCoin, `あなた (${COINS[playerCoin].emoji})`, true)}

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
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetBtnText}>もう一度</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ========== STYLES ==========

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 8,
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

  // Hand
  handSection: {
    alignItems: 'center',
    marginVertical: 6,
  },
  handLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  handRow: {
    flexDirection: 'row',
    gap: 16,
  },
  handCoinContainer: {
    alignItems: 'center',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  handCoinSelected: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(255,215,0,0.1)',
  },
  handCoinDisabled: {
    opacity: 0.5,
  },
  handCount: {
    color: COLORS.textPrimary,
    fontSize: 12,
    marginTop: 2,
    ...FONTS.bold,
  },

  // Message
  messageBox: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginVertical: 6,
  },
  messageText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    textAlign: 'center',
    ...FONTS.bold,
  },

  // Board
  board: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  boardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 10,
  },
  actionBtn: {
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderColor: COLORS.gold,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    minWidth: 110,
  },
  actionBtnDisabled: {
    opacity: 0.35,
    borderColor: COLORS.textMuted,
  },
  actionBtnText: {
    color: COLORS.gold,
    fontSize: 16,
    ...FONTS.heavy,
  },
  actionBtnSub: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 2,
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
});
