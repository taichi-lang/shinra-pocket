// Game6: Number Link -- Full playable screen
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { COLORS, SIZES, FONTS } from '../../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Game6State,
  Difficulty,
  GameMode,
  Grid,
  DIFFICULTY_CONFIGS,
  SCORE_TABLE,
} from './game6Types';
import {
  createInitialState,
  placeNumber,
  selectCell,
  submitAnswer,
  useHint,
  advanceToNextPuzzle,
  tickTimer,
  getRowSum,
  getColSum,
  isGridComplete,
} from './game6Logic';

// ============================================================
// Sub-components
// ============================================================

interface CellProps {
  cell: Grid[number];
  index: number;
  isSelected: boolean;
  target: number;
  onPress: (index: number) => void;
}

const GridCell: React.FC<CellProps> = React.memo(
  ({ cell, index, isSelected, onPress }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePress = () => {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 60,
          useNativeDriver: true,
        }),
      ]).start();
      onPress(index);
    };

    const isPrefilled = cell.kind === 'prefilled';
    const isEmpty = cell.value === 0;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handlePress}
        disabled={isPrefilled}
      >
        <Animated.View
          style={[
            styles.cell,
            isPrefilled && styles.cellPrefilled,
            isSelected && styles.cellSelected,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Text
            style={[
              styles.cellText,
              isPrefilled && styles.cellTextPrefilled,
              isEmpty && styles.cellTextEmpty,
            ]}
          >
            {isEmpty ? '' : String(cell.value)}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    );
  }
);

// ============================================================
// Number Pad
// ============================================================

interface NumberPadProps {
  range: [number, number];
  onSelect: (n: number) => void;
  onClear: () => void;
}

