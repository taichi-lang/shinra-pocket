// ============================================================
// Game3: 三つ巴 — AI (Normal + Hard / Max^N)
// ============================================================

import type {
  Player,
  CoinNumber,
  StackCell,
  PlayerHand,
  Game3State,
  Game3Action,
  Difficulty,
} from './game3Types';
import { PLAYERS } from './game3Types';
import { WIN_LINES } from '../../game/types';
import {
  topOwner,
  getAllActions,
  applyAction,
  checkWinner,
  cloneState,
  hasAnyAction,
  nextPlayer,
} from './game3Logic';

// ------------------------------------------------------------------
// Entry point
// ------------------------------------------------------------------

export function getAIAction(
  state: Game3State,
  difficulty: Difficulty,
): Game3Action | null {
  const actions = getAllActions(
    state.board,
    state.hands[state.currentPlayer],
    state.currentPlayer,
  );
  if (actions.length === 0) return null;

  if (difficulty === 'hard') {
    return hardAI(state, actions);
  }
  return normalAI(state, actions);
}

// ==================================================================
// NORMAL AI
// Priority: win -> block -> strategic stack -> random
// ==================================================================

function normalAI(
  state: Game3State,
  actions: Game3Action[],
): Game3Action {
  const me = state.currentPlayer;

  // 1. Can I win?
  for (const action of actions) {
    const after = applyAction(state, action);
    const result = checkWinner(after.board);
    if (result && result.winner === me) {
      return action;
    }
  }

  // 2. Block any opponent from winning next turn
  const blockAction = findBlockAction(state, actions, me);
  if (blockAction) return blockAction;

  // 3. Strategic stacking: cover an opponent's coin that's part of a potential line
  const stackAction = findStrategicStack(state, actions, me);
  if (stackAction) return stackAction;

  // 4. Prefer center, then corners, then edges
  const positionalAction = findPositionalAction(state, actions, me);
  if (positionalAction) return positionalAction;

  // 5. Random
  return actions[Math.floor(Math.random() * actions.length)];
}

/** Check if any opponent can win on their next turn, and find actions to block */
function findBlockAction(
  state: Game3State,
  actions: Game3Action[],
  me: Player,
): Game3Action | null {
  // For each opponent, check if they have a winning action
  const opponents = PLAYERS.filter(p => p !== me);

  for (const opp of opponents) {
    // Simulate: if it were opp's turn, could they win?
    const oppActions = getAllActions(state.board, state.hands[opp], opp);
    for (const oa of oppActions) {
      const simState = cloneState(state);
      simState.currentPlayer = opp;
      const after = applyAction(simState, oa);
      const result = checkWinner(after.board);
      if (result && result.winner === opp) {
        // Opponent can win by placing/moving to oa.targetCell or oa.toCell
        const threatCell =
          oa.type === 'place' ? oa.targetCell : oa.toCell;

        // Try to block: place on that cell or cover it
        for (const action of actions) {
          if (action.type === 'place' && action.targetCell === threatCell) {
            return action;
          }
        }
        // Or place in the line to break it — find any action that disrupts
        for (const action of actions) {
          const afterMyAction = applyAction(state, action);
          // Check opp can no longer win with the same action
          const simState2 = cloneState(afterMyAction);
          simState2.currentPlayer = opp;
          const oppActions2 = getAllActions(
            simState2.board,
            simState2.hands[opp],
            opp,
          );
          const canStillWin = oppActions2.some(oa2 => {
            const a2 = applyAction(simState2, oa2);
            const r2 = checkWinner(a2.board);
            return r2 && r2.winner === opp;
          });
          if (!canStillWin) return action;
        }
      }
    }
  }
  return null;
}

/** Find a strategic stacking move: cover an opponent's coin on a dangerous line */
function findStrategicStack(
  state: Game3State,
  actions: Game3Action[],
  me: Player,
): Game3Action | null {
  // Score lines: lines where an opponent has 2 visible coins
  for (const line of WIN_LINES) {
    for (const opp of PLAYERS.filter(p => p !== me)) {
      const oppCount = line.filter(i => topOwner(state.board[i]) === opp).length;
      if (oppCount >= 2) {
        // Try to cover one of opp's coins in this line
        for (const cellIdx of line) {
          if (topOwner(state.board[cellIdx]) === opp) {
            const coverAction = actions.find(
              a => a.type === 'place' && a.targetCell === cellIdx,
            );
            if (coverAction) return coverAction;
          }
        }
      }
    }
  }
  return null;
}

/** Prefer center (4), corners (0,2,6,8), edges (1,3,5,7) */
function findPositionalAction(
  _state: Game3State,
  actions: Game3Action[],
  _me: Player,
): Game3Action | null {
  const priority = [4, 0, 2, 6, 8, 1, 3, 5, 7];
  const placeActions = actions.filter(a => a.type === 'place');

  for (const pos of priority) {
    const found = placeActions.find(a => a.type === 'place' && a.targetCell === pos);
    if (found) return found;
  }
  return null;
}

