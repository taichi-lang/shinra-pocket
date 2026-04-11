// === Online Game Screen — Generic Wrapper ===
// Initially targets Game1 (3x3 coin placement/move) but designed for any game.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../utils/theme';
import { useGameSocket } from './useGameSocket';
import { CellState, CoinType, COINS, WIN_LINES } from '../game/types';
import type { MatchState } from './types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type ParamList = {
  OnlineGame: {
    coin: CoinType;
    roomId: string;
    playerId: string;
    displayName?: string;
    countryFlag?: string;
    opponentDisplayName?: string;
    opponentCountryFlag?: string;
  };
  Result: { result: 'player' | 'cpu' | 'draw' | 'timeout'; coin: CoinType; mode: 'cpu' | 'online' };
  Menu: undefined;
};

type Props = NativeStackScreenProps<ParamList, 'OnlineGame'>;

export default function OnlineGameScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const {
    coin,
    roomId,
    playerId,
    displayName: myDisplayName = 'あなた',
    countryFlag: myFlag = '',
    opponentDisplayName = 'Opponent',
    opponentCountryFlag: oppFlag = '',
  } = route.params;
  const coinInfo = COINS[coin];

  const {
    connectionState,
    matchState,
    gameResult,
    sendMove,
    surrender,
    disconnect,
    error,
  } = useGameSocket({ autoConnect: false }); // already connected from lobby

  // Local state for optimistic UI
  const [selectedCell, setSelectedCell] = useState<number | null>(null);

  const isMyTurn = matchState?.currentTurn === playerId;
  const phase = matchState?.phase ?? 'place';
  const board = matchState?.board ?? Array(9).fill(null);
  const myPlaced = matchState?.playerPlaced?.[playerId] ?? 0;
  const winLine = matchState?.winLine ?? null;

  // --- Determine cell ownership display ---
  const getCellOwner = useCallback(
    (cell: CellState): 'me' | 'opponent' | null => {
      if (cell === 'player' || cell === playerId) return 'me';
      if (cell === 'cpu' || cell === 'opponent') return 'opponent';
      if (cell !== null && cell !== playerId) return 'opponent';
      return null;
    },
    [playerId]
  );

  // --- Handle cell press ---
  const handleCellPress = useCallback(
    (index: number) => {
      if (!isMyTurn || !matchState?.currentTurn) return;

      if (phase === 'place') {
        if (board[index] !== null) return;
        sendMove({ gameId: 'game1', type: 'place', cellIndex: index });
        setSelectedCell(null);
      } else {
        // Move phase
        const owner = getCellOwner(board[index]);
        if (selectedCell === null) {
          // Select own coin
          if (owner === 'me') {
            setSelectedCell(index);
          }
        } else {
          if (index === selectedCell) {
            // Deselect
            setSelectedCell(null);
          } else if (owner === 'me') {
            // Switch selection
            setSelectedCell(index);
          } else if (board[index] === null) {
            // Move to any empty cell
            sendMove({
              gameId: 'game1',
              type: 'move',
              cellIndex: index,
              fromIndex: selectedCell,
            });
            setSelectedCell(null);
          }
        }
      }
    },
    [isMyTurn, phase, board, selectedCell, matchState, sendMove, getCellOwner]
  );

  // --- Handle game result ---
  useEffect(() => {
    if (gameResult) {
      let result: 'player' | 'cpu' | 'draw' | 'timeout';
      if (gameResult.reason === 'timeout') {
        result = 'timeout';
      } else if (gameResult.winner === null || gameResult.reason === 'draw') {
        result = 'draw';
      } else if (gameResult.winner === playerId) {
        result = 'player';
      } else {
        result = 'cpu'; // show as loss
      }

      // Small delay so player can see final state
      const timer = setTimeout(() => {
        navigation.replace('Result', { result, coin, mode: 'online' });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameResult, playerId, coin, navigation]);

  // --- Handle disconnect ---
  useEffect(() => {
    if (connectionState === 'disconnected' && !gameResult) {
      Alert.alert('Disconnected', 'Connection lost.', [
        { text: 'OK', onPress: () => navigation.replace('Menu') },
      ]);
    }
  }, [connectionState, gameResult, navigation]);

  // --- Surrender handler ---
  const handleSurrender = useCallback(() => {
    Alert.alert('Surrender', 'Are you sure you want to give up?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Surrender',
        style: 'destructive',
        onPress: () => {
          surrender();
        },
      },
    ]);
  }, [surrender]);

  // --- Win line set for highlighting ---
  const winLineSet = useMemo(
    () => new Set(winLine ?? []),
    [winLine]
  );

  // --- Render cell ---
  const renderCell = (index: number) => {
    const owner = getCellOwner(board[index]);
    const isSelected = selectedCell === index;
    const isWin = winLineSet.has(index);
    const isValidTarget =
      phase === 'move' &&
      selectedCell !== null &&
      board[index] === null;

    const cellStyle: any[] = [styles.cell];
    if (isSelected) cellStyle.push(styles.cellSelected);
    if (isWin) cellStyle.push(styles.cellWin);
    if (isValidTarget) cellStyle.push(styles.cellValidTarget);

    let content: React.ReactNode = null;
    if (owner === 'me') {
      content = <Text style={styles.cellCoinMe}>{coinInfo.emoji}</Text>;
    } else if (owner === 'opponent') {
      content = <Text style={styles.cellCoinOpponent}>{'*'}</Text>;
    }

    return (
      <TouchableOpacity
        key={index}
        style={cellStyle}
        onPress={() => handleCellPress(index)}
        activeOpacity={0.7}
        disabled={!isMyTurn}
      >
        {content}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      {/* Status bar */}
      <View style={styles.statusBar}>
        <Text style={styles.phaseText}>
          {phase === 'place' ? 'PLACE PHASE' : 'MOVE PHASE'}
        </Text>
        <Text style={[styles.turnText, isMyTurn ? styles.turnMy : styles.turnOpponent]}>
          {isMyTurn ? 'YOUR TURN' : "OPPONENT'S TURN"}
        </Text>
      </View>

      {/* Board */}
      <View style={styles.boardContainer}>
        <View style={styles.board}>
          {[0, 1, 2].map((row) => (
            <View key={row} style={styles.row}>
              {[0, 1, 2].map((col) => renderCell(row * 3 + col))}
            </View>
          ))}
        </View>
      </View>

      {/* Player Info */}
      <View style={styles.playerInfoRow}>
        <View style={styles.playerSide}>
          {myFlag ? <Text style={styles.flagEmoji}>{myFlag}</Text> : null}
          <Text style={styles.playerName}>{myDisplayName}</Text>
          <Text style={styles.playerCoinEmoji}>{coinInfo.emoji}</Text>
        </View>
        <Text style={styles.vsText}>VS</Text>
        <View style={styles.playerSide}>
          {oppFlag ? <Text style={styles.flagEmoji}>{oppFlag}</Text> : null}
          <Text style={styles.playerName}>{opponentDisplayName}</Text>
          <Text style={styles.playerCoinEmoji}>{'*'}</Text>
        </View>
      </View>

      {/* Connection / Error */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {/* Surrender */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.surrenderButton} onPress={handleSurrender}>
          <Text style={styles.surrenderText}>SURRENDER</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const CELL_SIZE = SIZES.cellSize;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  statusBar: {
    alignItems: 'center',
    marginBottom: 24,
  },
  phaseText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginBottom: 4,
  },
  turnText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  turnMy: {
    color: COLORS.gold,
  },
  turnOpponent: {
    color: COLORS.textSecondary,
  },
  boardContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  board: {
    width: SIZES.boardSize,
    height: SIZES.boardSize,
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 8,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellSelected: {
    borderColor: COLORS.gold,
    borderWidth: 2,
    backgroundColor: 'rgba(255,215,0,0.08)',
  },
  cellWin: {
    borderColor: COLORS.gold,
    borderWidth: 2,
    backgroundColor: 'rgba(255,215,0,0.15)',
  },
  cellValidTarget: {
    borderColor: COLORS.blue,
    borderWidth: 1,
    borderStyle: 'solid',
    backgroundColor: 'rgba(136,170,255,0.06)',
  },
  cellCoinMe: {
    fontSize: 28,
  },
  cellCoinOpponent: {
    fontSize: 28,
    color: COLORS.red,
  },
  playerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  playerSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flagEmoji: {
    fontSize: 20,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gold,
  },
  playerCoinEmoji: {
    fontSize: 18,
    marginLeft: 2,
  },
  vsText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.red,
    textAlign: 'center',
    marginBottom: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  surrenderButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.red,
    backgroundColor: 'rgba(255,68,85,0.08)',
  },
  surrenderText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.red,
    letterSpacing: 1,
  },
});