const NumberPad: React.FC<NumberPadProps> = ({ range, onSelect, onClear }) => {
  const [min, max] = range;
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  return (
    <View style={styles.padContainer}>
      <View style={styles.padRow}>
        {numbers.map(n => (
          <TouchableOpacity
            key={n}
            style={styles.padButton}
            onPress={() => onSelect(n)}
            activeOpacity={0.6}
          >
            <Text style={styles.padButtonText}>{n}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.padButton, styles.padButtonClear]}
          onPress={onClear}
          activeOpacity={0.6}
        >
          <Text style={styles.padButtonText}>消す</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ============================================================
// Sum indicators
// ============================================================

const SumIndicator: React.FC<{ current: number; target: number; label: string }> = ({
  current,
  target,
  label,
}) => {
  const isCorrect = current === target;
  return (
    <View style={[styles.sumBadge, isCorrect && styles.sumBadgeCorrect]}>
      <Text style={[styles.sumText, isCorrect && styles.sumTextCorrect]}>
        {current > 0 ? current : '-'}
      </Text>
    </View>
  );
};

// ============================================================
// Timer bar
// ============================================================

const TimerBar: React.FC<{ timeLeft: number; maxTime: number }> = ({
  timeLeft,
  maxTime,
}) => {
  const ratio = Math.max(0, timeLeft / maxTime);
  const color =
    ratio > 0.5 ? COLORS.gold : ratio > 0.25 ? COLORS.orange : COLORS.red;

  return (
    <View style={styles.timerBarBg}>
      <View style={[styles.timerBarFill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      <Text style={styles.timerText}>{timeLeft}s</Text>
    </View>
  );
};

// ============================================================
// Mode selection screen
// ============================================================

interface ModeSelectProps {
  onStart: (mode: GameMode, difficulty: Difficulty) => void;
  onBack?: () => void;
}

const ModeSelect: React.FC<ModeSelectProps> = ({ onStart, onBack }) => {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<GameMode>('puzzle');

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{'< 戻る'}</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.title}>Number Link</Text>
      <Text style={styles.subtitle}>3x3 たし算パズル</Text>

      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'puzzle' && styles.modeBtnActive]}
          onPress={() => setMode('puzzle')}
        >
          <Text style={[styles.modeBtnText, mode === 'puzzle' && styles.modeBtnTextActive]}>
            パズルモード
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'timeAttack' && styles.modeBtnActive]}
          onPress={() => setMode('timeAttack')}
        >
          <Text style={[styles.modeBtnText, mode === 'timeAttack' && styles.modeBtnTextActive]}>
            タイムアタック
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.diffLabel}>むずかしさ</Text>
      {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => {
        const diffNames: Record<Difficulty, string> = { easy: 'かんたん', normal: 'ふつう', hard: 'むずかしい' };
        return (
        <TouchableOpacity
          key={d}
          style={styles.diffBtn}
          onPress={() => onStart(mode, d)}
        >
          <Text style={styles.diffBtnText}>
            {diffNames[d]}
          </Text>
          <Text style={styles.diffBtnSub}>
            目標: {DIFFICULTY_CONFIGS[d].target} | 範囲: {DIFFICULTY_CONFIGS[d].numberRange[0]}-{DIFFICULTY_CONFIGS[d].numberRange[1]}
          </Text>
        </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ============================================================
// Game Over screen
// ============================================================

interface GameOverProps {
  state: Game6State;
  onRestart: () => void;
}

const GameOverScreen: React.FC<GameOverProps> = ({ state, onRestart }) => {
  const insets = useSafeAreaInsets();
  return (
  <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
    <Text style={styles.title}>ゲームオーバー</Text>
    <View style={styles.resultBox}>
      <Text style={styles.resultLabel}>最終スコア</Text>
      <Text style={styles.resultValue}>{state.score}</Text>
      <Text style={styles.resultLabel}>クリアしたパズル</Text>
      <Text style={styles.resultValue}>{state.puzzlesSolved}</Text>
      <Text style={styles.resultLabel}>最高コンボ</Text>
      <Text style={styles.resultValue}>x{state.combo}</Text>
    </View>
    <TouchableOpacity style={styles.actionBtn} onPress={onRestart}>
      <Text style={styles.actionBtnText}>もう一度</Text>
    </TouchableOpacity>
  </View>
  );
};

// ============================================================
// Main Game6Screen
// ============================================================

interface Game6ScreenProps {
  onBack?: () => void;
}

const Game6Screen: React.FC<Game6ScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<Game6State | null>(null);

  // Timer
  useEffect(() => {
    if (!state || state.phase !== 'playing') return;
    const id = setInterval(() => {
      setState(prev => (prev ? tickTimer(prev) : prev));
    }, 1000);
    return () => clearInterval(id);
  }, [state?.phase]);

  const handleStart = useCallback((mode: GameMode, difficulty: Difficulty) => {
    setState(createInitialState(mode, difficulty));
    setStarted(true);
  }, []);

  const handleRestart = useCallback(() => {
    setStarted(false);
    setState(null);
  }, []);

  const handleCellPress = useCallback((index: number) => {
    setState(prev => (prev ? selectCell(prev, index) : prev));
  }, []);

  const handleNumberSelect = useCallback((n: number) => {
    setState(prev => {
      if (!prev || prev.selectedCell === null) return prev;
      return placeNumber(prev, prev.selectedCell, n);
    });
  }, []);

  const handleClear = useCallback(() => {
    setState(prev => {
      if (!prev || prev.selectedCell === null) return prev;
      return placeNumber(prev, prev.selectedCell, 0);
    });
  }, []);

  const handleSubmit = useCallback(() => {
    setState(prev => (prev ? submitAnswer(prev) : prev));
  }, []);

  const handleHint = useCallback(() => {
    setState(prev => (prev ? useHint(prev) : prev));
  }, []);

  const handleNext = useCallback(() => {
    setState(prev => (prev ? advanceToNextPuzzle(prev) : prev));
  }, []);

  const handleRetryPuzzle = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      // Reset grid to original puzzle state
      const resetGrid = prev.puzzle.grid.map(c => ({ ...c })) as Grid;
      return { ...prev, grid: resetGrid, phase: 'playing' as const, selectedCell: null, hintsUsed: 0 };
    });
  }, []);

  // --- Render ---

  if (!started || !state) {
    return <ModeSelect onStart={handleStart} onBack={onBack} />;
  }

  if (state.phase === 'gameover') {
    return <GameOverScreen state={state} onRestart={handleRestart} />;
  }

  const config = DIFFICULTY_CONFIGS[state.difficulty];
  const maxTime =
    state.mode === 'timeAttack'
      ? SCORE_TABLE.timeAttackTotal
      : config.timeLimit;
  const gridFull = isGridComplete(state.grid);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.gameBackBtn}>
              <Text style={styles.backBtnText}>{'< 戻る'}</Text>
            </TouchableOpacity>
          )}
          {state.mode === 'puzzle' && (
            <Text style={styles.livesText}>
              {'♥'.repeat(state.lives)}{'♡'.repeat(SCORE_TABLE.initialLives - state.lives)}
            </Text>
          )}
          <Text style={styles.comboText}>x{state.combo}</Text>
        </View>
        <Text style={styles.scoreText}>{state.score} スコア</Text>
      </View>

      <TimerBar timeLeft={state.timeLeft} maxTime={maxTime} />

      {/* Target */}
      <View style={styles.targetContainer}>
        <Text style={styles.targetLabel}>目標合計</Text>
        <Text style={styles.targetValue}>{state.puzzle.target}</Text>
        <Text style={styles.difficultyBadge}>
          {{ easy: 'かんたん', normal: 'ふつう', hard: 'むずかしい' }[state.difficulty]} | #{state.puzzlesSolved + 1}
        </Text>
      </View>

      {/* Grid + sum indicators */}
      <View style={styles.gridArea}>
        <View>
          {[0, 1, 2].map(row => (
            <View key={row} style={styles.gridRow}>
              {[0, 1, 2].map(col => {
                const idx = row * 3 + col;
                return (
                  <GridCell
                    key={idx}
                    cell={state.grid[idx]}
                    index={idx}
                    isSelected={state.selectedCell === idx}
                    target={state.puzzle.target}
                    onPress={handleCellPress}
                  />
                );
              })}
              {/* Row sum */}
              <SumIndicator
                current={getRowSum(state.grid, row)}
                target={state.puzzle.target}
                label={`R${row}`}
              />
            </View>
          ))}
          {/* Column sums */}
          <View style={styles.gridRow}>
            {[0, 1, 2].map(col => (
              <SumIndicator
                key={col}
                current={getColSum(state.grid, col)}
                target={state.puzzle.target}
                label={`C${col}`}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Feedback overlay */}
      {state.phase === 'correct' && (
        <View style={styles.feedbackOverlay}>
          <Text style={styles.feedbackText}>正解！</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={handleNext}>
            <Text style={styles.actionBtnText}>次のパズル</Text>
          </TouchableOpacity>
        </View>
      )}

      {state.phase === 'wrong' && (
        <View style={styles.feedbackOverlay}>
          <Text style={[styles.feedbackText, { color: COLORS.red }]}>不正解...</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={handleRetryPuzzle}>
            <Text style={styles.actionBtnText}>やり直し</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Number pad */}
      {state.phase === 'playing' && (
        <NumberPad
          range={config.numberRange}
          onSelect={handleNumberSelect}
          onClear={handleClear}
        />
      )}

      {/* Action buttons */}
      {state.phase === 'playing' && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.hintBtn, state.hintsUsed >= SCORE_TABLE.maxHintsPerPuzzle && styles.btnDisabled]}
            onPress={handleHint}
            disabled={state.hintsUsed >= SCORE_TABLE.maxHintsPerPuzzle}
          >
            <Text style={styles.hintBtnText}>
              ヒント ({SCORE_TABLE.maxHintsPerPuzzle - state.hintsUsed})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, !gridFull && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={!gridFull}
          >
            <Text style={styles.submitBtnText}>決定</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ============================================================
// Styles
// ============================================================

const CELL_SIZE = Math.min((SIZES.screenWidth - 100) / 3, 88);
const CELL_GAP = 6;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  // --- Header ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  livesText: { color: COLORS.red, fontSize: 20 },
  comboText: { color: COLORS.gold, fontSize: 16, ...FONTS.bold },
  scoreText: { color: COLORS.textPrimary, fontSize: 18, ...FONTS.bold },

  // --- Timer ---
  timerBarBg: {
    width: '100%',
    height: 14,
    backgroundColor: COLORS.cardBg,
    borderRadius: 7,
    overflow: 'hidden',
    marginBottom: 12,
    justifyContent: 'center',
  },
  timerBarFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 7 },
  timerText: {
    textAlign: 'center',
    color: COLORS.textPrimary,
    fontSize: 10,
    ...FONTS.bold,
  },

  // --- Target ---
  targetContainer: { alignItems: 'center', marginBottom: 16 },
  targetLabel: { color: COLORS.textSecondary, fontSize: 14 },
  targetValue: { color: COLORS.gold, fontSize: 42, ...FONTS.heavy },
  difficultyBadge: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  // --- Grid ---
  gridArea: { alignItems: 'center', marginBottom: 16 },
  gridRow: { flexDirection: 'row', alignItems: 'center', gap: CELL_GAP },

  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 12,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    margin: CELL_GAP / 2,
  },
  cellPrefilled: {
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderColor: 'rgba(255,215,0,0.25)',
  },
  cellSelected: {
    borderColor: COLORS.gold,
    borderWidth: 2.5,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  cellText: { color: COLORS.textPrimary, fontSize: 28, ...FONTS.bold },
  cellTextPrefilled: { color: COLORS.gold },
  cellTextEmpty: { color: COLORS.textMuted },

  // --- Sum indicators ---
  sumBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    margin: CELL_GAP / 2,
  },
  sumBadgeCorrect: { backgroundColor: 'rgba(0,200,80,0.2)' },
  sumText: { color: COLORS.textMuted, fontSize: 14, ...FONTS.bold },
  sumTextCorrect: { color: '#00cc55' },

  // --- Number pad ---
  padContainer: { marginBottom: 12, width: '100%', alignItems: 'center' },
  padRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  padButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  padButtonClear: { backgroundColor: 'rgba(255,68,85,0.15)', borderColor: COLORS.red },
  padButtonText: { color: COLORS.textPrimary, fontSize: 20, ...FONTS.bold },

  // --- Action buttons ---
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  hintBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(136,170,255,0.15)',
    borderWidth: 1,
    borderColor: COLORS.blue,
  },
  hintBtnText: { color: COLORS.blue, fontSize: 16, ...FONTS.bold },
  submitBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,215,0,0.2)',
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  submitBtnText: { color: COLORS.gold, fontSize: 16, ...FONTS.bold },
  btnDisabled: { opacity: 0.35 },

  actionBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.gold,
    marginTop: 16,
  },
  actionBtnText: { color: COLORS.bg, fontSize: 18, ...FONTS.heavy },

  // --- Feedback overlay ---
  feedbackOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5,5,16,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  feedbackText: { color: COLORS.gold, fontSize: 36, ...FONTS.heavy },

  // --- Mode select ---
  title: { color: COLORS.gold, fontSize: 32, ...FONTS.heavy, marginBottom: 4 },
  subtitle: { color: COLORS.textSecondary, fontSize: 16, marginBottom: 24 },
  modeRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  modeBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modeBtnActive: { borderColor: COLORS.gold, backgroundColor: 'rgba(255,215,0,0.1)' },
  modeBtnText: { color: COLORS.textSecondary, fontSize: 16, ...FONTS.bold },
  modeBtnTextActive: { color: COLORS.gold },
  diffLabel: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 12 },
  diffBtn: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 10,
  },
  diffBtnText: { color: COLORS.textPrimary, fontSize: 18, ...FONTS.bold },
  diffBtnSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },

  // --- Back button ---
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  gameBackBtn: {
    marginRight: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  backBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    ...FONTS.bold,
  },

  // --- Game Over ---
  resultBox: { alignItems: 'center', marginVertical: 24 },
  resultLabel: { color: COLORS.textSecondary, fontSize: 14, marginTop: 12 },
  resultValue: { color: COLORS.gold, fontSize: 32, ...FONTS.heavy },
});

export default Game6Screen;
