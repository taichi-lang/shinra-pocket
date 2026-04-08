# Shinra Pocket -- Comprehensive Test Plan

Version: 1.0
Date: 2026-04-07
Author: Agent 14 (QA/Debug Team)

---

## 1. Game1: Coin Tic-Tac-Toe

### 1.1 Place Phase Logic
- [ ] createInitialGameState returns correct defaults (empty board, phase=place, turn=player, etc.)
- [ ] Player can place coin on an empty cell
- [ ] Player cannot place coin on an occupied cell
- [ ] playerPlaced / cpuPlaced increments correctly
- [ ] Phase transitions to 'move' after both players place 4 coins (playerPlaced=4, cpuPlaced=4)

### 1.2 Move Phase Logic
- [ ] Player can move own coin to an adjacent empty cell
- [ ] Player cannot move coin to a non-adjacent cell
- [ ] Player cannot move to an occupied cell
- [ ] Player cannot move opponent's coin
- [ ] ADJACENTS map is correct for all 9 cells

### 1.3 Win Detection
- [ ] Horizontal wins: [0,1,2], [3,4,5], [6,7,8]
- [ ] Vertical wins: [0,3,6], [1,4,7], [2,5,8]
- [ ] Diagonal wins: [0,4,8], [2,4,6]
- [ ] checkWin returns false when no line is complete
- [ ] getWinLine returns the correct winning line indices
- [ ] getWinLine returns null when no win exists

### 1.4 AI Correctness (Normal)
- [ ] cpuBestPlace takes winning move when available
- [ ] cpuBestPlace blocks player winning move
- [ ] cpuBestPlace prefers center (cell 4) when empty
- [ ] cpuBestPlace falls back to corners, then edges
- [ ] cpuBestMove finds a winning move if one exists
- [ ] cpuBestMove blocks player winning move
- [ ] cpuBestMove returns null when no CPU pieces exist

### 1.5 AI Correctness (Hard)
- [ ] cpuBestPlaceHard returns valid cell index
- [ ] cpuBestPlaceHard finds optimal placement via minimax
- [ ] cpuBestMoveHard returns [from, to] pair or null
- [ ] cpuBestMoveHard finds winning move when available

### 1.6 Timer
- [ ] Timer starts at phase transition to 'move'
- [ ] Timer counts down correctly
- [ ] Forced random move on timer expiry

---

## 2. Game2: Duel (Stacking)

### 2.1 Stacking Rules
- [ ] Can place coin 1 or 2 on empty cell
- [ ] Can place coin 2 on top of any coin 1 (own or opponent)
- [ ] Cannot place anything on top of coin 2
- [ ] Cannot place coin 1 on top of coin 1
- [ ] Maximum stack height is 2

### 2.2 Hand Management
- [ ] Each player starts with 4 coins: 2x "1" and 2x "2"
- [ ] Hand decrements when placing a coin
- [ ] Cannot place if hand is empty for that number

### 2.3 Movement Rules
- [ ] Can only move top coin of a stack
- [ ] Cannot move coin buried under another
- [ ] Movement destination must be empty (no stacking via move)

### 2.4 Win via Top-Visible
- [ ] Win detected when top-visible coins form a line of 3
- [ ] Moving a coin that reveals opponent's coin underneath -- opponent wins if line formed
- [ ] Stacking on opponent's coin changes visible owner

### 2.5 Touch Rule (Otedsuki)
- [ ] Once a coin is selected, it must be played (no cancel)

---

## 3. Game3: Three-Way Battle

### 3.1 Turn Order
- [ ] Turns cycle: Fire -> Water -> Swirl -> Fire -> ...
- [ ] Turn skipping does not occur

### 3.2 3-Layer Stacking
- [ ] Coin 1 can be placed on empty
- [ ] Coin 2 can be placed on coin 1 (any owner)
- [ ] Coin 3 can be placed on coin 2 (any owner)
- [ ] Coin 3 can be placed directly on coin 1 (skip layer)
- [ ] Nothing can be placed on coin 3
- [ ] Same-number stacking is rejected
- [ ] Lower number cannot go on top of higher number

