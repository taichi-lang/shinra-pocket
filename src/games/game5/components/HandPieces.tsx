// ============================
// Game5: Hand Pieces Display
// ============================

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES, FONTS } from '../../../utils/theme';
import { PieceType, Side, PIECE_EMOJI, SIDE_EMOJI } from '../game5Types';
import PieceView from './Piece';

interface HandPiecesProps {
  hand: PieceType[];
  side: Side;
  isActive: boolean;         // is it this side's turn?
  selectedPiece: PieceType | null;
  onPiecePress: (pieceType: PieceType) => void;
}

export const HandPieces: React.FC<HandPiecesProps> = ({
  hand,
  side,
  isActive,
  selectedPiece,
  onPiecePress,
}) => {
  const isSun = side === 'sun';
  const sideLabel = isSun ? '\u{2600}\u{FE0F} \u6301\u3061\u99D2' : '\u{1F319} \u6301\u3061\u99D2';

  // Group by type and count
  const counts: Partial<Record<PieceType, number>> = {};
  for (const pt of hand) {
    counts[pt] = (counts[pt] || 0) + 1;
  }
  const uniqueTypes = Object.keys(counts) as PieceType[];

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: isActive
            ? isSun ? 'rgba(255,200,0,0.5)' : 'rgba(100,120,255,0.5)'
            : 'rgba(255,255,255,0.1)',
        },
      ]}
    >
      <Text style={styles.label}>{sideLabel}</Text>
      <View style={styles.piecesRow}>
        {uniqueTypes.length === 0 ? (
          <Text style={styles.emptyText}>--</Text>
        ) : (
          uniqueTypes.map(pt => {
            const isSelected = selectedPiece === pt;
            const count = counts[pt]!;
            return (
              <TouchableOpacity
                key={pt}
                style={[
                  styles.pieceSlot,
                  isSelected && styles.pieceSlotSelected,
                ]}
                onPress={() => isActive && onPiecePress(pt)}
                disabled={!isActive}
                activeOpacity={0.7}
              >
                <PieceView
                  piece={{ type: pt, side }}
                  size={SIZES.coinSizeSmall}
                  selected={isSelected}
                />
                {count > 1 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>x{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginVertical: 4,
    minHeight: 50,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 13,
    ...FONTS.bold,
    marginRight: 10,
    width: 70,
  },
  piecesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  pieceSlot: {
    padding: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pieceSlotSelected: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(255,215,0,0.15)',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.red,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    ...FONTS.bold,
  },
});

export default HandPieces;
