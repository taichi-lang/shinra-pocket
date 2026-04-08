// ============================
// Game5: Piece Component (Coin-style)
// ============================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../../../utils/theme';
import { Piece as PieceData, PIECE_EMOJI, SIDE_EMOJI } from '../game5Types';

interface PieceProps {
  piece: PieceData;
  size?: number;
  selected?: boolean;
}

export const PieceView: React.FC<PieceProps> = ({
  piece,
  size = SIZES.coinSize,
  selected = false,
}) => {
  const isSun = piece.side === 'sun';
  const bgColor = isSun
    ? 'rgba(255, 180, 50, 0.9)'
    : 'rgba(100, 120, 200, 0.9)';
  const borderColor = isSun
    ? selected ? '#fff' : '#ffcc00'
    : selected ? '#fff' : '#8888ff';
  const sideEmoji = SIDE_EMOJI[piece.side];
  const typeEmoji = piece.type === 'king' ? '' : PIECE_EMOJI[piece.type];

  const label = piece.type === 'king'
    ? sideEmoji
    : `${sideEmoji}${typeEmoji}`;

  const fontSize = piece.type === 'king'
    ? size * 0.5
    : size * 0.32;

  return (
    <View
      style={[
        styles.coin,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
          borderColor: borderColor,
          borderWidth: selected ? 3 : 2,
          shadowColor: isSun ? '#ffaa00' : '#4466ff',
          shadowOpacity: selected ? 0.8 : 0.4,
          shadowRadius: selected ? 8 : 4,
          elevation: selected ? 8 : 4,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { fontSize, lineHeight: fontSize * 1.3 },
        ]}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  coin: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
  },
  label: {
    textAlign: 'center',
    color: '#fff',
  },
});

export default PieceView;
