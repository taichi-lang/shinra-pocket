import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { COLORS, SIZES } from '../../../utils/theme';
import { lightTap } from '../../../utils/haptics';
import type { CellState, CoinType } from '../../../game/types';
import Coin from './Coin';

interface CellProps {
  index: number;
  cellState: CellState;
  playerCoin: CoinType;
  cpuCoin: CoinType;
  isSelected: boolean;
  isValidTarget: boolean;
  isWinCell: boolean;
  onPress: (index: number) => void;
}

const Cell: React.FC<CellProps> = ({
  index,
  cellState,
  playerCoin,
  cpuCoin,
  isSelected,
  isValidTarget,
  isWinCell,
  onPress,
}) => {
  const cellSize = SIZES.cellSize;

  const getCoinType = (): CoinType | null => {
    if (cellState === 'player') return playerCoin;
    if (cellState === 'cpu') return cpuCoin;
    return null;
  };

  const coinType = getCoinType();

  let bgColor = COLORS.cardBg;
  if (isSelected) bgColor = 'rgba(255,215,0,0.15)';
  else if (isValidTarget) bgColor = 'rgba(136,170,255,0.12)';
  else if (isWinCell) bgColor = 'rgba(255,215,0,0.25)';

  let borderColor = COLORS.cardBorder;
  if (isSelected) borderColor = COLORS.gold;
  else if (isValidTarget) borderColor = COLORS.blue;
  else if (isWinCell) borderColor = COLORS.gold;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        lightTap();
        onPress(index);
      }}
      accessibilityLabel={`マス ${index + 1}`}
      accessibilityRole="button"
      style={[
        styles.cell,
        {
          width: cellSize,
          height: cellSize,
          backgroundColor: bgColor,
          borderColor,
        },
      ]}
    >
      {coinType ? (
        <Coin
          type={coinType}
          size={cellSize * 0.7}
          highlight={isSelected || isWinCell}
        />
      ) : isValidTarget ? (
        <View style={styles.validDot} />
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cell: {
    borderWidth: 1.5,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  validDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(136,170,255,0.4)',
  },
});

export default React.memo(Cell);
