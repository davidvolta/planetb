# Development Checklist


## Upcoming Tasks
- [ ] Change tinting mechanism
- [ ] Fix double clicking bug on spawn units
- [ ] Fix ineligble spawning moves on terrain
- [ ] Now its kind of boring that eggs appear in the same place always
- [ ] Fix Raley Font (lost during architecture update)
- [ ] Style edges of owned biomes (flood fill with stroke)

- [ ] Implement harvesting
    - Selecting a tile with resources (double click behavior for units/eggs)
     - Allow partial harvesting (0-10 scale per tile's resource value)
    
- [ ] Implement energy counter (UI and gamestore)

- [ ] Refactor for GameController and lessen the load on BoardScene and Gamestore

## Ecosystem Integration Plan

### Phase 1: Enhance Biome Structure & Setup Ecosystem Utilities
- [ ] Extend the `Biome` interface in gameStore.ts to include:
  - [ ] Tiles array with status tracking (value, active, hasEgg)
  - [ ] Lushness properties (baseLushness, lushnessBoost) - with total lushness as the main value
  - [ ] Tile tracking (initialTileCount, nonDepletedCount, totalHarvested, eggCount)

- [ ] Create a new utils file `EcosystemUtils.ts` containing:
  - [ ] The polynomial resource generation formula with fixed coefficient values
  - [ ] Lushness calculation functions based on tile resource values
  - [ ] Egg production logic based on lushness threshold (≥7.0)

- [ ] Update the BiomeGenerator to initialize biomes with proper ecosystem values

### Phase 2: Update Rendering System
- [ ] Enhance TileRenderer to:
  - [ ] Display resource values numerically on tiles
  - [ ] Use opacity to visualize resource health (value/10)
  - [ ] Keep the existing resource assets, just modify their display

### Phase 3: Replace Habitat Production with Biome-Based Ecosystem
  - [ ] Calculate resource regeneration based on lushness
  - [ ] Update lushness values for each biome
  - [ ] Produce dormant animal units (eggs) on blank tiles based on lushness thresholds
  - [ ] Keep existing system where eggs are represented as dormant animal units

- [ ] Connect this to the existing evolveAnimal function for converting eggs to active animals

### Phase 4: Implement Harvesting System
- [ ] Create new action functions in actions.ts:
  - [ ] selectTile(x, y)
  - [ ] harvestTileResource(tileId, amount)

- [ ] Add UI components for harvesting:
  - [ ] Harvest button that appears when a tile with resources is selected
  - [ ] Amount slider for selecting harvest amount (0-10 scale)

- [ ] Implement the harvest logic in gameStore:
  - [ ] Update tile resource values based on the harvested amount
  - [ ] Convert depleted tiles (value 0) to blank tiles immediately
  - [ ] Update the biome's lushness based on the new tile state

### Phase 5: Refactor Simulator to Use Shared Code
- [ ] Update simulator.js to use the shared EcosystemUtils functions
- [ ] Keep the simulator UI largely the same
- [ ] Ensure both the game and simulator use exactly the same calculation methods


