// ============================
// Game5: 日月の戦い — Game Logic
// ============================

import {
  Board,
  Cell,
  Game5State,
  Position,
  Piece,
  PieceType,
  Side,
  Action,
  MoveAction,
  DropAction,
  MOVE_DELTAS,
} from './game5Types';

// ─── Helpers ───

function inBounds(pos: Position): boolean {
  return pos.row >= 0 && pos.row <= 2 && pos.col >= 0 && pos.col <= 2;
}

function posEq(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

function cloneBoard(board: Board): Board {
  return board.map(row => [...row]) as Board;
}

function opponent(side: Side): Side {
  return side === 'sun' ? 'moon' : 'sun';
}

function getHand(state: Game5State, side: Side): PieceType[] {
  return side === 'sun' ? state.sunHand : state.moonHand;
}

/** Serialize board + hands + turn for repetition detection */
export function serializePosition(state: Game5State): string {
  const boardStr = state.board
    .map(row =>
      row.map(c => (c ? `${c.side[0]}${c.type[0]}` : '__')).join(',')
    )
    .join('/');
  const sunH = [...state.sunHand].sort().join('');
  const moonH = [...state.moonHand].sort().join('');
  return `${boardStr}|${sunH}|${moonH}|${state.turn}`;
}

// ─── Initial State ───

export function createInitialBoard(): Board {
  return [
    [
      { type: 'fire', side: 'sun' },
      { type: 'king', side: 'sun' },
      { type: 'water', side: 'sun' },
    ],
    [null, null, null],
    [
      { type: 'fire', side: 'moon' },
      { type: 'king', side: 'moon' },
      { type: 'water', side: 'moon' },
    ],
  ];
}

export function createInitialState(): Game5State {
  const state: Game5State = {
    board: createInitialBoard(),
    turn: 'sun',
    sunHand: [],
    moonHand: [],
    phase: 'select',
    winner: null,
    isCheck: false,
    positionHistory: [],
    selectedPos: null,
    selectedHandPiece: null,
    validMoves: [],
    moveCount: 0,
  };
  state.positionHistory.push(serializePosition(state));
  return state;
}

// ─── Find King ───

function findKing(board: Board, side: Side): Position | null {
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cell = board[r][c];
      if (cell && cell.type === 'king' && cell.side === side) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

// ─── Raw Moves (ignoring check) ───

/** Get positions a piece at `from` can move to, not checking for self-check */
export function getRawMoves(board: Board, from: Position): Position[] {
  const piece = board[from.row][from.col];
  if (!piece) return [];

  const deltas = MOVE_DELTAS[piece.type];
  const moves: Position[] = [];

  for (const d of deltas) {
    const to: Position = { row: from.row + d.row, col: from.col + d.col };
    if (!inBounds(to)) continue;
    const target = board[to.row][to.col];
    // Can't move to cell occupied by own piece
    if (target && target.side === piece.side) continue;
    // Can't capture opponent's king directly
    if (target && target.type === 'king' && target.side !== piece.side) continue;
    moves.push(to);
  }

  return moves;
}

/** Get squares attacked by a side (used for check detection) */
function getAttackedSquares(board: Board, side: Side): Position[] {
  const attacked: Position[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const piece = board[r][c];
      if (!piece || piece.side !== side) continue;
      const deltas = MOVE_DELTAS[piece.type];
      for (const d of deltas) {
        const to: Position = { row: r + d.row, col: c + d.col };
        if (inBounds(to)) {
          attacked.push(to);
        }
      }
    }
  }
  return attacked;
}

// ─── Check Detection ───

/** Is the given side's king in check? */
export function isInCheck(board: Board, side: Side): boolean {
  const kingPos = findKing(board, side);
  if (!kingPos) return false;

  const opp = opponent(side);
  const attacked = getAttackedSquares(board, opp);
  return attacked.some(p => posEq(p, kingPos));
}

// ─── Legal Move Validation (no self-check) ───

/** Apply a move on a cloned board and return the new board */
function applyMoveOnBoard(board: Board, from: Position, to: Position): Board {
  const newBoard = cloneBoard(board);
  newBoard[to.row][to.col] = newBoard[from.row][from.col];
  newBoard[from.row][from.col] = null;
  return newBoard;
}

/** Apply a drop on a cloned board */
function applyDropOnBoard(board: Board, piece: Piece, to: Position): Board {
  const newBoard = cloneBoard(board);
  newBoard[to.row][to.col] = piece;
  return newBoard;
}

/** Get legal moves for a piece (filtering out self-check) */
export function getValidMoves(board: Board, from: Position): Position[] {
  const piece = board[from.row][from.col];
  if (!piece) return [];

  const raw = getRawMoves(board, from);
  return raw.filter(to => {
    const newBoard = applyMoveOnBoard(board, from, to);
    return !isInCheck(newBoard, piece.side);
  });
}

/** Get valid drop positions for a side */
export function getValidDropPositions(board: Board, side: Side): Position[] {
  // Sun drops on row 0, Moon drops on row 2
  const dropRow = side === 'sun' ? 0 : 2;
  const positions: Position[] = [];
  for (let c = 0; c < 3; c++) {
    if (board[dropRow][c] === null) {
      positions.push({ row: dropRow, col: c });
    }
  }
  // Filter: dropping must not leave own king in check
  // (Dropping a piece can't directly cause self-check in most cases,
  //  but we validate anyway for correctness)
  return positions.filter(to => {
    const newBoard = applyDropOnBoard(board, { type: 'fire', side }, to);
    return !isInCheck(newBoard, side);
  });
}

/** Get valid drop positions for a specific piece type */
export function getValidDropsForPiece(
  board: Board,
  side: Side,
  pieceType: PieceType
): Position[] {
  const dropRow = side === 'sun' ? 0 : 2;
  const positions: Position[] = [];
  for (let c = 0; c < 3; c++) {
    if (board[dropRow][c] === null) {
      const newBoard = applyDropOnBoard(
        board,
        { type: pieceType, side },
        { row: dropRow, col: c }
      );
      if (!isInCheck(newBoard, side)) {
        positions.push({ row: dropRow, col: c });
      }
    }
  }
  return positions;
}

// ─── Checkmate Detection ───

/** Can the given side make any legal move or drop? */
function hasAnyLegalAction(state: Game5State, side: Side): boolean {
  const { board } = state;

  // Check if any piece can move
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const piece = board[r][c];
      if (piece && piece.side === side) {
        const moves = getValidMoves(board, { row: r, col: c });
        if (moves.length > 0) return true;
      }
    }
  }

  // Check if any hand piece can be dropped
  const hand = getHand(state, side);
  if (hand.length > 0) {
    const dropPositions = getValidDropPositions(board, side);
    if (dropPositions.length > 0) return true;
  }

  return false;
}

