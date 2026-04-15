// Game2 AI — Normal (heuristic) + Hard (minimax with alpha-beta)

import { CoinType } from '../../game/types';
import {
  Game2State,
  Player,
  GameAction,
} from './game2Types';
import {
  getAllActions,
  applyAction,
  checkWinner,
  cloneState,
  getTopOwner,
  isGameOver,
} from './game2Logic';

// ========== HELPERS ==========

function opponent(p: Player): Player {
  return p === 'player' ? 'cpu' : 'player';
}

/** Count how many lines a player has 2-in-a-row with the third empty or accessible */
function countThreats(state: Game2State, player: Player): number {
  const WIN_LINES: [number, number, number][] = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  let threats = 0;
  for (const [a, b, c] of WIN_LINES) {
    const owners = [getTopOwner(state.board[a]), getTopOwner(state.board[b]), getTopOwner(state.board[c])];
    const mine = owners.filter(o => o === player).length;
    const empty = owners.filter(o => o === null).length;
    if (mine === 2 && empty === 1) threats++;
  }
  return threats;
}

/** Simple board evaluation for heuristic */
function evaluateBoard(state: Game2State, aiPlayer: Player): number {
  const opp = opponent(aiPlayer);

  // Check wins
  const winResult = checkWinner(state.board);
  if (winResult) {
    return winResult.winner === aiPlayer ? 10000 : -10000;
  }

  let score = 0;

  // Threats (2 in a row)
  score += countThreats(state, aiPlayer) * 50;
  score -= countThreats(state, opp) * 50;

  // Center control
  const centerOwner = getTopOwner(state.board[4]);
  if (centerOwner === aiPlayer) score += 30;
  else if (centerOwner === opp) score -= 30;

  // Corner control
  for (const i of [0, 2, 6, 8]) {
    const owner = getTopOwner(state.board[i]);
    if (owner === aiPlayer) score += 10;
    else if (owner === opp) score -= 10;
  }

  // Stacking advantage: having your "2" on top of opponent's "1"
  for (let i = 0; i < 9; i++) {
    const cell = state.board[i];
    if (cell.top && cell.bottom) {
      if (cell.top.owner === aiPlayer && cell.bottom.owner === opp) {
        score += 20; // Covered opponent's coin
      } else if (cell.top.owner === opp && cell.bottom.owner === aiPlayer) {
        score -= 20;
      }
    }
  }

  return score;
}

// ========== NORMAL AI (Heuristic) ==========

/** Count total coins placed on the board */
function countBoardCoins(state: Game2State): number {
  let count = 0;
  for (let i = 0; i < 9; i++) {
    if (state.board[i].bottom) count++;
    if (state.board[i].top) count++;
  }
  return count;
}

export function chooseActionNormal(state: Game2State, cpuCoinType: CoinType): GameAction | null {
  const actions = getAllActions(state, 'cpu');
  if (actions.length === 0) return null;

  const boardCoins = countBoardCoins(state);
  const isEarlyGame = boardCoins < 5; // Early placement phase: fewer than 5 coins on board

  // During early game, don't aggressively seek wins — let stacking mechanics develop
  if (!isEarlyGame) {
    // Priority 1: Win immediately (only after enough coins are placed)
    for (const action of actions) {
      const newState = applyAction(state, action, 'cpu', cpuCoinType);
      const win = checkWinner(newState.board);
      if (win && win.winner === 'cpu') return action;
    }
  }

  // Priority 2: Block opponent's winning move (always important)
  const oppActions = getAllActions(state, 'player');
  for (const oppAction of oppActions) {
    // Simulate opponent; use a dummy coin type (doesn't affect logic)
    const oppState = applyAction(state, oppAction, 'player', cpuCoinType);
    const oppWin = checkWinner(oppState.board);
    if (oppWin && oppWin.winner === 'player') {
      // Find our action that blocks this
      // The opponent would target a specific cell; try to take it
      const targetIdx = oppAction.type === 'place' ? oppAction.targetIndex : oppAction.toIndex;
      const blocking = actions.filter(a => {
        if (a.type === 'place') return a.targetIndex === targetIdx;
        if (a.type === 'move') return a.toIndex === targetIdx;
        return false;
      });
      if (blocking.length > 0) return blocking[0];
    }
  }

  // Priority 3: Strategic — pick action with best heuristic score
  // In early game, add more randomness so CPU doesn't play optimally
  let bestAction = actions[0];
  let bestScore = -Infinity;
  const jitterRange = isEarlyGame ? 40 : 5; // Much more randomness in early game

  for (const action of actions) {
    const newState = applyAction(state, action, 'cpu', cpuCoinType);
    const score = evaluateBoard(newState, 'cpu');
    const jitter = Math.random() * jitterRange;
    if (score + jitter > bestScore) {
      bestScore = score + jitter;
      bestAction = action;
    }
  }

  return bestAction;
}

// ========== HARD AI (Minimax with Alpha-Beta) ==========

const MAX_DEPTH = 4;

function minimax(
  state: Game2State,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: Player,
  aiCoinType: CoinType,
  playerCoinType: CoinType,
): number {
  // Terminal check
  const gameEnd = isGameOver(state);
  if (gameEnd.over) {
    if (gameEnd.winner === aiPlayer) return 10000 - (MAX_DEPTH - depth) * 10;
    if (gameEnd.winner === 'draw') return 0;
    return -10000 + (MAX_DEPTH - depth) * 10;
  }

  if (depth === 0) {
    return evaluateBoard(state, aiPlayer);
  }

  const currentPlayer = isMaximizing ? aiPlayer : opponent(aiPlayer);
  const coinType = currentPlayer === aiPlayer ? aiCoinType : playerCoinType;
  const actions = getAllActions(state, currentPlayer);

  if (actions.length === 0) {
    // Current player can't move, skip turn
    return minimax(state, depth - 1, alpha, beta, !isMaximizing, aiPlayer, aiCoinType, playerCoinType);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const action of actions) {
      const newState = applyAction(state, action, currentPlayer, coinType);
      const ev = minimax(newState, depth - 1, alpha, beta, false, aiPlayer, aiCoinType, playerCoinType);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const action of actions) {
      const newState = applyAction(state, action, currentPlayer, coinType);
      const ev = minimax(newState, depth - 1, alpha, beta, true, aiPlayer, aiCoinType, playerCoinType);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function chooseActionHard(
  state: Game2State,
  cpuCoinType: CoinType,
  playerCoinType: CoinType,
): GameAction | null {
  const actions = getAllActions(state, 'cpu');
  if (actions.length === 0) return null;

  let bestAction = actions[0];
  let bestScore = -Infinity;

  for (const action of actions) {
    const newState = applyAction(state, action, 'cpu', cpuCoinType);

    // Quick win check
    const win = checkWinner(newState.board);
    if (win && win.winner === 'cpu') return action;

    const score = minimax(
      newState,
      MAX_DEPTH - 1,
      -Infinity,
      Infinity,
      false, // next is opponent (minimizing)
      'cpu',
      cpuCoinType,
      playerCoinType,
    );

    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  }

  return bestAction;
}

// ========== UNIFIED ENTRY ==========

export function chooseAIAction(
  state: Game2State,
  difficulty: 'normal' | 'hard',
  cpuCoinType: CoinType,
  playerCoinType: CoinType,
): GameAction | null {
  if (difficulty === 'hard') {
    return chooseActionHard(state, cpuCoinType, playerCoinType);
  }
  return chooseActionNormal(state, cpuCoinType);
}
