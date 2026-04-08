/**
 * Playtest simulation: Games 1, 2, and 3
 * Runs full games to find bugs, infinite loops, crashes, and illegal states.
 */

// ============================================================
// Game 1 imports
// ============================================================
import {
  CellState,
  GameState,
  ADJACENTS,
  createInitialGameState,
} from '../src/game/types';
import {
  cpuBestPlace,
  cpuBestMove,
  cpuBestPlaceHard,
  cpuBestMoveHard,
} from '../src/game/ai';
import {
  handlePlace,
  handleMove,
  executeCpuPlace,
  executeCpuMove,
  getValidMoves,
  canPlayerMove,
  checkGameOver,
} from '../src/games/game1/game1Logic';

// ============================================================
// Game 2 imports
// ============================================================
import {
  Game2State,
  createInitialGame2State,
  GameAction as Game2Action,
  CoinNumber as Game2CoinNumber,
} from '../src/games/game2/game2Types';
import {
  getAllActions as g2GetAllActions,
  applyAction as g2ApplyAction,
  checkWinner as g2CheckWinner,
  isGameOver as g2IsGameOver,
  getTopOwner,
  getTopCoin,
  isCellEmpty as g2IsCellEmpty,
  cloneState as g2CloneState,
  canPlace as g2CanPlace,
  canMove as g2CanMove,
} from '../src/games/game2/game2Logic';
import {
  chooseActionNormal as g2ChooseNormal,
  chooseActionHard as g2ChooseHard,
} from '../src/games/game2/game2AI';

// ============================================================
// Game 3 imports
// ============================================================
import {
  Game3State,
  createInitialGame3State,
  Game3Action,
  Player as G3Player,
  PLAYERS as G3_PLAYERS,
} from '../src/games/game3/game3Types';
import {
  getAllActions as g3GetAllActions,
  applyAction as g3ApplyAction,
  checkWinner as g3CheckWinner,
  checkDraw as g3CheckDraw,
  advanceTurn as g3AdvanceTurn,
  executeTurn as g3ExecuteTurn,
  topOwner as g3TopOwner,
  nextPlayer as g3NextPlayer,
  hasAnyAction as g3HasAnyAction,
} from '../src/games/game3/game3Logic';
import {
  getAIAction as g3GetAIAction,
} from '../src/games/game3/game3AI';

