# Ecosystem Refactoring Notes for AI Assistance

## Current Architecture & Issues

The game's ecosystem is currently managed through a fragmented approach that has led to fragility and maintenance challenges:

1. **Dispersed Logic**: Ecosystem management is split across multiple components:
   - `actions.ts` contains methods like `updateBiomeLushness`, `produceEggs`, etc.
   - `EcosystemController.ts` has core algorithms but delegates state updates
   - `gameStore.ts` holds ecosystem state and some ecosystem logic

2. **Multiple State Update Paths**: Ecosystem state can be updated through:
   - Direct actions (evolveAnimal, captureBiome)
   - Turn-based processes (egg production)
   - Indirect interactions (resource harvesting affecting lushness)

3. **Temporary State Issues**: Functions like `biomeEggProduction` create temporary state that can lead to inconsistencies or unexpected behavior.

4. **Ecosystem Boundaries**: The ecosystem consists of biomes, resources, and eggs - but not evolved animals (which become part of the player-controlled units system).

5. **Concrete Example of Current Fragility**: The current flow for egg production is especially problematic:
   - `actions.produceEggs()` calls `EcosystemController.biomeEggProduction()`
   - `biomeEggProduction()` returns modified animals/biomes arrays
   - These are applied to the store, but then `biomeEggProduction()` also directly calls `updateBiomeLushness()`
   - `updateBiomeLushness()` then separately modifies state again
   - This creates potential race conditions and inconsistent state

6. **Resource Initialization Issues**: Initial resource generation happens in multiple places:
   - First in `BoardScene.createTiles()` which checks and triggers `regenerateResources()`
   - Then in `regenerateResources()` which calls `EcosystemController.regenerateResources()`
   - But lushness recalculation is not consistently applied after generation

## Technical Context & Game Mechanics

### Core Ecosystem Components

1. **Biomes**:
   - Represented by the `Biome` interface in `gameStore.ts`
   - Key properties:
     - `id`: Unique identifier
     - `baseLushness`: Derived from resource health (0-10 scale)
     - `lushnessBoost`: Derived from egg percentage
     - `totalLushness`: Combined value (baseLushness + lushnessBoost)
     - `eggCount`: Current number of eggs in biome
     - `initialResourceCount`: Original resource count at generation
     - `nonDepletedCount`: Current resources that aren't depleted
     - `ownerId`: Player who owns this biome (null if unowned)
     - `productionRate`: Eggs produced per turn
     - `lastProductionTurn`: Last turn eggs were produced

2. **Resources**:
   - Represented on individual tiles in the board
   - Resource properties on tiles:
     - `resourceType`: Type of resource (FOREST, KELP, etc.)
     - `resourceValue`: Current value (0-10)
     - `active`: Whether the resource is active or depleted

3. **Eggs**:
   - Represented as dormant animal units in `AnimalState.DORMANT`
   - Placed on tiles with `hasEgg` property
   - Created during egg production process
   - Evolve into active animals when prompted by player

### Ecosystem Mechanics

1. **Lushness Calculation**:
   - `baseLushness` = (sum of resource values) / (initial total resource value) * MAX_LUSHNESS
   - `lushnessBoost` is based on the percentage of blank tiles with eggs
   - `totalLushness` = baseLushness + lushnessBoost
   - MAX_LUSHNESS is defined as 10.0 in `ecosystemConstants.ts`

2. **Egg Production**:
   - Occurs on even-numbered turns only
   - Requires biome `totalLushness` ≥ 7.0 (EGG_PRODUCTION_THRESHOLD)
   - Number of eggs produced equals biome's `productionRate`
   - Eggs are placed on blank tiles (no resources, not habitats, no existing eggs)
   - Prioritizes placement near resources, especially in owned biomes
   - After placement, lushnessBoost increases based on new egg percentage

3. **Resource Mechanics**:
   - Resources are generated based on terrain types:
     - GRASS terrain → FOREST resources
     - WATER terrain → KELP resources
     - MOUNTAIN terrain → INSECTS resources
     - UNDERWATER terrain → PLANKTON resources
   - Initial value is 10 for all resources
   - Resources can be depleted through harvesting
   - Depleted resources affect biome lushness

## Vision for Refactored Architecture

The refactoring vision is to create a "nature's factory" approach where:

1. **Single Point of Entry**: The `EcosystemController` becomes the sole manager of ecosystem state, with all ecosystem changes flowing through it.

2. **Two Categories of Ecosystem Changes**:
   - **Player Actions**: Direct changes through actions like evolveAnimal, captureBiome
   - **"God Actions"**: Turn-based natural processes through nextTurn

3. **Direct State Management**: Rather than returning objects for actions to update, the EcosystemController will directly update the game state through `useGameStore.setState()`.

4. **Consolidated Dependencies**: All interdependent calculations (e.g., egg production affecting lushness) will be handled together within the controller.