// ==================================================================
// HARD AI — Max^N Algorithm for 3 players
// ==================================================================

const MAX_DEPTH = 4;

/** Score tuple: [fire, water, swirl] */
type ScoreTuple = [number, number, number];

function playerIndex(p: Player): number {
  return PLAYERS.indexOf(p);
}

function hardAI(
  state: Game3State,
  actions: Game3Action[],
): Game3Action {
  const me = state.currentPlayer;
  const myIdx = playerIndex(me);

  let bestAction = actions[0];
  let bestScore = -Infinity;

  for (const action of actions) {
    const afterAction = applyAction(state, action);
    const afterTurn = advanceTurnForAI(afterAction, state.currentPlayer);
    const scores = maxN(afterTurn, MAX_DEPTH - 1);
    if (scores[myIdx] > bestScore) {
      bestScore = scores[myIdx];
      bestAction = action;
    }
  }

  return bestAction;
}

/**
 * Max^N: each player maximizes their own score in the tuple.
 * Returns [fireScore, waterScore, swirlScore].
 */
function maxN(state: Game3State, depth: number): ScoreTuple {
  // Terminal check
  const winResult = checkWinner(state.board);
  if (winResult) {
    return terminalScore(winResult.winner);
  }
  if (depth <= 0) {
    return evaluate(state);
  }

  const current = state.currentPlayer;
  const currentIdx = playerIndex(current);
  const actions = getAllActions(
    state.board,
    state.hands[current],
    current,
  );

  if (actions.length === 0) {
    // Current player can't move — the previous player (who forced this) wins.
    // We approximate: the player who moved last is the one before current.
    const prev = PLAYERS[(PLAYERS.indexOf(current) + 2) % 3];
    return terminalScore(prev);
  }

  let bestScores: ScoreTuple = [-Infinity, -Infinity, -Infinity];

  for (const action of actions) {
    const afterAction = applyAction(state, action);
    const afterTurn = advanceTurnForAI(afterAction, current);
    const scores = maxN(afterTurn, depth - 1);

    if (scores[currentIdx] > bestScores[currentIdx]) {
      bestScores = scores;
    }
  }

  return bestScores;
}

/** Advance turn for AI simulation (no UI state changes) */
function advanceTurnForAI(state: Game3State, movedPlayer: Player): Game3State {
  const newState = cloneState(state);
  const next = nextPlayer(movedPlayer);
  // If next player can't move, they lose — handled in maxN terminal check
  newState.currentPlayer = next;
  return newState;
}

/** Terminal score: winner gets 100, losers get -50 */
function terminalScore(winner: Player): ScoreTuple {
  const scores: ScoreTuple = [-50, -50, -50];
  scores[playerIndex(winner)] = 100;
  return scores;
}

// ------------------------------------------------------------------
// Evaluation heuristic
// ------------------------------------------------------------------

function evaluate(state: Game3State): ScoreTuple {
  const scores: ScoreTuple = [0, 0, 0];

  for (const line of WIN_LINES) {
    const owners = line.map(i => topOwner(state.board[i]));

    for (const player of PLAYERS) {
      const pIdx = playerIndex(player);
      const myCount = owners.filter(o => o === player).length;
      const emptyCount = owners.filter(o => o === null).length;
      const oppCount = 3 - myCount - emptyCount;

      if (oppCount === 0) {
        // Line has only my coins or empty
        if (myCount === 3) scores[pIdx] += 100;
        else if (myCount === 2) scores[pIdx] += 10;
        else if (myCount === 1) scores[pIdx] += 2;
      } else if (myCount === 0 && emptyCount === 0) {
        // Line is blocked from me, slight negative
        scores[pIdx] -= 1;
      }
    }
  }

  // Bonus: control center
  const centerOwner = topOwner(state.board[4]);
  if (centerOwner) {
    scores[playerIndex(centerOwner)] += 5;
  }

  // Bonus: having coins in hand (flexibility)
  for (const player of PLAYERS) {
    const hand = state.hands[player];
    const remaining = hand[1] + hand[2] + hand[3];
    scores[playerIndex(player)] += remaining * 0.5;
  }

  // Bonus: high-number coins on top (harder to cover)
  for (let i = 0; i < 9; i++) {
    const cell = state.board[i];
    if (cell.length > 0) {
      const top = cell[cell.length - 1];
      const pIdx = playerIndex(top.owner);
      if (top.number === 3) scores[pIdx] += 3; // sealed, very strong
      else if (top.number === 2) scores[pIdx] += 1;
    }
  }

  return scores;
}