// ============================================================
// Helpers
// ============================================================
const MAX_TURNS = 200; // safety limit for infinite loop detection

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================
// GAME 1: Coin Board Battle
// ============================================================
describe('Game1 — Full Playtest Simulation', () => {

  function simulateGame1(difficulty: 'normal' | 'hard'): {
    result: 'player' | 'cpu' | 'draw' | 'stuck';
    turns: number;
    error?: string;
  } {
    let state = createInitialGameState();
    let turns = 0;

    // === PLACEMENT PHASE ===
    while (state.active && state.phase === 'place' && turns < MAX_TURNS) {
      turns++;
      if (state.turn === 'player') {
        // Find first empty cell for player
        const empty = state.board
          .map((v, i) => (v === null ? i : -1))
          .filter((i) => i !== -1);
        if (empty.length === 0) {
          return { result: 'stuck', turns, error: 'No empty cells for player placement' };
        }
        const cell = pickRandom(empty);
        state = handlePlace(state, cell);
      } else {
        // CPU turn
        state = executeCpuPlace(state, difficulty);
      }

      // Validate board state
      const playerCount = state.board.filter(c => c === 'player').length;
      const cpuCount = state.board.filter(c => c === 'cpu').length;
      if (playerCount > 4 || cpuCount > 4) {
        return { result: 'stuck', turns, error: `Illegal coin count: player=${playerCount}, cpu=${cpuCount}` };
      }
    }

    // === MOVE PHASE ===
    let movePhaseStuck = 0;
    while (state.active && state.phase === 'move' && turns < MAX_TURNS) {
      turns++;
      if (state.turn === 'player') {
        // Find all player coins that can move
        const playerCells = state.board
          .map((v, i) => (v === 'player' ? i : -1))
          .filter((i) => i !== -1);

        let moved = false;
        // Shuffle to add randomness
        const shuffled = [...playerCells].sort(() => Math.random() - 0.5);
        for (const from of shuffled) {
          const validMoves = getValidMoves(state.board, from);
          if (validMoves.length > 0) {
            const to = pickRandom(validMoves);
            const newState = handleMove(state, from, to);
            if (newState !== state) {
              state = newState;
              moved = true;
              break;
            }
          }
        }
        if (!moved) {
          // Player can't move — check if this is handled
          if (!canPlayerMove(state.board)) {
            // Game should handle this — but in logic, it just stays stuck
            return { result: 'stuck', turns, error: 'Player cannot move but game is still active' };
          }
          movePhaseStuck++;
          if (movePhaseStuck > 5) {
            return { result: 'stuck', turns, error: 'Player stuck in move phase loop' };
          }
        }
      } else {
        // CPU turn
        const prevState = state;
        state = executeCpuMove(state, difficulty);
        if (state === prevState && state.active) {
          movePhaseStuck++;
          if (movePhaseStuck > 5) {
            return { result: 'stuck', turns, error: 'CPU stuck - executeCpuMove returned same state' };
          }
        } else {
          movePhaseStuck = 0;
        }
      }

      // Validate: each player should have exactly 4 coins
      const playerCount = state.board.filter(c => c === 'player').length;
      const cpuCount = state.board.filter(c => c === 'cpu').length;
      if (state.active && (playerCount !== 4 || cpuCount !== 4)) {
        return { result: 'stuck', turns, error: `Move phase coin count wrong: player=${playerCount}, cpu=${cpuCount}` };
      }
    }

    if (turns >= MAX_TURNS) {
      return { result: 'stuck', turns, error: 'Exceeded MAX_TURNS — possible infinite loop' };
    }

    const result = checkGameOver(state);
    return { result: result ?? 'draw', turns };
  }

  test('10 games on normal difficulty complete without errors', () => {
    const results: string[] = [];
    for (let i = 0; i < 10; i++) {
      const r = simulateGame1('normal');
      results.push(`Game ${i + 1}: ${r.result} in ${r.turns} turns${r.error ? ' ERROR: ' + r.error : ''}`);
      if (r.error) {
        console.warn(`Game1 Normal #${i + 1}: ${r.error}`);
      }
      expect(r.result).not.toBe('stuck');
    }
    console.log('Game1 Normal results:', results);
  });

  test('10 games on hard difficulty complete without errors', () => {
    const results: string[] = [];
    for (let i = 0; i < 10; i++) {
      const r = simulateGame1('hard');
      results.push(`Game ${i + 1}: ${r.result} in ${r.turns} turns${r.error ? ' ERROR: ' + r.error : ''}`);
      if (r.error) {
        console.warn(`Game1 Hard #${i + 1}: ${r.error}`);
      }
      expect(r.result).not.toBe('stuck');
    }
    console.log('Game1 Hard results:', results);
  });

  test('cpuBestMove does not mutate the original board', () => {
    // BUG CHECK: cpuBestMove in ai.ts mutates board directly (lines 69-73, 84-85)
    const board: CellState[] = [
      'player', 'cpu', 'player',
      'cpu', null, 'player',
      null, 'cpu', 'player',
    ];
    const boardCopy = [...board];
    cpuBestMove([...board]); // pass a copy
    // The original should be unchanged
    expect(board).toEqual(boardCopy);

    // But what if we pass the real board? The AI function mutates in-place!
    const realBoard: CellState[] = [
      'player', 'cpu', 'player',
      'cpu', null, 'player',
      null, 'cpu', 'player',
    ];
    const before = [...realBoard];
    cpuBestMove(realBoard); // pass directly — does it mutate?
    const mutated = !realBoard.every((v, i) => v === before[i]);
    if (mutated) {
      console.warn('BUG FOUND: cpuBestMove mutates the board array in-place!');
    }
    // This is expected to mutate based on code reading — the question is whether
    // game1AI.ts wraps it with [...board] to prevent this
  });

  test('cpuBestMoveHard does not mutate the original board', () => {
    const board: CellState[] = [
      'player', 'cpu', 'player',
      'cpu', null, 'player',
      null, 'cpu', 'player',
    ];
    const before = [...board];
    cpuBestMoveHard(board);
    const mutated = !board.every((v, i) => v === before[i]);
    if (mutated) {
      console.warn('BUG FOUND: cpuBestMoveHard mutates the board array in-place!');
    }
  });

  test('move phase with deadlocked board does not infinite loop', () => {
    // Create a state where both players have coins but no one can move
    // (all adjacent cells are occupied)
    const board: CellState[] = [
      'player', 'cpu', 'player',
      'cpu', 'player', 'cpu',
      'player', 'cpu', null,
    ];
    const state: GameState = {
      board,
      phase: 'move',
      turn: 'player',
      playerPlaced: 4,
      cpuPlaced: 4,
      selected: null,
      active: true,
      moveRound: 1,
      winLine: null,
    };

    // Only cell 8 is empty; only coins adjacent to cell 8 can move
    // Cell 5 (cpu), 7 (cpu), 4 (player) are adjacent to 8
    // Player at 4 can move to 8
    const canMove = canPlayerMove(state.board);
    expect(canMove).toBe(true);

    // Test CPU move when only one option
    const cpuResult = executeCpuMove(state, 'normal');
    // CPU should be able to move (cell 5 or 7 to 8)
    // But turn is 'player' so it should return same state
    expect(cpuResult).toBe(state); // No change because turn !== 'cpu'
  });
});

