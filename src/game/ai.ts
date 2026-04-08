import { CellState, WIN_LINES } from './types';

// === 勝利チェック ===
export function checkWin(board: CellState[], who: CellState): boolean {
  return WIN_LINES.some(([a, b, c]) => board[a] === who && board[b] === who && board[c] === who);
}

// === 勝利ライン取得 ===
export function getWinLine(board: CellState[], who: CellState): number[] | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] === who && board[b] === who && board[c] === who) {
      return [a, b, c];
    }
  }
  return null;
}

// === ボード評価 ===
function scoreBoard(board: CellState[]): number {
  let score = 0;
  for (const [a, b, c] of WIN_LINES) {
    const v = [board[a], board[b], board[c]];
    const cpu = v.filter((x) => x === 'cpu').length;
    const ply = v.filter((x) => x === 'player').length;
    if (cpu > 0 && ply === 0) score += cpu === 2 ? 4 : 1;
    if (ply > 0 && cpu === 0) score -= ply === 2 ? 4 : 1;
  }
  return score;
}

function checkWinBoard(board: CellState[], who: CellState): boolean {
  return WIN_LINES.some(([a, b, c]) => board[a] === who && board[b] === who && board[c] === who);
}

// === 配置フェーズ: 勝ちマスを探す ===
function findPlaceWin(board: CellState[], who: CellState): number {
  for (const [a, b, c] of WIN_LINES) {
    const v = [board[a], board[b], board[c]];
    if (v.filter((x) => x === who).length === 2 && v.includes(null)) {
      return [a, b, c][v.indexOf(null)];
    }
  }
  return -1;
}

// === ノーマルAI: 配置 ===
export function cpuBestPlace(board: CellState[]): number {
  let m = findPlaceWin(board, 'cpu');
  if (m !== -1) return m;
  m = findPlaceWin(board, 'player');
  if (m !== -1) return m;
  if (!board[4]) return 4;
  const corners = [0, 2, 6, 8].filter((i) => !board[i]);
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  const empty = board.map((v, i) => (!v ? i : -1)).filter((i) => i !== -1);
  return empty[Math.floor(Math.random() * empty.length)];
}

// === ノーマルAI: 移動 ===
export function cpuBestMove(board: CellState[]): [number, number] | null {
  const mine = board.map((v, i) => (v === 'cpu' ? i : -1)).filter((i) => i !== -1);
  const empty = board.map((v, i) => (!v ? i : -1)).filter((i) => i !== -1);

  // 勝てるか？
  for (const from of mine) {
    for (const to of empty) {
      board[to] = 'cpu';
      board[from] = null;
      const win = checkWin(board, 'cpu');
      board[from] = 'cpu';
      board[to] = null;
      if (win) return [from, to];
    }
  }

  // プレイヤーの勝ちをブロック
  const yours = board.map((v, i) => (v === 'player' ? i : -1)).filter((i) => i !== -1);
  for (const from of yours) {
    for (const to of empty) {
      board[to] = 'player';
      board[from] = null;
      const danger = checkWin(board, 'player');
      board[from] = 'player';
      board[to] = null;
      if (danger) {
        // Any CPU piece can move to 'to' (no adjacency restriction)
        if (mine.length > 0) return [mine[0], to];
      }
    }
  }

  // ランダム
  const moves: [number, number][] = [];
  for (const from of mine) {
    for (const to of empty) moves.push([from, to]);
  }
  return moves.length ? moves[Math.floor(Math.random() * moves.length)] : null;
}

