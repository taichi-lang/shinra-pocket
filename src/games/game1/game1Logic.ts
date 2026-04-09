// Game1 Logic — Full game state management

import type { CellState, GameState, GamePhase } from '../../game/types';
import { createInitialGameState } from '../../game/types';
import { checkWin, getWinLine, cpuPlace, cpuMove } from './game1AI';
import type { Difficulty } from './game1Types';

const MAX_PLACE_COUNT = 4;

// === 有効な移動先を取得（空きマスならどこでも移動可能） ===
export function getValidMoves(board: CellState[], from: number): number[] {
  return board
    .map((v, i) => (v === null && i !== from ? i : -1))
    .filter((i) => i !== -1);
}

// === プレイヤーがコインを配置 (isLocal: ローカル対戦時はcpuターンも人間操作) ===
export function handlePlace(state: GameState, cellIndex: number, isLocal = false): GameState {
  if (!state.active || state.phase !== 'place') {
    return state;
  }
  // ローカルでなければplayerターンのみ
  if (!isLocal && state.turn !== 'player') {
    return state;
  }
  if (state.board[cellIndex] !== null) {
    return state;
  }

  const currentSide = state.turn; // 'player' or 'cpu'
  const placedKey = currentSide === 'player' ? 'playerPlaced' : 'cpuPlaced';
  const currentPlaced = state[placedKey];

  if (currentPlaced >= MAX_PLACE_COUNT) {
    return state;
  }

  const newBoard = [...state.board];
  newBoard[cellIndex] = currentSide;
  const newPlaced = currentPlaced + 1;

  // 配置後の勝利チェック
  const winLine = getWinLine(newBoard, currentSide);
  if (winLine) {
    return {
      ...state,
      board: newBoard,
      [placedKey]: newPlaced,
      winLine,
      active: false,
    };
  }

  const otherPlacedKey = currentSide === 'player' ? 'cpuPlaced' : 'playerPlaced';
  const otherPlaced = state[otherPlacedKey];

  // 両者4枚配置完了 -> 移動フェーズへ
  if (newPlaced >= MAX_PLACE_COUNT && otherPlaced >= MAX_PLACE_COUNT) {
    return {
      ...state,
      board: newBoard,
      [placedKey]: newPlaced,
      phase: 'move',
      turn: 'player',
      moveRound: 1,
    };
  }

  const nextTurn = currentSide === 'player' ? 'cpu' : 'player';
  return {
    ...state,
    board: newBoard,
    [placedKey]: newPlaced,
    turn: nextTurn,
  };
}

// === プレイヤーがコインを移動 (isLocal: ローカル対戦対応) ===
export function handleMove(
  state: GameState,
  from: number,
  to: number,
  isLocal = false,
): GameState {
  if (!state.active || state.phase !== 'move') {
    return state;
  }
  if (!isLocal && state.turn !== 'player') {
    return state;
  }

  const currentSide = state.turn;
  if (state.board[from] !== currentSide) {
    return state;
  }
  if (state.board[to] !== null) {
    return state;
  }

  const newBoard = [...state.board];
  newBoard[from] = null;
  newBoard[to] = currentSide;

  const winLine = getWinLine(newBoard, currentSide);
  if (winLine) {
    return {
      ...state,
      board: newBoard,
      selected: null,
      winLine,
      active: false,
    };
  }

  const nextTurn = currentSide === 'player' ? 'cpu' : 'player';
  return {
    ...state,
    board: newBoard,
    selected: null,
    turn: nextTurn,
    moveRound: nextTurn === 'player' ? state.moveRound + 1 : state.moveRound,
  };
}

// === セル選択 (isLocal: ローカル対戦時は現在のターンの駒のみ選択可能) ===
export function handleSelect(state: GameState, cellIndex: number, isLocal = false): GameState {
  if (!state.active || state.phase !== 'move') {
    return state;
  }
  if (!isLocal && state.turn !== 'player') {
    return state;
  }

  const currentSide = state.turn;

  // 自分のコインを選択（ローカルではターン側の駒のみ）
  if (state.board[cellIndex] === currentSide) {
    const validMoves = getValidMoves(state.board, cellIndex);
    if (validMoves.length > 0) {
      return { ...state, selected: cellIndex };
    }
    return state;
  }

  // 選択済みのコインから移動先をタップ（空きマスならどこでも移動可能）
  if (state.selected !== null && state.board[cellIndex] === null) {
    return handleMove(state, state.selected, cellIndex, isLocal);
  }

  return state;
}

// === CPU配置ターン ===
export function executeCpuPlace(
  state: GameState,
  difficulty: Difficulty,
): GameState {
  if (!state.active || state.phase !== 'place' || state.turn !== 'cpu') {
    return state;
  }
  if (state.cpuPlaced >= MAX_PLACE_COUNT) {
    return state;
  }

  const cellIndex = cpuPlace(state.board, difficulty, state.playerPlaced, state.cpuPlaced);
  const newBoard = [...state.board];
  newBoard[cellIndex] = 'cpu';
  const newCpuPlaced = state.cpuPlaced + 1;

  const winLine = getWinLine(newBoard, 'cpu');
  if (winLine) {
    return {
      ...state,
      board: newBoard,
      cpuPlaced: newCpuPlaced,
      winLine,
      active: false,
    };
  }

  // 両者4枚配置完了 -> 移動フェーズへ
  if (state.playerPlaced >= MAX_PLACE_COUNT && newCpuPlaced >= MAX_PLACE_COUNT) {
    return {
      ...state,
      board: newBoard,
      cpuPlaced: newCpuPlaced,
      phase: 'move',
      turn: 'player',
      moveRound: 1,
    };
  }

  return {
    ...state,
    board: newBoard,
    cpuPlaced: newCpuPlaced,
    turn: 'player',
  };
}

// === CPU移動ターン ===
export function executeCpuMove(
  state: GameState,
  difficulty: Difficulty,
): GameState {
  if (!state.active || state.phase !== 'move' || state.turn !== 'cpu') {
    return state;
  }

  const move = cpuMove(state.board, difficulty);
  if (!move) {
    // CPUが動けない → 引き分け
    return { ...state, active: false };
  }

  const [from, to] = move;
  const newBoard = [...state.board];
  newBoard[from] = null;
  newBoard[to] = 'cpu';

  const winLine = getWinLine(newBoard, 'cpu');
  if (winLine) {
    return {
      ...state,
      board: newBoard,
      winLine,
      active: false,
    };
  }

  return {
    ...state,
    board: newBoard,
    turn: 'player',
    moveRound: state.moveRound + 1,
  };
}

// === ゲーム結果の判定 ===
export function checkGameOver(
  state: GameState,
): 'player' | 'cpu' | 'draw' | null {
  if (state.active) return null;

  if (state.winLine) {
    const winner = state.board[state.winLine[0]];
    if (winner === 'player') return 'player';
    if (winner === 'cpu') return 'cpu';
  }

  return 'draw';
}

// === プレイヤーが動けるかチェック ===
export function canPlayerMove(board: CellState[]): boolean {
  const playerCells = board
    .map((v, i) => (v === 'player' ? i : -1))
    .filter((i) => i !== -1);

  return playerCells.some((from) => getValidMoves(board, from).length > 0);
}
