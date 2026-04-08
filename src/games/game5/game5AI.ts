// ============================
// Game5: 日月の戦い — AI
// ============================

import {
  Game5State,
  Side,
  Action,
  PieceType,
  Difficulty,
} from './game5Types';
import {
  getAllLegalActions,
  movePiece,
  dropPiece,
  isInCheck,
  isStalemate,
} from './game5Logic';

// ─── Helpers ───

function opponent(side: Side): Side {
  return side === 'sun' ? 'moon' : 'sun';
}

function applyAction(state: Game5State, action: Action): Game5State {
  if (action.kind === 'move') {
    return movePiece(state, action.from, action.to);
  } else {
    return dropPiece(state, action.piece, action.to);
  }
}

// ─── Piece Values ───

const PIECE_VALUE: Record<PieceType, number> = {
  king: 1000,
  fire: 30,
  water: 20,
};

// ─── Evaluation ───

function evaluate(state: Game5State, aiSide: Side): number {
  if (state.winner === aiSide) return 10000;
  if (state.winner === opponent(aiSide)) return -10000;

  let score = 0;

  // Material on board
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cell = state.board[r][c];
      if (!cell) continue;
      const val = PIECE_VALUE[cell.type];
      score += cell.side === aiSide ? val : -val;
    }
  }

  // Hand pieces
  const aiHand = aiSide === 'sun' ? state.sunHand : state.moonHand;
  const oppHand = aiSide === 'sun' ? state.moonHand : state.sunHand;
  for (const pt of aiHand) score += PIECE_VALUE[pt] * 0.8;
  for (const pt of oppHand) score -= PIECE_VALUE[pt] * 0.8;

  // Check bonus
  if (isInCheck(state.board, opponent(aiSide))) score += 15;
  if (isInCheck(state.board, aiSide)) score -= 15;

  // Center control bonus
  const center = state.board[1][1];
  if (center && center.side === aiSide) score += 5;
  if (center && center.side === opponent(aiSide)) score -= 5;

  return score;
}

// ─── Normal AI ───
// Priority: capture -> check -> random

function pickNormalMove(state: Game5State, aiSide: Side): Action {
  const actions = getAllLegalActions(state, aiSide);
  if (actions.length === 0) {
    throw new Error('No legal actions available');
  }

  // 1. Try to capture (move to a square with an opponent piece)
  // But avoid captures that would cause stalemate (= draw)
  const captures = actions.filter(a => {
    if (a.kind !== 'move') return false;
    const target = state.board[a.to.row][a.to.col];
    return target !== null && target.side !== aiSide;
  });
  if (captures.length > 0) {
    // Filter out captures that cause stalemate
    const safeCaptures = captures.filter(a => {
      const newState = applyAction(state, a);
      return !isStalemate(newState, opponent(aiSide));
    });
    const bestCaptures = safeCaptures.length > 0 ? safeCaptures : captures;
    // Prefer capturing the most valuable piece
    bestCaptures.sort((a, b) => {
      const aTarget = state.board[(a as any).to.row][(a as any).to.col];
      const bTarget = state.board[(b as any).to.row][(b as any).to.col];
      return PIECE_VALUE[bTarget!.type] - PIECE_VALUE[aTarget!.type];
    });
    // Only take the capture if safe captures exist; otherwise skip to other moves
    if (safeCaptures.length > 0) {
      return bestCaptures[0];
    }
    // Fall through to check/random if all captures cause stalemate
  }

  // 2. Try to give check
  const checks = actions.filter(a => {
    const newState = applyAction(state, a);
    return isInCheck(newState.board, opponent(aiSide));
  });
  if (checks.length > 0) {
    return checks[Math.floor(Math.random() * checks.length)];
  }

  // 3. Random
  return actions[Math.floor(Math.random() * actions.length)];
}

// ─── Hard AI (Minimax + Alpha-Beta) ───

const MAX_DEPTH = 6;

function minimax(
  state: Game5State,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiSide: Side
): number {
  if (depth === 0 || state.phase === 'gameover') {
    return evaluate(state, aiSide);
  }

  const currentSide = maximizing ? aiSide : opponent(aiSide);
  const actions = getAllLegalActions(state, currentSide);

  if (actions.length === 0) {
    return evaluate(state, aiSide);
  }

  if (maximizing) {
    let maxEval = -Infinity;
    for (const action of actions) {
      const newState = applyAction(state, action);
      const evalScore = minimax(newState, depth - 1, alpha, beta, false, aiSide);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const action of actions) {
      const newState = applyAction(state, action);
      const evalScore = minimax(newState, depth - 1, alpha, beta, true, aiSide);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function pickHardMove(state: Game5State, aiSide: Side): Action {
  const actions = getAllLegalActions(state, aiSide);
  if (actions.length === 0) {
    throw new Error('No legal actions available');
  }

  let bestAction = actions[0];
  let bestScore = -Infinity;

  for (const action of actions) {
    const newState = applyAction(state, action);
    const score = minimax(newState, MAX_DEPTH - 1, -Infinity, Infinity, false, aiSide);
    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  }

  return bestAction;
}

// ─── Public API ───

export function getAIMove(
  state: Game5State,
  aiSide: Side,
  difficulty: Difficulty
): Action {
  if (difficulty === 'hard') {
    return pickHardMove(state, aiSide);
  }
  return pickNormalMove(state, aiSide);
}