5. **Clear State Update Pattern**: Any time ecosystem state changes, the entire ecosystem is updated atomically in a single setState call.

## Desired Implementation Details

### EcosystemController Methods

1. **updateEcosystem()** - Core unified method:
   ```typescript
   public static updateEcosystem(
     updateType: 'EGG_PRODUCTION' | 'ANIMAL_EVOLUTION' | 'BIOME_CAPTURE' | 'RESOURCE_HARVEST',
     params: {
       turn?: number,
       animalId?: string,
       biomeId?: string,
       tileX?: number,
       tileY?: number,
       harvestAmount?: number
     }
   ): void
   ```

2. **processTurn()** - Turn-based ecosystem dynamics:
   ```typescript
   public static processTurn(turn: number): void
   ```

3. **initializeEcosystem()** - Game start setup:
   ```typescript
   public static initializeEcosystem(
     width: number,
     height: number,
     terrainData: TerrainType[][],
     biomes: Map<string, Biome>,
     board: Board
   ): void
   ```

4. **Internal Helper Methods**:
   - `private static _calculateLushness(biome: Biome, board: Board)`
   - `private static _placeEggs(biome: Biome, board: Board, count: number)`
   - `private static _evolveAnimal(animalId: string, animals: Animal[], board: Board)`

### Action Layer Wrappers

All ecosystem-related actions should become thin wrappers around `EcosystemController.updateEcosystem()`:

```typescript
// Example simplified action
export function evolveAnimal(animalId: string): void {
  EcosystemController.updateEcosystem('ANIMAL_EVOLUTION', { animalId });
}
```

## Code Patterns & Anti-Patterns

### Correct Patterns

1. **Atomic State Updates**:
   ```typescript
   // GOOD: All ecosystem state is updated in a single setState call
   useGameStore.setState({
     biomes: updatedBiomes,
     animals: updatedAnimals,
     board: updatedBoard
   });
   ```

2. **Direct Method Calls**:
   ```typescript
   // GOOD: Clear entry point
   EcosystemController.updateEcosystem('EGG_PRODUCTION', { turn: currentTurn });
   ```

3. **Feature Encapsulation**:
   ```typescript
   // GOOD: All resource manipulation logic lives in the controller
   private static _processResourceHarvest(x: number, y: number, amount: number, board: Board, biomes: Map<string, Biome>) {
     // Resource harvesting logic
   }
   ```

### Anti-Patterns to Avoid

1. **Fragmented State Updates**:
   ```typescript
   // BAD: Multiple separate state updates
   useGameStore.setState({ biomes: updatedBiomes });
   // ...later...
   useGameStore.setState({ board: updatedBoard });
   ```

2. **Direct Store Access in Components**:
   ```typescript
   // BAD: Component directly modifies ecosystem state
   const biomes = useGameStore.getState().biomes;
   biomes.get(biomeId).lushness = newValue;
   useGameStore.setState({ biomes });
   ```

3. **Calculation/Update Separation**:
   ```typescript
   // BAD: Calculate values, then separately update them
   const lushness = calculateBiomeLushness(biomeId);
   // ...later...
   updateBiomeLushness(biomeId, lushness);
   ```

## Key Insights & Decisions

1. **Ecosystem Definition**: The ecosystem involves biomes, resources, and eggs. Evolved animals are outside the ecosystem.

2. **Single State Update**: We've decided to have EcosystemController directly update game state rather than returning objects to actions.ts. This reduces complexity by eliminating an abstraction layer that wasn't adding value.

3. **nextTurn as "God Action"**: The turn-based ecosystem dynamics will be handled by a dedicated processTurn method that handles all natural ecosystem processes.

4. **Action Simplification**: Actions like evolveAnimal will become thin wrappers around EcosystemController methods, mainly serving as an API rather than containing logic.

5. **Initialization Importance**: We recognized that proper ecosystem initialization is crucial but separate from the ongoing ecosystem dynamics.

6. **One-way Data Flow**: For ecosystem state, we're accepting a deviation from the usual pattern of components calling actions that call controllers that return values, and instead having the controller directly update state.

7. **State Consistency Priority**: We've prioritized state consistency over strict architectural boundaries, recognizing that the ecosystem's interconnected nature makes it a special case.

## State Management Specifics

1. **Store Structure**:
   ```typescript
   interface GameState {
     // Ecosystem-related state
     biomes: Map<string, Biome>;
     board: Board | null;
     animals: Animal[];
     
     // Other game state...
   }
   ```

2. **Accessing State in Controller**:
   ```typescript
   // Current approach
   const state = useGameStore.getState();
   
   // Create working copies
   const biomes = new Map(state.biomes);
   const animals = [...state.animals];
   const board = state.board ? {...state.board} : null;
   
   // Modify working copies...
   
   // Update state in one call
   useGameStore.setState({
     biomes,
     animals,
     board
   });
   ```

