# Development Checklist


## Upcoming Tasks
- [ ] Change tinting mechanism
- [ ] Fix double clicking bug on spawn units
- [ ] Fix ineligble spawning moves on terrain
- [ ] Now its kind of boring that eggs appear in the same place always
- [ ] Fix Raley Font (lost during architecture update)
- [ ] Style edges of owned biomes (flood fill with stroke)
  - [ ] Refactor for GameController and lessen the load on BoardScene and Gamestore


## Ecosystem Controller Refactoring Plan

### Phase 1: Consolidate Ecosystem State Management
- [ ] Create a unified ecosystem update method in EcosystemController
  - [ ] Add method that handles all ecosystem state updates in one place
  - [ ] Implement support for egg production, animal evolution, biome capture, and turn advancement
  - [ ] Ensure method directly manages state via useGameStore.setState()
  - [ ] Add proper error handling and logging

- [ ] Refactor egg production flow
  - [ ] Move all egg production logic from actions.ts into EcosystemController
  - [ ] Ensure biome lushness is updated directly as part of egg production
  - [ ] Eliminate temporary state and unnecessary intermediate updates
  - [ ] Add proper validation for egg placement

- [ ] Refactor animal evolution flow
  - [ ] Move evolution logic into EcosystemController's unified update method
  - [ ] Ensure proper handling of egg removal from tiles
  - [ ] Update animal state directly within the controller

- [ ] Refactor biome capture flow
  - [ ] Move ownership assignment logic into EcosystemController
  - [ ] Connect capture to lushness calculation in the controller

### Phase 2: Refactor NextTurn Ecosystem Processing
- [ ] Create dedicated ecosystem turn processing method
  - [ ] Add EcosystemController.processTurn() method
  - [ ] Ensure it handles all turn-based ecosystem mechanics in one call
  - [ ] Process egg production based on turn number (even turns)
  - [ ] Apply any resource regeneration (future feature)

- [ ] Update nextTurn action and implementation
  - [ ] Modify actions.getNextTurn() to use new EcosystemController.processTurn()
  - [ ] Ensure all ecosystem state updates occur in proper sequence
  - [ ] Handle resetting of movement flags and other turn-based game mechanics

- [ ] Add turn-specific ecosystem validation
  - [ ] Verify ecosystem state consistency at turn boundaries
  - [ ] Implement checks for valid ecosystem state after turn processing

### Phase 3: Review and Enhance Ecosystem Initialization
- [ ] Audit game initialization flow
  - [ ] Review resource generation during board creation
  - [ ] Ensure initial biome lushness values are correctly calculated
  - [ ] Verify that biomes are properly prepared for egg production

- [ ] Create explicit ecosystem initialization method
  - [ ] Add EcosystemController.initializeEcosystem() method
  - [ ] Ensure proper biome setup, resource generation, and lushness calculation
  - [ ] Make it adaptable to different board sizes and configurations

- [ ] Update board creation process
  - [ ] Modify board initialization to use the consolidated ecosystem controller
  - [ ] Ensure consistent ecosystem state at game start
  - [ ] Add proper validation for initialized ecosystem

### Phase 4: Simplify Actions API
- [ ] Update produceEggs() action
  - [ ] Simplify to call EcosystemController.updateEcosystem()
  - [ ] Remove any redundant state handling

- [ ] Update evolveAnimal() action
  - [ ] Simplify to call EcosystemController.updateEcosystem()
  - [ ] Pass only necessary parameters

- [ ] Update captureBiome() action
  - [ ] Simplify to call EcosystemController.updateEcosystem()
  - [ ] Ensure all unit state updates are handled properly

- [ ] Review other ecosystem-related actions
  - [ ] Identify any other actions that should use the new approach
  - [ ] Refactor or deprecate as needed

### Phase 5: Integration & Testing
- [ ] Test next turn ecosystem processing
  - [ ] Verify proper egg production on even turns
  - [ ] Confirm all ecosystem dynamics update correctly
  - [ ] Test multiple consecutive turns

- [ ] Test game initialization
  - [ ] Verify resources are generated correctly
  - [ ] Confirm biome lushness is calculated properly
  - [ ] Test different board configurations

- [ ] Test egg production thoroughly
  - [ ] Verify eggs appear in appropriate locations
  - [ ] Confirm lushness increases with egg placement
  - [ ] Test edge cases (no valid tiles, etc.)

- [ ] Test animal evolution thoroughly
  - [ ] Confirm eggs evolve correctly into animals
  - [ ] Verify tile states update properly
  - [ ] Test with multiple concurrent evolutions

- [ ] Add proper unit tests
  - [ ] Test ecosystem calculations
  - [ ] Test state updates
  - [ ] Test error handling

### Phase 6: Documentation & Cleanup
- [ ] Update ecosystem controller documentation
  - [ ] Add clear JSDoc comments to all methods
  - [ ] Document the new architecture pattern
  - [ ] Document the nextTurn and initialization flows

- [ ] Remove deprecated code
  - [ ] Clean up any redundant methods
  - [ ] Remove old console.log statements

- [ ] Update dev notes
  - [ ] Document the new ecosystem update flow
  - [ ] Note any important considerations for future features
  - [ ] Add notes about the "god action" of nextTurn


## Ecosystem Integration Plan

### Phase 5: Create Ecosystem Utilities
- [ ] Create a new utils file `EcosystemUtils.ts` containing:
  - [ ] The polynomial resource generation formula with fixed coefficient values
  - [ ] Egg production logic based on lushness threshold (≥7.0)
  - [ ] Calculate total resource value in a biome
  - [ ] Find blank tiles suitable for egg placement (active=false AND isHabitat=false)
  - [ ] Functions to find all tiles belonging to a specific biome

### Phase 6: Update Rendering System
- [ ] Enhance TileRenderer to:
  - [ ] Use opacity to visualize resource health (value/10)
  - [ ] Keep the existing resource assets, just modify their display
  
### Phase 7: Implement Harvesting System
- [ ] Create new action functions in actions.ts:
  - [ ] selectTile(x, y)
      - Selecting a tile with resources (double click behavior for units/eggs)
  - [ ] harvestTileResource(tileId, amount)
      - Allow partial harvesting (0-10 scale per tile's resource value)
  
- [ ] Add UI components for harvesting:
  - [ ] Harvest button that appears when a tile with resources is selected
  - [ ] Amount slider for selecting harvest amount (0-10 scale)
  - [ ] Implement energy counter (UI and gamestore)

- [ ] Track Resource Harvesting
  - [ ] Track totalHarvested when resources are harvested
  - [ ] Add end-of-turn nonDepletedCount recalculation

- [ ] Implement the harvest logic in gameStore:
  - [ ] Update tile resource values based on the harvested amount
  - [ ] When resourceValue reaches 0, immediately set active=false (permanent conversion)
  - [ ] Update the biome's lushness based on the new tile state

### Phase 9: Replace Habitat Production with Biome-Based Ecosystem
- [ ] Implement resource regeneration based on biome lushness
- [ ] Update biome lushness calculations based on tile resource values
- [ ] Produce dormant animal units (eggs) on blank tiles based on lushness thresholds
- [ ] Keep existing system where eggs are represented as dormant animal units
- [ ] Connect this to the existing evolveAnimal function for converting eggs to active animals

### Phase 10: Refactor Simulator to Use Shared Code
- [ ] Update simulator.js to use the shared EcosystemUtils functions
- [ ] Ensure both the game and simulator use exactly the same calculation methods


