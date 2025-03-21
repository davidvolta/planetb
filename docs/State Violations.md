# State Management Violations

## Architecture Principles (As Defined)
- ✅ Phaser renders tiles, not React → No unnecessary React re-renders
- ✅ Zustand handles state → No need for prop drilling or React updates
- ✅ Phaser subscribes to state → Tiles update only when needed, not every frame
- ✅ React only controls UI → Buttons, menus, etc., remain separate from game rendering

## Direct State Access Violations

### BoardScene.ts
1. **Direct State Reading** (Line 62)
   ```typescript
   const board = useGameStore.getState().board;
   ```
   - Violation: Phaser directly accesses Zustand state without subscription
   - Correct Pattern: BoardScene should receive state via subscription or props

2. **Direct State Modification** (Line 65)
   ```typescript
   useGameStore.getState().initializeBoard(20, 20);
   ```
   - Violation: Phaser directly modifies Zustand state
   - Correct Pattern: Only React components should trigger state changes

3. **Commented but Potential Violation** (Line 131)
   ```typescript
   // useGameStore.getState().setTerrain(x, y, TerrainType.MOUNTAIN);
   ```
   - Violation: Would directly modify state from Phaser event handler
   - Correct Pattern: Should emit events that React handles to update state

## Architectural Violations

### Missing Subscription Mechanism
- BoardScene doesn't subscribe to state changes
- It uses direct `getState()` calls instead of responding to change events
- No clear mechanism for Phaser to be notified of state updates without polling

### Bidirectional Data Flow
- React components (App.tsx) initiate board state changes
- Phaser (BoardScene.ts) reads and modifies state directly
- No clear unidirectional data flow

### Initialization in Wrong Places
- BoardScene initializes game state with fallback values
- State initialization should only happen in React components or initialization logic

### Event Handling Violations
- Phaser tile click handlers would directly call Zustand actions
- Should be delegating state changes to React components

## Game.tsx Partial Violations

1. **Proper Subscription**
   ```typescript
   const boardState = useGameStore(state => state.board);
   ```
   - This is correct usage

2. **Improper Reactivity**
   - Changes to boardState correctly trigger updates, but:
   - The mechanism forces a full scene restart or updateBoard call
   - A more granular update mechanism would be more efficient

## Architecture Improvements Needed

1. **Subscription Model**
   - Implement a proper Observer pattern for Phaser to subscribe to state changes
   - Remove all direct `getState()` calls from Phaser code

2. **Unidirectional Data Flow**
   - React/UI → triggers state changes in Zustand
   - Zustand → notifies subscribers of changes 
   - Phaser → renders based on received state updates

3. **Event Delegation**
   - Phaser should emit events when user interacts with game objects
   - React components should listen for these events and update state accordingly
   - Zustand actions should only be called from React components

4. **Clear Separation of Concerns**
   - Phaser: Rendering and input handling only
   - Zustand: State management only
   - React: UI rendering and state update triggers only 