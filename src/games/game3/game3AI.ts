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
  const me = state.currentPlayer;

  // 1. 自分の即勝ち
  for (const action of actions) {
    const after = applyAction(state, action);
    const result = checkWinner(after.board);
    if (result && result.winner === me) return action;
  }

  // 2. 相手の即勝ちをブロック（最優先）
  const blockAction = findBlockAction(state, actions, me);
  if (blockAction) return blockAction;

  // CPU1(water)=攻撃的、CPU2(swirl)=防御的で異なる性格
  const personality: AIPersonality = me === 'water' ? 'aggressive' : 'defensive';

  // 3. 安全性チェック+フォーク検出付きの評価で最善手を選ぶ
  const scoredAction = scoredLookahead(state, actions, me, personality);
  if (scoredAction) return scoredAction;

  return normalAI(state, actions, personality);
}

// ==================================================================
// Scored lookahead:
//   - 相手に即勝ちを許す手を避ける（安全性）
//   - 自分のフォーク（2リーチ以上）を優先
//   - ラインの充実度を評価
// ==================================================================

function scoredLookahead(
  state: Game3State,
  actions: Game3Action[],
  me: Player,
  personality: AIPersonality,
): Game3Action | null {
  const opponents = PLAYERS.filter(p => p !== me);

  let bestAction: Game3Action | null = null;
  let bestScore = -Infinity;

  for (const action of actions) {
    const after = applyAction(state, action);
    const wr = checkWinner(after.board);
    if (wr) continue; // 即勝ちは getAIAction で処理済み

    let score = 0;

    // --- 安全性: 相手に即勝ちを許す手は大減点 ---
    let givesOppWin = false;
    for (const opp of opponents) {
      const oppActions = getAllActions(after.board, after.hands[opp], opp);
      const simState = cloneState(after);
      simState.currentPlayer = opp;
      for (const oa of oppActions) {
        const afterOpp = applyAction(simState, oa);
        const r2 = checkWinner(afterOpp.board);
        if (r2 && r2.winner === opp) {
          givesOppWin = true;
          break;
        }
      }
      if (givesOppWin) break;
    }
    if (givesOppWin) score -= 200;

    // --- 自分のライン評価 + フォーク検出 ---
    let myReaches = 0;
    for (const line of WIN_LINES) {
      const myCount = line.filter(i => topOwner(after.board[i]) === me).length;
      const emptyCount = line.filter(i => topOwner(after.board[i]) === null).length;
      if (myCount === 2 && emptyCount >= 1) {
        score += 15;
        myReaches++;
      } else if (myCount === 1 && emptyCount >= 2) {
        score += 3;
      }
    }
    // フォーク: 同時に2本以上リーチを作れば防ぎきれない
    if (myReaches >= 2) score += 40;

    // --- 相手のリーチ妨害 ---
    for (const line of WIN_LINES) {
      for (const opp of opponents) {
        const oppCount = line.filter(i => topOwner(after.board[i]) === opp).length;
        const emptyCount = line.filter(i => topOwner(after.board[i]) === null).length;
        if (oppCount === 2 && emptyCount >= 1) score -= 12;
      }
    }

    // --- 性格ボーナス ---
    if (personality === 'aggressive') {
      // 攻撃型: スタック・大きい数字を好む
      if (action.type === 'place' && action.coinNumber >= 2) score += 3;
      if (topOwner(after.board[4]) === me) score += 4; // 中央支配
    } else {
      // 防御型: 小さい数字を温存、端配置を好む
      if (action.type === 'place' && action.coinNumber === 1) score += 2;
      if (action.type === 'place' && [1, 3, 5, 7].includes(action.targetCell)) score += 2;
    }

    // 同じ局面で同じ手にならないよう微弱ランダム
    score += Math.random() * 1.5;

    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  }

  return bestAction;
}

// ==================================================================
// NORMAL AI
// Priority: win -> block -> strategic stack -> random
// ==================================================================

type AIPersonality = 'aggressive' | 'defensive';

function normalAI(
  state: Game3State,
  actions: Game3Action[],
  personality: AIPersonality = 'aggressive',
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

  if (personality === 'aggressive') {
    // 攻撃型: スタック→大きい数字優先→中央寄り
    const stackAction = findStrategicStack(state, actions, me);
    if (stackAction) return stackAction;

    // 大きい数字を優先的に使う
    const bigCoinAction = actions
      .filter(a => a.type === 'place' && a.coinNumber === 3)
      .find(a => {
        const target = a.type === 'place' ? a.targetCell : 0;
        return [4, 0, 2, 6, 8].includes(target);
      });
    if (bigCoinAction) return bigCoinAction;

    const positionalAction = findPositionalAction(state, actions, me);
    if (positionalAction) return positionalAction;
  } else {
    // 防御型: ライン妨害→端配置→小さい数字温存
    // 相手のラインを崩すことを優先
    const disruptAction = findDisruptAction(state, actions, me);
    if (disruptAction) return disruptAction;

    // 端を優先（中央を避ける）
    const edgePriority = [1, 3, 5, 7, 0, 2, 6, 8, 4];
    const placeActions = actions.filter(a => a.type === 'place');
    for (const pos of edgePriority) {
      const found = placeActions.find(a => a.type === 'place' && a.targetCell === pos);
      if (found) return found;
    }
  }

  // ランダム（同じ手が出ないよう毎回シャッフル）
  const shuffled = [...actions].sort(() => Math.random() - 0.5);
  return shuffled[0];
}

/** 防御型: 相手のラインを崩す手を探す */
function findDisruptAction(
  state: Game3State,
  actions: Game3Action[],
  me: Player,
): Game3Action | null {
  for (const line of WIN_LINES) {
    for (const opp of PLAYERS.filter(p => p !== me)) {
      const oppCount = line.filter(i => topOwner(state.board[i]) === opp).length;
      if (oppCount >= 1) {
        // 相手のラインに割り込む
        for (const cellIdx of line) {
          if (topOwner(state.board[cellIdx]) !== me && topOwner(state.board[cellIdx]) !== opp) {
            const placeAction = actions.find(
              a => a.type === 'place' && a.targetCell === cellIdx,
            );
            if (placeAction) return placeAction;
          }
        }
      }
    }
  }
  return null;
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

  // 即勝ちは探索せず即採用
  for (const action of actions) {
    const after = applyAction(state, action);
    const result = checkWinner(after.board);
    if (result && result.winner === me) return action;
  }

  // 相手の即勝ちをブロック（探索より優先）
  const blockAction = findBlockAction(state, actions, me);
  if (blockAction) return blockAction;

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
  const reachCount: Record<Player, number> = { fire: 0, water: 0, swirl: 0 };

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
        else if (myCount === 2) {
          scores[pIdx] += 12;
          reachCount[player]++;
        } else if (myCount === 1) scores[pIdx] += 2;
      } else if (myCount === 0 && emptyCount === 0) {
        // Line is blocked from me, slight negative
        scores[pIdx] -= 1;
      }
    }
  }

  // フォーク: 2本以上のリーチは大ボーナス（防ぎきれない）
  for (const player of PLAYERS) {
    if (reachCount[player] >= 2) {
      scores[playerIndex(player)] += 25 * (reachCount[player] - 1);
    }
  }

  // 手番プレイヤーのリーチは次に勝てるので追加評価
  if (reachCount[state.currentPlayer] >= 1) {
    scores[playerIndex(state.currentPlayer)] += 8;
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