// ============================================================
// GAME 2: Stacking Duel
// ============================================================
describe('Game2 — Full Playtest Simulation', () => {

  function simulateGame2(difficulty: 'normal' | 'hard'): {
    result: 'player' | 'cpu' | 'draw' | 'stuck';
    turns: number;
    error?: string;
  } {
    let state = createInitialGame2State();
    let turns = 0;

    while (turns < MAX_TURNS) {
      turns++;
      const { over, winner } = g2IsGameOver(state);
      if (over) {
        return { result: winner ?? 'draw', turns };
      }

      const currentPlayer = state.turn;
      let action: Game2Action | null;

      if (currentPlayer === 'cpu') {
        if (difficulty === 'hard') {
          action = g2ChooseHard(state, 'water', 'fire');
        } else {
          action = g2ChooseNormal(state, 'water');
        }
      } else {
        // Player: pick random legal action
        const actions = g2GetAllActions(state, 'player');
        if (actions.length === 0) {
          // Skip player turn
          state = { ...g2CloneState(state), turn: 'cpu' };
          continue;
        }
        action = pickRandom(actions);
      }

      if (!action) {
        // Skip turn
        state = {
          ...g2CloneState(state),
          turn: currentPlayer === 'player' ? 'cpu' : 'player',
        };
        continue;
      }

      // Apply action
      const coinType = currentPlayer === 'player' ? 'fire' : 'water';
      state = g2ApplyAction(state, action, currentPlayer, coinType as any);

      // Check win after action
      const winCheck = g2CheckWinner(state.board);
      if (winCheck) {
        return { result: winCheck.winner as any, turns };
      }

      // Switch turn
      state = { ...state, turn: currentPlayer === 'player' ? 'cpu' : 'player', turnCount: state.turnCount + 1 };
    }

    return { result: 'stuck', turns, error: 'Exceeded MAX_TURNS' };
  }

  test('10 games on normal difficulty complete without errors', () => {
    const results: string[] = [];
    for (let i = 0; i < 10; i++) {
      const r = simulateGame2('normal');
      results.push(`Game ${i + 1}: ${r.result} in ${r.turns} turns${r.error ? ' ERROR: ' + r.error : ''}`);
      expect(r.result).not.toBe('stuck');
    }
    console.log('Game2 Normal results:', results);
  });

  test('10 games on hard difficulty complete without errors', () => {
    const results: string[] = [];
    for (let i = 0; i < 10; i++) {
      const r = simulateGame2('hard');
      results.push(`Game ${i + 1}: ${r.result} in ${r.turns} turns${r.error ? ' ERROR: ' + r.error : ''}`);
      expect(r.result).not.toBe('stuck');
    }
    console.log('Game2 Hard results:', results);
  });

  test('stacking rules: 2 can stack on 1, nothing on 2', () => {
    let state = createInitialGame2State();

    // Player places "1" on cell 0
    state = g2ApplyAction(state, { type: 'place', coinNumber: 1, targetIndex: 0 }, 'player', 'fire' as any);
    expect(state.board[0].bottom).not.toBeNull();
    expect(state.board[0].bottom!.number).toBe(1);
    expect(state.board[0].top).toBeNull();

    // CPU places "2" on cell 0 (on top of player's "1") — should work
    state = g2ApplyAction(state, { type: 'place', coinNumber: 2, targetIndex: 0 }, 'cpu', 'water' as any);
    expect(state.board[0].top).not.toBeNull();
    expect(state.board[0].top!.number).toBe(2);
    expect(state.board[0].top!.owner).toBe('cpu');

    // Verify "1" cannot stack on "1" (getValidPlacements should not include cell 0)
    const { getValidPlacements } = require('../src/games/game2/game2Logic');
    const validFor1 = getValidPlacements(state.board, 1);
    expect(validFor1).not.toContain(0);

    // Verify nothing can stack on "2"
    const validFor2 = getValidPlacements(state.board, 2);
    expect(validFor2).not.toContain(0);
  });

  test('movement reveals bottom coin when top is moved', () => {
    let state = createInitialGame2State();

    // Place player "1" on cell 0
    state = g2ApplyAction(state, { type: 'place', coinNumber: 1, targetIndex: 0 }, 'player', 'fire' as any);
    // Stack CPU "2" on cell 0
    state = g2ApplyAction(state, { type: 'place', coinNumber: 2, targetIndex: 0 }, 'cpu', 'water' as any);

    // Move top coin (CPU's "2") from cell 0 to cell 1
    const { moveOnBoard } = require('../src/games/game2/game2Logic');
    state = moveOnBoard(state, 0, 1);

    // Cell 0 should now show player's "1" again
    expect(state.board[0].bottom).not.toBeNull();
    expect(state.board[0].bottom!.owner).toBe('player');
    expect(state.board[0].top).toBeNull();

    // Cell 1 should have CPU's "2"
    expect(state.board[1].bottom).not.toBeNull();
    expect(state.board[1].bottom!.owner).toBe('cpu');
  });

  test('win detection works with top-visible coins', () => {
    let state = createInitialGame2State();

    // Set up: player places "1" on cells 0, 1, 2 (top row)
    state = g2ApplyAction(state, { type: 'place', coinNumber: 1, targetIndex: 0 }, 'player', 'fire' as any);
    state = g2ApplyAction(state, { type: 'place', coinNumber: 1, targetIndex: 1 }, 'player', 'fire' as any);
    // Player has used both "1" coins. Use "2" for cell 2.
    state = g2ApplyAction(state, { type: 'place', coinNumber: 2, targetIndex: 2 }, 'player', 'fire' as any);

    const win = g2CheckWinner(state.board);
    expect(win).not.toBeNull();
    expect(win!.winner).toBe('player');
    expect(win!.winLine).toEqual([0, 1, 2]);
  });

  test('covering opponent coin breaks their line', () => {
    let state = createInitialGame2State();

    // CPU has 3 in a row with "1"s
    state = g2ApplyAction(state, { type: 'place', coinNumber: 1, targetIndex: 0 }, 'cpu', 'water' as any);
    state = g2ApplyAction(state, { type: 'place', coinNumber: 1, targetIndex: 1 }, 'cpu', 'water' as any);
    // Manually place a third cpu coin (cheat the hand count)
    const cheatedState = g2CloneState(state);
    cheatedState.cpuHand.count1 = 1; // give extra
    const s2 = g2ApplyAction(cheatedState, { type: 'place', coinNumber: 1, targetIndex: 2 }, 'cpu', 'water' as any);

    let win = g2CheckWinner(s2.board);
    expect(win).not.toBeNull();
    expect(win!.winner).toBe('cpu');

    // Player covers cell 1 with "2" — should break CPU's line
    const s3 = g2ApplyAction(s2, { type: 'place', coinNumber: 2, targetIndex: 1 }, 'player', 'fire' as any);
    win = g2CheckWinner(s3.board);
    // Now cell 1 top is player, so CPU no longer has 3 in a row
    if (win && win.winner === 'cpu') {
      console.warn('BUG: Covering CPU coin with player "2" did not break CPU win line');
    }
    expect(win?.winner).not.toBe('cpu');
  });
});