// === ハードAI: ミニマックス（配置フェーズ） ===
function minimaxPlace(
  board: CellState[],
  pp: number,
  cp: number,
  isPlayerTurn: boolean,
  depth: number,
  alpha: number,
  beta: number
): number {
  if (checkWinBoard(board, 'cpu')) return 10 - depth;
  if (checkWinBoard(board, 'player')) return depth - 10;
  if (pp === 4 && cp === 4) return minimaxMove(board, true, 0, alpha, beta, 4);
  if (depth >= 7) return scoreBoard(board);

  const empty = board.map((v, i) => (!v ? i : -1)).filter((i) => i !== -1);

  if (isPlayerTurn) {
    if (pp >= 4) return minimaxPlace(board, pp, cp, false, depth, alpha, beta);
    let best = Infinity;
    for (const i of empty) {
      board[i] = 'player';
      best = Math.min(best, minimaxPlace(board, pp + 1, cp, false, depth + 1, alpha, beta));
      board[i] = null;
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    if (cp >= 4) return minimaxPlace(board, pp, cp, true, depth, alpha, beta);
    let best = -Infinity;
    for (const i of empty) {
      board[i] = 'cpu';
      best = Math.max(best, minimaxPlace(board, pp, cp + 1, true, depth + 1, alpha, beta));
      board[i] = null;
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

// === ハードAI: ミニマックス（移動フェーズ） ===
function minimaxMove(
  board: CellState[],
  isPlayerTurn: boolean,
  depth: number,
  alpha: number,
  beta: number,
  maxDepth: number = 4
): number {
  if (checkWinBoard(board, 'cpu')) return 10 - depth;
  if (checkWinBoard(board, 'player')) return depth - 10;
  if (depth >= maxDepth) return scoreBoard(board);

  const emptyIdxs = board.map((v, i) => (!v ? i : -1)).filter((i) => i !== -1);
  if (!emptyIdxs.length) return scoreBoard(board);

  const who: CellState = isPlayerTurn ? 'player' : 'cpu';
  const pieces = board.map((v, i) => (v === who ? i : -1)).filter((i) => i !== -1);

  if (isPlayerTurn) {
    let best = Infinity;
    for (const from of pieces) {
      for (const to of emptyIdxs) {
        board[to] = 'player';
        board[from] = null;
        best = Math.min(best, minimaxMove(board, false, depth + 1, alpha, beta, maxDepth));
        board[from] = 'player';
        board[to] = null;
        beta = Math.min(beta, best);
        if (beta <= alpha) return best;
      }
    }
    return best;
  } else {
    let best = -Infinity;
    for (const from of pieces) {
      for (const to of emptyIdxs) {
        board[to] = 'cpu';
        board[from] = null;
        best = Math.max(best, minimaxMove(board, true, depth + 1, alpha, beta, maxDepth));
        board[from] = 'cpu';
        board[to] = null;
        alpha = Math.max(alpha, best);
        if (beta <= alpha) return best;
      }
    }
    return best;
  }
}

// === ハードAI: 配置 ===
export function cpuBestPlaceHard(board: CellState[], pPlaced: number, cPlaced: number): number {
  const empty = board.map((v, i) => (!v ? i : -1)).filter((i) => i !== -1);
  let bestScore = -Infinity;
  let bestMove = empty[0];
  for (const i of empty) {
    board[i] = 'cpu';
    const score = minimaxPlace(board, pPlaced, cPlaced + 1, true, 0, -Infinity, Infinity);
    board[i] = null;
    if (score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }
  return bestMove;
}

// === ハードAI: 移動 ===
export function cpuBestMoveHard(board: CellState[]): [number, number] | null {
  const mine = board.map((v, i) => (v === 'cpu' ? i : -1)).filter((i) => i !== -1);
  const empties = board.map((v, i) => (!v ? i : -1)).filter((i) => i !== -1);
  if (!mine.length || !empties.length) return null;

  let bestScore = -Infinity;
  let bestMove: [number, number] | null = null;
  for (const from of mine) {
    for (const to of empties) {
      board[to] = 'cpu';
      board[from] = null;
      const score = minimaxMove(board, true, 0, -Infinity, Infinity, 4);
      board[from] = 'cpu';
      board[to] = null;
      if (bestMove === null || score > bestScore) {
        bestScore = score;
        bestMove = [from, to];
      }
    }
  }
  return bestMove;
}
