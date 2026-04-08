// StackCellView — A single board cell showing stacked coins

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../../../utils/theme';
import { StackCell } from '../game2Types';
import CoinStack from './CoinStack';

interface StackCellViewProps {
  cell: StackCell;
  index: number;
  onPress: (index: number) => void;
  highlighted: boolean;
  isWinCell: boolean;
  disabled: boolean;
}

export default function StackCellView({
  cell,
  index,
  onPress,
  highlighted,
  isWinCell,
  disabled,
}: StackCellViewProps) {
  const hasBottom = cell.bottom !== null;
  const hasTop = cell.top !== null;
  const isEmpty = !hasBottom && !hasTop;
  const cellSize = SIZES.cellSize;

  return (
    <TouchableOpacity
      onPress={() => onPress(index)}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.cell,
        {
          width: cellSize,
          height: cellSize,
          borderColor: isWinCell
            ? COLORS.gold
            : highlighted
            ? COLORS.orange
            : COLORS.cardBorder,
          backgroundColor: isWinCell
            ? 'rgba(255,215,0,0.15)'
            : highlighted
            ? 'rgba(255,140,0,0.12)'
            : COLORS.cardBg,
          borderWidth: isWinCell ? 2.5 : highlighted ? 2 : 1,
        },
      ]}
    >
      {isEmpty && <View style={styles.emptyDot} />}

      {/* Bottom coin shadow hint (when stacked) */}
      {hasBottom && hasTop && (
        <View style={styles.bottomHint}>
          <CoinStack
            coinType={cell.bottom!.coinType}
            coinNumber={cell.bottom!.number}
            owner={cell.bottom!.owner}
            size={cellSize * 0.35}
            dimmed
          />
        </View>
      )}

      {/* Main visible coin (top if stacked, else bottom) */}
      {hasBottom && !hasTop && (
        <CoinStack
          coinType={cell.bottom!.coinType}
          coinNumber={cell.bottom!.number}
          owner={cell.bottom!.owner}
          size={cellSize * 0.7}
        />
      )}
      {hasTop && (
        <CoinStack
          coinType={cell.top!.coinType}
          coinNumber={cell.top!.number}
          owner={cell.top!.owner}
          size={cellSize * 0.7}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cell: {
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 3,
    position: 'relative',
  },
  emptyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bottomHint: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    opacity: 0.5,
  },
});
