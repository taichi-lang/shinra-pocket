// Game1 AI — Wrap ai.ts functions for Game1 use

import {
  checkWin,
  getWinLine,
  cpuBestPlace,
  cpuBestMove,
  cpuBestPlaceHard,
  cpuBestMoveHard,
} from '../../game/ai';
import type { CellState, Difficulty } from '../../game/types';

export { checkWin, getWinLine };

/**
 * CPU配置: 難易度に応じて適切なAI関数を呼ぶ
 */
export function cpuPlace(
  board: CellState[],
  difficulty: Difficulty,
  playerPlaced: number,
  cpuPlaced: number,
): number {
  if (difficulty === 'hard') {
    return cpuBestPlaceHard([...board], playerPlaced, cpuPlaced);
  }
  return cpuBestPlace([...board]);
}

/**
 * CPU移動: 難易度に応じて適切なAI関数を呼ぶ
 */
export function cpuMove(
  board: CellState[],
  difficulty: Difficulty,
): [number, number] | null {
  if (difficulty === 'hard') {
    return cpuBestMoveHard([...board]);
  }
  return cpuBestMove([...board]);
}
