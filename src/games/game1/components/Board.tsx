import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SIZES } from '../../../utils/theme';
import type { CellState, CoinType } from '../../../game/types';
import Cell from './Cell';

interface BoardProps {
  board: CellState[];
  playerCoin: CoinType;
  cpuCoin: CoinType;
  selectedCell: number | null;
  validTargets: number[];
  winLine: number[] | null;
  onCellPress: (index: number) => void;
}

const Board: React.FC<BoardProps> = ({
  board,
  playerCoin,
  cpuCoin,
  selectedCell,
  validTargets,
  winLine,
  onCellPress,
}) => {
  const winCells = winLine ? new Set(winLine) : new Set<number>();
  const validSet = new Set(validTargets);

  return (
    <View style={styles.board}>
      {[0, 1, 2].map((row) => (
        <View key={row} style={styles.row}>
          {[0, 1, 2].map((col) => {
            const index = row * 3 + col;
            return (
              <Cell
                key={index}
                index={index}
                cellState={board[index]}
                playerCoin={playerCoin}
                cpuCoin={cpuCoin}
                isSelected={selectedCell === index}
                isValidTarget={validSet.has(index)}
                isWinCell={winCells.has(index)}
                onPress={onCellPress}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  board: {
    width: SIZES.boardSize,
    alignSelf: 'center',
    padding: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});

export default React.memo(Board);
