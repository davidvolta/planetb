# Development Checklist


## Upcoming Tasks
- [ ] Change tinting mechanism
- [ ] Fix double clicking bug on spawn units
- [ ] Fix ineligble spawning moves on terrain
- [ ] Now its kind of boring that eggs appear in the same place always
- [ ] Fix Raley Font (lost during architecture update)
- [ ] Style edges of owned biomes (flood fill with stroke)
  - [ ] Refactor for GameController and lessen the load on BoardScene and Gamestore


## Ecosystem Integration Plan

### Phase 1: Interface Extension
- [ ] Update the Biome Interface in gameStore.ts
  - [ ] Rename current `lushness` to `baseLushness`
  - [ ] Add `lushnessBoost` property
  - [ ] Add `totalLushness` property
  - [ ] Add `initialResourceCount` property
  - [ ] Add `nonDepletedCount` property
  - [ ] Add `totalHarvested` property
  - [ ] Add `eggCount` property
  - [ ] Add JSDoc comments

- [ ] Update Biome Creation
  - [ ] Set default values for all new properties
  - [ ] Ensure compatibility with existing code

### Phase 2: Resource Initialization
- [ ] Update EcosystemController.generateResources
  - [ ] Count resources for each biome
  - [ ] Set initialResourceCount and nonDepletedCount

- [ ] Add Resource Tracking helpers
  - [ ] Methods to get resource counts
  - [ ] Methods to calculate non-depleted resources

### Phase 3: Lushness Management
- [ ] Update Lushness Calculation
  - [ ] Calculate baseLushness from resources
  - [ ] Maintain lushnessBoost separately
  - [ ] Update totalLushness properly

- [ ] Create Lushness Update Methods
  - [ ] Methods to adjust lushnessBoost
  - [ ] Ensure totalLushness updates correctly

### Phase 4: Resource and Egg Tracking
- [ ] Update Resource Harvesting
  - [ ] Track totalHarvested when resources are harvested
  - [ ] Add end-of-turn nonDepletedCount recalculation

- [ ] Update Egg Tracking
  - [ ] Increment eggCount when eggs are created
  - [ ] Decrement eggCount when eggs evolve/removed

### Phase 5: Testing and Integration
- [ ] Test basic functionality
- [ ] Test edge cases
- [ ] Test integration with other systems


### Phase 6: Create Ecosystem Utilities
- [ ] Create a new utils file `EcosystemUtils.ts` containing:
  - [ ] The polynomial resource generation formula with fixed coefficient values
  - [ ] Lushness calculation functions based on tile resource values
  - [ ] Egg production logic based on lushness threshold (≥7.0)
  - [ ] Functions to find all tiles belonging to a specific biome

- [ ] Create helper functions for common tile-based operations:
  - [ ] Calculate total resource value in a biome
  - [ ] Find blank tiles suitable for egg placement (active=false AND isHabitat=false)
  - [ ] Update resource values based on lushness

### Phase 7: Update Rendering System
- [ ] Enhance TileRenderer to:
  - [ ] Display resource values numerically on tiles
  - [ ] Use opacity to visualize resource health (value/10)
  - [ ] Keep the existing resource assets, just modify their display
  
### Phase 8: Implement Harvesting System
- [ ] Create new action functions in actions.ts:
  - [ ] selectTile(x, y)
      - Selecting a tile with resources (double click behavior for units/eggs)
  - [ ] harvestTileResource(tileId, amount)
      - Allow partial harvesting (0-10 scale per tile's resource value)
  
- [ ] Add UI components for harvesting:
  - [ ] Harvest button that appears when a tile with resources is selected
  - [ ] Amount slider for selecting harvest amount (0-10 scale)
  - [ ] Implement energy counter (UI and gamestore)

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