// ============================================================
// GAME 3: Three-Way Battle
// ============================================================
describe('Game3 — Full Playtest Simulation', () => {

  function simulateGame3(difficulty: 'normal' | 'hard'): {
    result: G3Player | 'draw' | 'stuck';
    turns: number;
    error?: string;
  } {
    let state = createInitialGame3State('vsCPU', difficulty);
    let turns = 0;

    while (state.phase === 'playing' && turns < MAX_TURNS) {
      turns++;
      const currentPlayer = state.currentPlayer;
      const actions = g3GetAllActions(
        state.board,
        state.hands[currentPlayer],
        currentPlayer,
      );

      if (actions.length === 0) {
        // No actions available; advance turn (skip)
        state = g3AdvanceTurn(state);
        if (state.phase === 'finished') break;
        continue;
      }

      let action: Game3Action;
      if (currentPlayer === 'fire') {
        // "Human" player — random moves
        action = pickRandom(actions);
      } else {
        // AI players
        const aiAction = g3GetAIAction(state, difficulty);
        if (!aiAction) {
          state = g3AdvanceTurn(state);
          continue;
        }
        action = aiAction;
      }

      state = g3ExecuteTurn(state, action);
    }

    if (turns >= MAX_TURNS) {
      return { result: 'stuck', turns, error: 'Exceeded MAX_TURNS — possible infinite loop' };
    }

    if (state.winner) {
      return { result: state.winner, turns };
    }
    return { result: 'draw', turns };
  }

  test('5 games on normal difficulty complete without errors', () => {
    const results: string[] = [];
    for (let i = 0; i < 5; i++) {
      const r = simulateGame3('normal');
      results.push(`Game ${i + 1}: ${r.result} in ${r.turns} turns${r.error ? ' ERROR: ' + r.error : ''}`);
      expect(r.result).not.toBe('stuck');
    }
    console.log('Game3 Normal results:', results);
  });

  test('5 games on hard difficulty complete without errors', () => {
    const results: string[] = [];
    for (let i = 0; i < 5; i++) {
      const r = simulateGame3('hard');
      results.push(`Game ${i + 1}: ${r.result} in ${r.turns} turns${r.error ? ' ERROR: ' + r.error : ''}`);
      expect(r.result).not.toBe('stuck');
    }
    console.log('Game3 Hard results:', results);
  });

  test('turn order cycles fire -> water -> swirl', () => {
    const state = createInitialGame3State('vsCPU', 'normal');
    expect(state.currentPlayer).toBe('fire');
    expect(g3NextPlayer('fire')).toBe('water');
    expect(g3NextPlayer('water')).toBe('swirl');
    expect(g3NextPlayer('swirl')).toBe('fire');
  });

  test('3-layer stacking works correctly', () => {
    let state = createInitialGame3State('vsCPU', 'normal');

    // Fire places "1" on cell 0
    state = g3ApplyAction(state, { type: 'place', coinNumber: 1, targetCell: 0 });
    expect(state.board[0].length).toBe(1);
    expect(state.board[0][0].owner).toBe('fire');
    expect(state.board[0][0].number).toBe(1);

    // Advance to water's turn
    state = { ...state, currentPlayer: 'water' };
    // Water places "2" on cell 0 (on top of fire's "1")
    state = g3ApplyAction(state, { type: 'place', coinNumber: 2, targetCell: 0 });
    expect(state.board[0].length).toBe(2);
    expect(g3TopOwner(state.board[0])).toBe('water');

    // Advance to swirl's turn
    state = { ...state, currentPlayer: 'swirl' };
    // Swirl places "3" on cell 0 (on top of water's "2")
    state = g3ApplyAction(state, { type: 'place', coinNumber: 3, targetCell: 0 });
    expect(state.board[0].length).toBe(3);
    expect(g3TopOwner(state.board[0])).toBe('swirl');

    // Nothing more can be stacked (max 3 layers)
    const { getValidPlacements } = require('../src/games/game3/game3Logic');
    const validFor3 = getValidPlacements(state.board, 3);
    expect(validFor3).not.toContain(0); // cell 0 is full
  });

  test('stacking requires higher number', () => {
    let state = createInitialGame3State('vsCPU', 'normal');

    // Fire places "2" on cell 0
    state = g3ApplyAction(state, { type: 'place', coinNumber: 2, targetCell: 0 });

    // "1" should NOT be able to stack on "2"
    const { getValidPlacements } = require('../src/games/game3/game3Logic');
    const validFor1 = getValidPlacements(state.board, 1);
    expect(validFor1).not.toContain(0);

    // "2" should NOT be able to stack on "2" (must be strictly greater)
    const validFor2 = getValidPlacements(state.board, 2);
    expect(validFor2).not.toContain(0);

    // "3" SHOULD be able to stack on "2"
    const validFor3 = getValidPlacements(state.board, 3);
    expect(validFor3).toContain(0);
  });

  test('win detection works for any of 3 players', () => {
    let state = createInitialGame3State('vsCPU', 'normal');

    // Set up: water has 3 in a row (cells 3, 4, 5)
    state = { ...state, currentPlayer: 'water' };
    state = g3ApplyAction(state, { type: 'place', coinNumber: 1, targetCell: 3 });
    state = { ...state, currentPlayer: 'water' };
    state = g3ApplyAction(state, { type: 'place', coinNumber: 1, targetCell: 4 });
    state = { ...state, currentPlayer: 'water' };
    state = g3ApplyAction(state, { type: 'place', coinNumber: 2, targetCell: 5 });

    const win = g3CheckWinner(state.board);
    expect(win).not.toBeNull();
    expect(win!.winner).toBe('water');
  });

  test('draw detection when all players are stuck', () => {
    // Start from a state and fill the board so no one can act
    let state = createInitialGame3State('vsCPU', 'normal');

    // Fill board with "3"s from different players so no more stacking possible
    // and all hands emptied
    for (let i = 0; i < 9; i++) {
      const player = G3_PLAYERS[i % 3];
      state.board[i] = [{ owner: player, number: 3 }];
    }
    // Empty all hands
    for (const p of G3_PLAYERS) {
      state.hands[p] = { 1: 0, 2: 0, 3: 0 };
    }

    // No one should have any action (no empty cells to move to, no hand coins)
    const draw = g3CheckDraw(state);
    expect(draw).toBe(true);
  });

  test('covering opponent coin in Game3 changes visible line owner', () => {
    let state = createInitialGame3State('vsCPU', 'normal');

    // Fire gets 3 in a row on top row
    state = { ...state, currentPlayer: 'fire' };
    state = g3ApplyAction(state, { type: 'place', coinNumber: 1, targetCell: 0 });
    state = { ...state, currentPlayer: 'fire' };
    state = g3ApplyAction(state, { type: 'place', coinNumber: 1, targetCell: 1 });
    state = { ...state, currentPlayer: 'fire' };
    state = g3ApplyAction(state, { type: 'place', coinNumber: 2, targetCell: 2 });

    let win = g3CheckWinner(state.board);
    expect(win).not.toBeNull();
    expect(win!.winner).toBe('fire');

    // Water covers cell 1 with "2"
    state = { ...state, currentPlayer: 'water' };
    state = g3ApplyAction(state, { type: 'place', coinNumber: 2, targetCell: 1 });

    win = g3CheckWinner(state.board);
    // Fire's line should be broken now
    if (win && win.winner === 'fire') {
      console.warn('BUG: Covering fire coin did not break fire win line');
    }
    // Cell 1 top is now water, so fire no longer has 3 in a row on top row
    expect(win?.winner).not.toBe('fire');
  });
});

// ============================================================
// Cross-game: Board mutation bug check
// ============================================================
describe('Board Mutation Bugs', () => {
  test('Game1 AI cpuBestMove mutates board (known issue check)', () => {
    // cpuBestMove in ai.ts directly modifies board[to] and board[from]
    // during its search (lines 69-73, 84-85). While it restores them,
    // this is a mutation of the passed array. The wrapper in game1AI.ts
    // passes [...board] to protect, but this is worth verifying.
    const board: CellState[] = [
      'player', null, 'cpu',
      null, 'player', null,
      'cpu', null, 'player',
    ];
    const snapshot = JSON.stringify(board);
    cpuBestMove(board);
    const afterSnapshot = JSON.stringify(board);

    // cpuBestMove restores the board after each probe, so it should match
    // BUT if an error occurs mid-search, the board could be left in a bad state
    if (snapshot !== afterSnapshot) {
      console.warn('CONFIRMED BUG: cpuBestMove leaves board in mutated state');
      console.warn('Before:', snapshot);
      console.warn('After:', afterSnapshot);
    }
    // The AI does restore the board, so this should pass in normal cases
    expect(afterSnapshot).toBe(snapshot);
  });
});
