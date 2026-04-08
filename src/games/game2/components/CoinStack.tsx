// CoinStack — Visual representation of a single coin with number badge

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../../../utils/theme';
import { COINS, CoinType } from '../../../game/types';
import { CoinNumber, Player } from '../game2Types';

interface CoinStackProps {
  coinType: CoinType;
  coinNumber: CoinNumber;
  owner: Player;
  size?: number;
  dimmed?: boolean;
}

export default function CoinStack({
  coinType,
  coinNumber,
  owner,
  size = SIZES.coinSize,
  dimmed = false,
}: CoinStackProps) {
  const coinInfo = COINS[coinType];
  const [colorStart, colorEnd] = coinInfo.colors;

  return (
    <View
      style={[
        styles.coin,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colorEnd,
          borderColor: colorStart,
          borderWidth: 2,
          opacity: dimmed ? 0.4 : 1,
        },
      ]}
    >
      <Text style={[styles.emoji, { fontSize: size * 0.35 }]}>
        {coinInfo.emoji}
      </Text>
      <View
        style={[
          styles.numberBadge,
          {
            backgroundColor: colorStart,
            width: size * 0.38,
            height: size * 0.38,
            borderRadius: size * 0.19,
            right: -2,
            top: -2,
          },
        ]}
      >
        <Text style={[styles.numberText, { fontSize: size * 0.22 }]}>
          {coinNumber}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  coin: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  emoji: {
    textAlign: 'center',
  },
  numberBadge: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.3)',
  },
  numberText: {
    color: '#fff',
    fontWeight: '900',
    textAlign: 'center',
  },
});
