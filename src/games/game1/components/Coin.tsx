import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../../../utils/theme';
import { type CoinType, COINS } from '../../../game/types';

interface CoinProps {
  type: CoinType;
  size?: number;
  dimmed?: boolean;
  highlight?: boolean;
}

const Coin: React.FC<CoinProps> = ({
  type,
  size = SIZES.coinSize,
  dimmed = false,
  highlight = false,
}) => {
  const coinInfo = COINS[type];
  const borderColor = highlight ? COLORS.gold : 'rgba(255,255,255,0.2)';

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor,
          opacity: dimmed ? 0.4 : 1,
        },
      ]}
    >
      <LinearGradient
        colors={coinInfo.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          {
            width: size - 4,
            height: size - 4,
            borderRadius: (size - 4) / 2,
          },
        ]}
      >
        <Text style={[styles.emoji, { fontSize: size * 0.45 }]}>
          {coinInfo.emoji}
        </Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    textAlign: 'center',
  },
});

export default React.memo(Coin);