/** Is the given side checkmated? */
export function isCheckmate(state: Game5State, side: Side): boolean {
  if (!isInCheck(state.board, side)) return false;
  return !hasAnyLegalAction(state, side);
}

/** Is the current position a stalemate? (no legal moves, not in check) */
export function isStalemate(state: Game5State, side: Side): boolean {
  if (isInCheck(state.board, side)) return false;
  return !hasAnyLegalAction(state, side);
}

// ─── Repetition Detection (Sennichite) ───

export function isThreefoldRepetition(positionHistory: string[]): boolean {
  if (positionHistory.length < 5) return false;
  const last = positionHistory[positionHistory.length - 1];
  let count = 0;
  for (const pos of positionHistory) {
    if (pos === last) count++;
    if (count >= 3) return true;
  }
  return false;
}

// ─── Apply Actions ───

/** Move a piece and return updated state */
export function movePiece(state: Game5State, from: Position, to: Position): Game5State {
  const newBoard = cloneBoard(state.board);
  const piece = newBoard[from.row][from.col]!;
  const captured = newBoard[to.row][to.col];

  // Move piece
  newBoard[to.row][to.col] = piece;
  newBoard[from.row][from.col] = null;

  // Handle capture
  const newSunHand = [...state.sunHand];
  const newMoonHand = [...state.moonHand];
  if (captured && captured.type !== 'king') {
    // Captured piece becomes the capturer's piece
    if (piece.side === 'sun') {
      newSunHand.push(captured.type);
    } else {
      newMoonHand.push(captured.type);
    }
  }

  const nextTurn = opponent(state.turn);
  const newState: Game5State = {
    ...state,
    board: newBoard,
    turn: nextTurn,
    sunHand: newSunHand,
    moonHand: newMoonHand,
    phase: 'select',
    selectedPos: null,
    selectedHandPiece: null,
    validMoves: [],
    moveCount: state.moveCount + 1,
    isCheck: false,
    winner: null,
    positionHistory: [...state.positionHistory],
  };

  // Record position for repetition
  const posKey = serializePosition(newState);
  newState.positionHistory.push(posKey);

  // Check for threefold repetition
  if (isThreefoldRepetition(newState.positionHistory)) {
    newState.winner = 'draw';
    newState.phase = 'gameover';
    return newState;
  }

  // Check if opponent is in check
  newState.isCheck = isInCheck(newBoard, nextTurn);

  // Check for checkmate
  if (isCheckmate(newState, nextTurn)) {
    newState.winner = state.turn; // current player wins
    newState.phase = 'gameover';
  }

  // Check for stalemate
  if (isStalemate(newState, nextTurn)) {
    newState.winner = 'draw';
    newState.phase = 'gameover';
  }

  return newState;
}

