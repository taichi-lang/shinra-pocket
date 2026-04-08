// ============================
// Game5: 日月の戦い — Types
// ============================

/** Piece types */
export type PieceType = 'king' | 'fire' | 'water';

/** Player sides */
export type Side = 'sun' | 'moon';

/** Board position (row 0-2, col 0-2) */
export interface Position {
  row: number;
  col: number;
}

/** A piece on the board or in hand */
export interface Piece {
  type: PieceType;
  side: Side;
}

/** A single cell on the board */
export type Cell = Piece | null;

/** 3x3 board: board[row][col] */
export type Board = [
  [Cell, Cell, Cell],
  [Cell, Cell, Cell],
  [Cell, Cell, Cell],
];

/** Difficulty level */
export type Difficulty = 'normal' | 'hard';

/** Game mode */
export type GameMode = 'cpu' | 'local';

/** Game phase */
export type GamePhase = 'select' | 'move' | 'drop' | 'gameover';

/** A move action */
export interface MoveAction {
  kind: 'move';
  from: Position;
  to: Position;
}

/** A drop action (placing captured piece) */
export interface DropAction {
  kind: 'drop';
  piece: PieceType;
  to: Position;
}

export type Action = MoveAction | DropAction;

/** Full game state */
export interface Game5State {
  board: Board;
  turn: Side;
  sunHand: PieceType[];   // captured pieces held by sun
  moonHand: PieceType[];  // captured pieces held by moon
  phase: GamePhase;
  winner: Side | 'draw' | null;
  isCheck: boolean;
  positionHistory: string[];  // kept for compatibility (unused)
  selectedPos: Position | null;
  selectedHandPiece: PieceType | null;
  validMoves: Position[];
  moveCount: number;
}

// === Piece display info ===
export const PIECE_EMOJI: Record<PieceType, string> = {
  king: '',      // side emoji used instead
  fire: '\u{1F525}',    // fire
  water: '\u{1F4A7}',   // water drop
};

export const SIDE_EMOJI: Record<Side, string> = {
  sun: '\u{2600}\u{FE0F}',    // sun
  moon: '\u{1F319}',   // crescent moon
};

// === Movement deltas per piece type ===
export const MOVE_DELTAS: Record<PieceType, Position[]> = {
  king: [
    { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
    { row: 0, col: -1 },                        { row: 0, col: 1 },
    { row: 1, col: -1 },  { row: 1, col: 0 },  { row: 1, col: 1 },
  ],
  fire: [
    { row: -1, col: -1 }, { row: -1, col: 1 },
    { row: 1, col: -1 },  { row: 1, col: 1 },
  ],
  water: [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
  ],
};
