import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../../../utils/theme';
import type { GamePhase } from '../../../game/types';

interface PhaseIndicatorProps {
  phase: GamePhase;
  playerPlaced: number;
  cpuPlaced: number;
  moveRound: number;
}

const PhaseIndicator: React.FC<PhaseIndicatorProps> = ({
  phase,
  playerPlaced,
  cpuPlaced,
  moveRound,
}) => {
  const isPlace = phase === 'place';

  return (
    <View style={styles.container}>
      <View style={[styles.badge, isPlace ? styles.badgePlace : styles.badgeMove]}>
        <Text style={styles.badgeText}>
          {isPlace ? '配置フェーズ' : '移動フェーズ'}
        </Text>
      </View>
      <Text style={styles.info}>
        {isPlace
          ? `あなた ${playerPlaced}/4　CPU ${cpuPlaced}/4`
          : `ラウンド ${moveRound}`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  badgePlace: {
    backgroundColor: 'rgba(255,140,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.4)',
  },
  badgeMove: {
    backgroundColor: 'rgba(136,170,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(136,170,255,0.4)',
  },
  badgeText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    ...FONTS.bold,
  },
  info: {
    color: COLORS.textSecondary,
    fontSize: 12,
    ...FONTS.regular,
  },
});

export default React.memo(PhaseIndicator);