### 3.3 Max^N AI
- [ ] Each CPU acts independently (no collusion)
- [ ] CPU prioritizes winning move
- [ ] CPU blocks opponent's winning threats
- [ ] CPU uses stacking strategically to cover opponent's coins

### 3.4 Victory
- [ ] First player to achieve 3-in-a-row (top-visible) wins
- [ ] Remaining 2 players lose
- [ ] Uncovering an opponent's line via move = that opponent wins

---

## 4. Game4: Patapata (Mancala variant)

### 4.1 Board Setup
- [ ] Initial layout: [4,3,2] for each player, pits start at 0
- [ ] Total coins = 18

### 4.2 Sowing
- [ ] Picking up a pit takes all coins from it
- [ ] Coins are distributed one-by-one counter-clockwise
- [ ] Sowing wraps around the full 8-position circuit
- [ ] All positions (own pits, opponent pits, both goal pits) receive coins

### 4.3 Extra Turn
- [ ] Landing last coin in either pit -> extra turn
- [ ] Landing last coin in a non-pit cell -> opponent's turn

### 4.4 Win Condition
- [ ] Player wins when all 3 of their own pits are empty
- [ ] Opponent's remaining coins are irrelevant
- [ ] Pit coin counts do not affect victory

### 4.5 No Capture Rule
- [ ] Landing in own empty pit does NOT capture opposite coins

---

## 5. Game5: Sun vs Moon (Mini-Shogi)

### 5.1 Piece Movement
- [ ] Sun/Moon (King): moves 1 step in all 8 directions
- [ ] Fire: moves 1 step diagonally (4 directions)
- [ ] Water: moves 1 step forward/backward only (2 directions, vertical)
- [ ] Cannot move off-board
- [ ] Cannot move onto own piece

### 5.2 Capture and Drop
- [ ] Moving onto opponent's piece captures it
- [ ] Captured piece converts to captor's side
- [ ] Captured pieces can be dropped on own back row (Row 1 for Sun, Row 3 for Moon)
- [ ] Can only drop on empty cells in back row
- [ ] King (Sun/Moon) cannot be captured directly

### 5.3 Check and Checkmate
- [ ] Check detected when opponent's king is threatened
- [ ] King must escape check (move, block, or capture attacker)
- [ ] Checkmate = no legal moves to escape check -> attacker wins
- [ ] Player cannot make a move that leaves own king in check

### 5.4 Repetition (Sennichite)
- [ ] Same board position repeated 3 times -> draw
- [ ] Board state tracking includes piece positions and whose turn

---

## 6. Game6: Puzzle Mode

### 6.1 Puzzle Generation
- [ ] Generated puzzles have exactly one solution
- [ ] Puzzle difficulty scales appropriately
- [ ] All puzzles are solvable

### 6.2 Validation
- [ ] Submitted solution is verified correctly
- [ ] Incorrect solutions are rejected with feedback
- [ ] Timer / move count tracking

---

## 7. Online Multiplayer

### 7.1 Connection
- [ ] Firebase connection established on app launch
- [ ] Reconnection after network drop
- [ ] Graceful handling of connection timeout

### 7.2 Matchmaking
- [ ] Player can create a room
- [ ] Player can join an existing room
- [ ] Room cleanup after game ends or disconnect
- [ ] Correct pairing of 2 players (or 3 for Game3)

### 7.3 State Synchronization
- [ ] Board state synced in real-time via Firebase
- [ ] Turn order enforced server-side
- [ ] Move validation on both client and server
- [ ] Latency does not cause desync
- [ ] Opponent disconnect detection and handling

---

## 8. Navigation and Screen Transitions

### 8.1 Screen Flow
- [ ] Home -> Game Select -> Coin Select -> Game Screen
- [ ] Game Screen -> Result Screen -> Home or Rematch
- [ ] Back navigation works correctly at every level
- [ ] Deep link handling (if applicable)

### 8.2 State Preservation
- [ ] Game state preserved on background/foreground cycle
- [ ] Navigation does not leak game state between sessions
- [ ] Loading states shown during transitions

---

## Test Framework

- **Unit Tests**: Jest (Expo default)
- **Component Tests**: React Native Testing Library
- **E2E Tests**: Detox (future)
- **Target Platforms**: iOS 14+, Android 8+