/** Drop a captured piece onto the board */
export function dropPiece(
  state: Game5State,
  pieceType: PieceType,
  to: Position
): Game5State {
  const newBoard = cloneBoard(state.board);
  newBoard[to.row][to.col] = { type: pieceType, side: state.turn };

  // Remove from hand
  const newSunHand = [...state.sunHand];
  const newMoonHand = [...state.moonHand];
  if (state.turn === 'sun') {
    const idx = newSunHand.indexOf(pieceType);
    if (idx !== -1) newSunHand.splice(idx, 1);
  } else {
    const idx = newMoonHand.indexOf(pieceType);
    if (idx !== -1) newMoonHand.splice(idx, 1);
  }

  const nextTurn = opponent(state.turn);
  const newState: Game5State = {
    ...state,
    board: newBoard,
    turn: nextTurn,
    sunHand: newSunHand,
    moonHand: newMoonHand,
    phase: 'select',
    selectedPos: null,
    selectedHandPiece: null,
    validMoves: [],
    moveCount: state.moveCount + 1,
    isCheck: false,
    winner: null,
    positionHistory: [...state.positionHistory],
  };

  const posKey = serializePosition(newState);
  newState.positionHistory.push(posKey);

  if (isThreefoldRepetition(newState.positionHistory)) {
    newState.winner = 'draw';
    newState.phase = 'gameover';
    return newState;
  }

  newState.isCheck = isInCheck(newBoard, nextTurn);

  if (isCheckmate(newState, nextTurn)) {
    newState.winner = state.turn;
    newState.phase = 'gameover';
  }

  if (isStalemate(newState, nextTurn)) {
    newState.winner = 'draw';
    newState.phase = 'gameover';
  }

  return newState;
}

// ─── Get All Legal Actions ───

export function getAllLegalActions(state: Game5State, side: Side): Action[] {
  const actions: Action[] = [];
  const { board } = state;

  // Board moves
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const piece = board[r][c];
      if (piece && piece.side === side) {
        const from: Position = { row: r, col: c };
        const moves = getValidMoves(board, from);
        for (const to of moves) {
          actions.push({ kind: 'move', from, to });
        }
      }
    }
  }

  // Hand drops
  const hand = getHand(state, side);
  const uniqueTypes = [...new Set(hand)];
  for (const pt of uniqueTypes) {
    const drops = getValidDropsForPiece(board, side, pt);
    for (const to of drops) {
      actions.push({ kind: 'drop', piece: pt, to });
    }
  }

  return actions;
}
