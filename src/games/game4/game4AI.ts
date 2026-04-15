// ============================================================
// Game4: パタパタ (Mancala) — AI (CPU)
// ============================================================

import { BoardState, Player, Difficulty } from './game4Types';
import {
  sowSeeds,
  checkWinner,
  getValidPits,
  sideTotal,
  opponent,
  cloneBoard,
} from './game4Logic';

// ---------- Normal AI ----------
// Priority: 1) move that lands in a pit (extra turn)
//           2) pit with the most coins
//           3) random

function normalAI(board: BoardState, player: Player): number {
  const valid = getValidPits(board, player);
  if (valid.length === 0) return -1;

  // 1) Check for extra-turn moves
  const extraTurnMoves: number[] = [];
  for (const pit of valid) {
    const result = sowSeeds(board, player, pit);
    if (result.extraTurn) {
      extraTurnMoves.push(pit);
    }
  }

  if (extraTurnMoves.length > 0) {
    // Among extra-turn moves, prefer the one with more coins
    let best = extraTurnMoves[0];
    const pits = player === 'A' ? board.a : board.b;
    for (const pit of extraTurnMoves) {
      if (pits[pit] > pits[best]) best = pit;
    }
    return best;
  }

  // 2) Prefer pit with the most coins
  let best = valid[0];
  const pits = player === 'A' ? board.a : board.b;
  for (const pit of valid) {
    if (pits[pit] > pits[best]) best = pit;
  }
  return best;
}

// ---------- Hard AI (Minimax) ----------

const MAX_DEPTH = 5;

interface MinimaxResult {
  score: number;
  pit: number;
}

/**
 * Evaluate board from the perspective of `aiPlayer`.
 * Standard Mancala: the player with more coins in their goal wins.
 */
function evaluate(board: BoardState, aiPlayer: Player): number {
  const winner = checkWinner(board);
  if (winner === aiPlayer) return 1000;
  if (winner !== null) return -1000; // opponent wins

  // Goal-based evaluation: prefer more coins in own goal
  const myGoal = aiPlayer === 'A' ? board.pitR : board.pitL;
  const oppGoal = aiPlayer === 'A' ? board.pitL : board.pitR;

  // Also consider side coins (fewer = closer to ending on our terms)
  const myCoins = sideTotal(board, aiPlayer);
  const oppCoins = sideTotal(board, opponent(aiPlayer));

  return (myGoal - oppGoal) * 10 + (oppCoins - myCoins);
}

function minimax(
  board: BoardState,
  player: Player,
  aiPlayer: Player,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
): MinimaxResult {
  const winner = checkWinner(board);
  if (winner !== null || depth === 0) {
    return { score: evaluate(board, aiPlayer), pit: -1 };
  }

  const valid = getValidPits(board, player);
  if (valid.length === 0) {
    return { score: evaluate(board, aiPlayer), pit: -1 };
  }

  let bestPit = valid[0];

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (const pit of valid) {
      const result = sowSeeds(board, player, pit);
      const nextPlayer = result.extraTurn ? player : opponent(player);
      const nextIsMax = result.extraTurn ? true : !isMaximizing;

      const { score } = minimax(
        result.board,
        nextPlayer,
        aiPlayer,
        depth - 1,
        alpha,
        beta,
        nextIsMax,
      );

      if (score > bestScore) {
        bestScore = score;
        bestPit = pit;
      }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return { score: bestScore, pit: bestPit };
  } else {
    let bestScore = Infinity;
    for (const pit of valid) {
      const result = sowSeeds(board, player, pit);
      const nextPlayer = result.extraTurn ? player : opponent(player);
      const nextIsMax = result.extraTurn ? false : !isMaximizing;

      const { score } = minimax(
        result.board,
        nextPlayer,
        aiPlayer,
        depth - 1,
        alpha,
        beta,
        nextIsMax,
      );

      if (score < bestScore) {
        bestScore = score;
        bestPit = pit;
      }
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return { score: bestScore, pit: bestPit };
  }
}

function hardAI(board: BoardState, player: Player): number {
  const valid = getValidPits(board, player);
  if (valid.length === 0) return -1;

  const { pit } = minimax(
    cloneBoard(board),
    player,
    player,
    MAX_DEPTH,
    -Infinity,
    Infinity,
    true,
  );
  return pit;
}

// ---------- Public API ----------

/**
 * Get the AI's chosen pit index for the given difficulty.
 */
export function getAIMove(
  board: BoardState,
  player: Player,
  difficulty: Difficulty,
): number {
  if (difficulty === 'hard') {
    return hardAI(board, player);
  }
  return normalAI(board, player);
}
