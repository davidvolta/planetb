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

### Phase 1: Refactor to Tile-Centric Resource Model
- [ ] Enhance Tile System for Ecosystem Integration:
  - [x] Add hasEgg boolean property to Tile interface with default value of false
  - [x] Update state management to keep tile.hasEgg and Animal entities in sync
  - [x] Create comprehensive getTiles() function similar to getResourceTiles()
  - [x] Implement hybrid filtering system:
    - [x] Generic getTilesByFilter(filterFn) core mechanism
    - [x] Specific helper functions (getBlankTiles(), getEggTiles(), etc.)
  - [ ] Ensure proper rendering of all tile states (resources, eggs, habitats)

- [ ] Extend the `Biome` interface in gameStore.ts to include:
  - [ ] Lushness properties (baseLushness, lushnessBoost) - with total lushness as the main value
  - [ ] Resource tracking (initialResourceCount, nonDepletedCount, totalHarvested, eggCount)

### Phase 2: Create Ecosystem Utilities
- [ ] Create a new utils file `EcosystemUtils.ts` containing:
  - [ ] The polynomial resource generation formula with fixed coefficient values
  - [ ] Lushness calculation functions based on tile resource values
  - [ ] Egg production logic based on lushness threshold (≥7.0)
  - [ ] Functions to find all tiles belonging to a specific biome

- [ ] Create helper functions for common tile-based operations:
  - [ ] Calculate total resource value in a biome
  - [ ] Find blank tiles suitable for egg placement (active=false AND isHabitat=false)
  - [ ] Update resource values based on lushness

### Phase 3: Update Rendering System
- [ ] Enhance TileRenderer to:
  - [ ] Display resource values numerically on tiles
  - [ ] Use opacity to visualize resource health (value/10)
  - [ ] Keep the existing resource assets, just modify their display
  
### Phase 4: Implement Harvesting System
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

### Phase 5: Replace Habitat Production with Biome-Based Ecosystem
- [ ] Implement resource regeneration based on biome lushness
- [ ] Update biome lushness calculations based on tile resource values
- [ ] Produce dormant animal units (eggs) on blank tiles based on lushness thresholds
- [ ] Keep existing system where eggs are represented as dormant animal units
- [ ] Connect this to the existing evolveAnimal function for converting eggs to active animals

### Phase 6: Refactor Simulator to Use Shared Code
- [ ] Update simulator.js to use the shared EcosystemUtils functions
- [ ] Ensure both the game and simulator use exactly the same calculation methods


