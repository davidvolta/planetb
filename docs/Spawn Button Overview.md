## Spawn Button Overview
The "Spawn Unit" button in the Planet B game allows players to evolve dormant units (eggs) into active animal units. This button represents the reproduction mechanic in the game's ecological strategy system.

## Button Creation and Visualization

1. **Button Creation**
   - Created in `UIScene.createSpawnButton()` method
   - Hidden by default (`this.spawnButton.setVisible(false)`)

## Visibility Logic

The button visibility is controlled through state subscription:

1. **State Subscription**
   - In `UIScene.init()`, a subscription is set up to watch for state changes
   - Monitors `state.selectedUnitId` and `state.selectedUnitIsDormant` 
   - Shows button only when a dormant unit (egg) is selected
   - Uses the formula: `spawnButton.setVisible(data.selectedUnit !== null && data.selectedIsDormant)`

2. **Tile Click Handler**
   - When a tile is clicked, the `handleTileClicked` event handler checks if the tile contains dormant units
   - If a dormant unit is found, it calls `actions.selectUnit(dormantUnit.id)`
   - This properly updates the global game state
   - The state subscription then automatically handles updating button visibility

## Action Flow

When the Spawn Unit button is clicked:

1. **Handler Execution**
   - The `handleSpawnUnit()` method is triggered
   - Triggered by button click or by pressing 'S' key (when button is visible)

2. **Evolving Process**
   - Calls `actions.evolveAnimal(this.selectedUnitId)` to transform the egg into an active unit
   - Calls `actions.deselectUnit()` to clear the selection
   - Records the spawn event with `actions.recordSpawnEvent(this.selectedUnitId)`

3. **State Changes**
   - In the game store, `evolveAnimal()` changes the egg's state from `DORMANT` to `ACTIVE`
   - The function also handles displacement if there's already an active unit in the same position
   - Records displacement information in `displacementEvent` object for animation

4. **Event Propagation**
   - The spawn event is recorded in the state via `recordSpawnEvent()`
   - `BoardScene` subscribes to spawn events and responds with `handleUnitSpawned()`
   - This hides the selection indicator and clears the spawn event

## Technical Implementation

The implementation follows a clean architecture:
- **UIScene**: Handles button creation and user interaction
- **State Management**: Controls button visibility through subscription
- **Actions**: Provides a clean API for state modifications
- **GameStore**: Contains the actual state mutation logic

This implementation now properly follows the application architecture principle: "Components trigger actions, actions modify state."

The key improvements in this approach:
1. Centralized state management for game mechanics
2. Clear separation between UI presentation and game state
3. Simplified UI update mechanism through state subscription
4. Eliminated duplicate state handling in component-local variables
