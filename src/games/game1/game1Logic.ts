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

// === プレイヤーがコインを配置 ===
export function handlePlace(state: GameState, cellIndex: number): GameState {
  if (!state.active || state.phase !== 'place' || state.turn !== 'player') {
    return state;
  }
  if (state.board[cellIndex] !== null) {
    return state;
  }
  if (state.playerPlaced >= MAX_PLACE_COUNT) {
    return state;
  }

  const newBoard = [...state.board];
  newBoard[cellIndex] = 'player';
  const newPlayerPlaced = state.playerPlaced + 1;

  // 配置後の勝利チェック
  const winLine = getWinLine(newBoard, 'player');
  if (winLine) {
    return {
      ...state,
      board: newBoard,
      playerPlaced: newPlayerPlaced,
      winLine,
      active: false,
    };
  }

  // 両者4枚配置完了 -> 移動フェーズへ
  if (newPlayerPlaced >= MAX_PLACE_COUNT && state.cpuPlaced >= MAX_PLACE_COUNT) {
    return {
      ...state,
      board: newBoard,
      playerPlaced: newPlayerPlaced,
      phase: 'move',
      turn: 'player',
      moveRound: 1,
    };
  }

  return {
    ...state,
    board: newBoard,
    playerPlaced: newPlayerPlaced,
    turn: 'cpu',
  };
}

// === プレイヤーがコインを移動 ===
export function handleMove(
  state: GameState,
  from: number,
  to: number,
): GameState {
  if (!state.active || state.phase !== 'move' || state.turn !== 'player') {
    return state;
  }
  if (state.board[from] !== 'player') {
    return state;
  }
  if (state.board[to] !== null) {
    return state;
  }

  const newBoard = [...state.board];
  newBoard[from] = null;
  newBoard[to] = 'player';

  const winLine = getWinLine(newBoard, 'player');
  if (winLine) {
    return {
      ...state,
      board: newBoard,
      selected: null,
      winLine,
      active: false,
    };
  }

  return {
    ...state,
    board: newBoard,
    selected: null,
    turn: 'cpu',
  };
}

// === セル選択 ===
export function handleSelect(state: GameState, cellIndex: number): GameState {
  if (!state.active || state.phase !== 'move' || state.turn !== 'player') {
    return state;
  }

  // 自分のコインを選択
  if (state.board[cellIndex] === 'player') {
    const validMoves = getValidMoves(state.board, cellIndex);
    if (validMoves.length > 0) {
      return { ...state, selected: cellIndex };
    }
    return state;
  }

  // 選択済みのコインから移動先をタップ（空きマスならどこでも移動可能）
  if (state.selected !== null && state.board[cellIndex] === null) {
    return handleMove(state, state.selected, cellIndex);
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