3. **State Validation**: Controllers should validate the state before and after updates:
   ```typescript
   // Example validation
   if (!state.board) {
     console.error("Cannot update ecosystem: board not initialized");
     return;
   }
   
   // Post-update validation
   if (newBiomes.size !== state.biomes.size) {
     console.warn("Biome count changed unexpectedly");
   }
   ```

## Integration with Game Systems

1. **Turn Cycle**:
   - `nextTurn()` in gameStore handles overall turn advancement
   - It should delegate to `EcosystemController.processTurn()` for all ecosystem processes
   - Before and after ecosystem processing, it handles non-ecosystem state (movement reset, etc.)

2. **UI Presentation**:
   - Resource visualization uses `BoardScene.resourceRenderer`
   - Biome visualization uses `BoardScene.biomeRenderer`
   - These renderers subscribe to state changes via StateObserver

3. **Player Interaction Flow**:
   - Player selects an egg → UI calls `actions.evolveAnimal(id)`
   - `evolveAnimal` calls `EcosystemController.updateEcosystem('ANIMAL_EVOLUTION', {animalId: id})`
   - Controller updates all relevant state
   - UI responds to state changes via subscriptions

4. **Biome Capture Mechanism**:
   - Player moves unit to habitat → Clicks habitat → UI calls `actions.captureBiome(id)`
   - `captureBiome` calls `EcosystemController.updateEcosystem('BIOME_CAPTURE', {biomeId: id})`
   - Controller updates biome ownership and other affected state
   - This enables egg production in the captured biome

## Guidance for Future AI Assistance

When working with the ecosystem system:

1. **Respect the Controller Pattern**: All changes to the ecosystem should flow through EcosystemController methods. If you see direct ecosystem state manipulations outside the controller, this is likely a bug.

2. **Next Turn Process Flow**: The nextTurn function should handle non-ecosystem game state changes and delegate ecosystem processing to EcosystemController.processTurn().

3. **Game Initialization**: Resource generation during initialization should use EcosystemController.initializeEcosystem() to ensure proper setup.

4. **Testing Considerations**: When adding ecosystem features, consider testing both player-initiated actions and turn-based dynamics.

5. **Interdependencies**: Remember that ecosystem components are highly interdependent - changes to one aspect (resources, biomes, eggs) likely affect others.

6. **Key Events to Monitor**:
   - Even turns trigger egg production
   - Resource depletion affects biome lushness
   - Biome lushness threshold (≥7.0) determines egg production ability

7. **Debugging Ecosystem Issues**:
   - First check if all ecosystem changes are flowing through the controller
   - Verify that lushness calculations match expected values
   - Check for race conditions in state updates
   - Look for multiple setState calls that should be consolidated

8. **Console Logging Guidelines**:
   - Ecosystem controller should log key events with standardized formats
   - Log format: `[EcosystemController] Action: Details | Additional context`
   - Example: `[EcosystemController] Produced eggs: 3 in biome-1 | Turn: 4, Lushness: 8.5`

## Future Development Focus

The refactored ecosystem controller will be the foundation for several upcoming features:

1. **Resource Harvesting**: A major feature that will involve player-initiated resource extraction affecting biome lushness.
   - Implementation will follow pattern: `updateEcosystem('RESOURCE_HARVEST', {tileX, tileY, harvestAmount})`
   - Harvesting reduces resourceValue of the targeted tile
   - When resourceValue reaches 0, the resource is fully depleted (active=false)
   - Biome lushness will automatically update in the same operation

2. **Resource Regeneration**: Turn-based natural replenishment of resources based on biome health.
   - Will be part of the processTurn() method
   - Higher lushness biomes regenerate resources faster
   - Regeneration will be partial (not full restoration to 10)
   - Resources with value=0 will not naturally regenerate

3. **Enhanced Egg Placement**: More sophisticated logic for determining where eggs are placed within biomes.
   - Current system prioritizes tiles near resources in owned biomes
   - Enhancement will consider resource types and proximity to other eggs
   - Will still maintain focus on strategic placement for gameplay

4. **Ecosystem Visualizations**: Better visual feedback about ecosystem health.
   - Resource health visualized through opacity/tint
   - Biome lushness visualized through border colors or overlays
   - Clear distinction between active and depleted resources

## Technical Implementation History

Understanding how we got here helps explain the refactoring need:

1. **Initial Implementation**: Originally, biomes produced units (eggs) based on a simple habitat mechanic without complex ecosystem dynamics.

2. **Lushness Introduction**: The lushness system was added to tie biome health to resource management, but was built as a separate calculation.

3. **Resource Integration**: Resources were added to the game board as separate entities, creating overlapping systems.

4. **Current Fragility**: As these systems grew together organically, the interdependencies became more complex but remained managed through separate code paths.

5. **This Refactoring**: Aims to consolidate these systems under a single controller to match the natural integration of the systems they model.

By following the architecture outlined in the dev_checklist.md's "Ecosystem Controller Refactoring Plan," these features can be added more reliably without introducing fragility. 