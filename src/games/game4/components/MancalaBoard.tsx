// ============================================================
// Game4: パタパタ — Mancala Board Component
// ============================================================

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../../../utils/theme';
import { BoardState, Player } from '../game4Types';
import { Pit } from './Pit';

interface MancalaBoardProps {
  board: BoardState;
  currentPlayer: Player;
  /** Which side the human is playing (for orientation) */
  humanSide: Player;
  /** Whether input is allowed right now */
  inputEnabled: boolean;
  /** Called when a pit is selected. pitIndex = 0-2 */
  onSelectPit: (player: Player, pitIndex: number) => void;
  /** Slot that was just updated (for highlight animation) */
  highlightSlot?: string | null;
}

const PIT_LABELS_A = ['A1', 'A2', 'A3'];
const PIT_LABELS_B = ['B1', 'B2', 'B3'];

export const MancalaBoard: React.FC<MancalaBoardProps> = ({
  board,
  currentPlayer,
  humanSide,
  inputEnabled,
  onSelectPit,
  highlightSlot,
}) => {
  const canTap = (player: Player, pitIndex: number): boolean => {
    if (!inputEnabled) return false;
    if (currentPlayer !== player) return false;
    const pits = player === 'A' ? board.a : board.b;
    return pits[pitIndex] > 0;
  };

  return (
    <View style={styles.container}>
      {/* B side (top row) — displayed right-to-left visually to mirror A */}
      <View style={styles.boardRow}>
        {/* Left goal pit */}
        <Pit
          coins={board.pitL}
          enabled={false}
          isGoal
          label="得点"
          highlight={highlightSlot === 'pitL'}
        />

        {/* Main board area */}
        <View style={styles.pitsArea}>
          {/* Top row: B1, B2, B3 */}
          <View style={styles.pitRow}>
            {board.b.map((coins, i) => (
              <Pit
                key={`b${i}`}
                coins={coins}
                enabled={canTap('B', i)}
                onPress={() => onSelectPit('B', i)}
                label={PIT_LABELS_B[i]}
                highlight={highlightSlot === `b${i}`}
              />
            ))}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Bottom row: A1, A2, A3 */}
          <View style={styles.pitRow}>
            {board.a.map((coins, i) => (
              <Pit
                key={`a${i}`}
                coins={coins}
                enabled={canTap('A', i)}
                onPress={() => onSelectPit('A', i)}
                label={PIT_LABELS_A[i]}
                highlight={highlightSlot === `a${i}`}
              />
            ))}
          </View>
        </View>

        {/* Right goal pit */}
        <Pit
          coins={board.pitR}
          enabled={false}
          isGoal
          label="得点"
          highlight={highlightSlot === 'pitR'}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  pitsArea: {
    marginHorizontal: 8,
  },
  pitRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 6,
    marginHorizontal: 12,
  },
});

export default MancalaBoard;
