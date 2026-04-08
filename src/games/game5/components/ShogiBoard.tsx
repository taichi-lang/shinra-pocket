// ============================
// Game5: 3x3 Shogi Board
// ============================

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../../../utils/theme';
import { Board, Position } from '../game5Types';
import PieceView from './Piece';

interface ShogiBoardProps {
  board: Board;
  selectedPos: Position | null;
  validMoves: Position[];
  onCellPress: (pos: Position) => void;
  flipped?: boolean; // flip board for moon player in local mode
}

function posIn(list: Position[], pos: Position): boolean {
  return list.some(p => p.row === pos.row && p.col === pos.col);
}

export const ShogiBoard: React.FC<ShogiBoardProps> = ({
  board,
  selectedPos,
  validMoves,
  onCellPress,
  flipped = false,
}) => {
  const cellSize = SIZES.boardSize / 3 - 4;

  // Row order: normally 2,1,0 (moon at top, sun at bottom)
  // Flipped: 0,1,2
  const rowOrder = flipped ? [0, 1, 2] : [2, 1, 0];
  const colOrder = flipped ? [2, 1, 0] : [0, 1, 2];

  return (
    <View style={[styles.board, { width: SIZES.boardSize, height: SIZES.boardSize }]}>
      {rowOrder.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {colOrder.map((col, ci) => {
            const pos: Position = { row, col };
            const cell = board[row][col];
            const isSelected =
              selectedPos !== null &&
              selectedPos.row === row &&
              selectedPos.col === col;
            const isValidTarget = posIn(validMoves, pos);

            return (
              <TouchableOpacity
                key={ci}
                style={[
                  styles.cell,
                  {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: isSelected
                      ? 'rgba(255, 215, 0, 0.25)'
                      : isValidTarget
                      ? 'rgba(100, 255, 100, 0.15)'
                      : 'rgba(200, 170, 120, 0.12)',
                    borderColor: isSelected
                      ? COLORS.gold
                      : isValidTarget
                      ? 'rgba(100, 255, 100, 0.5)'
                      : 'rgba(200, 170, 120, 0.3)',
                  },
                ]}
                onPress={() => onCellPress(pos)}
                activeOpacity={0.7}
              >
                {isValidTarget && !cell && (
                  <View style={styles.dot} />
                )}
                {cell && (
                  <PieceView
                    piece={cell}
                    size={cellSize * 0.78}
                    selected={isSelected}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  board: {
    borderWidth: 2,
    borderColor: 'rgba(200, 170, 120, 0.5)',
    borderRadius: 8,
    backgroundColor: 'rgba(60, 40, 20, 0.3)',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    margin: 2,
    borderWidth: 1,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(100, 255, 100, 0.4)',
  },
});

export default ShogiBoard;
