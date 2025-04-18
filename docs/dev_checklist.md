# Development Checklist


## Upcoming Tasks
- [ ] Change tinting mechanism
- [ ] Fix double clicking bug on spawn units
- [ ] Fix ineligble spawning moves on terrain
- [ ] Now its kind of boring that eggs appear in the same place always
- [ ] Fix Raley Font (lost during architecture update)
- [ ] Style edges of owned biomes (flood fill with stroke)

- [ ] Implement harvesting
    - Selecting a resource tile (double click behavior for units/eggs)
     - Allow partial harvesting (0-10 scale per resource)
    
- [ ] Implement energy counter (UI and gamestore)

- [ ] Refactor for GameController and lessen the load on BoardScene and Gamestore


## True Biome-Centric Architecture

### API and Naming Updates
- [ ] Rename `selectHabitat()` to `selectBiome()` in actions.ts
- [ ] Update parameter names from habitatId to biomeId where appropriate
- [ ] Update references to `selectedHabitatId` in UIScene.ts to use `selectedBiomeId`
- [ ] Rename HabitatRenderer to BiomeRenderer for consistency


### UI Optimization
- [ ] Update UI components to directly reference biome properties
- [ ] Check and update any remaining references to habitat properties in UI
- [ ] Consider Habitat visualization as a feature of BiomeRenderer

### Remaining Function Conversions
- [ ] Revisit any remaining habitat-focused functions in gameStore.ts
- [ ] Consider removing habitats array entirely when all systems are updated
- [ ] Update checkTileContents() and similar functions to focus on biomes first

### Documentation and Testing
- [ ] Add unit tests for the biome-centric architecture
- [ ] Update comments throughout the code to reflect biome-centric terminology
- [ ] Create flow diagrams showing the new biome-centric architecture
- [ ] Update BIOME CENTRIC DESIGN.md to reflect completed changes
- [ ] Document the new biome-centric architecture
- [ ] Document the new resource generation approach
- [ ] Explain the elimination of habitat array dependency
- [ ] Update any diagrams or code examples


## Ecosystem Integration Plan

### Phase 1: Enhance Biome Structure & Setup Ecosystem Utilities
- [ ] Extend the `Biome` interface in gameStore.ts to include:
  - [ ] Resources array with status tracking (value, active, hasEgg)
  - [ ] Lushness properties (baseLushness, lushnessBoost) - with total lushness as the main value
  - [ ] Resource tracking (initialResourceCount, nonDepletedCount, totalHarvested, eggCount)

- [ ] Create a new utils file `EcosystemUtils.ts` containing:
  - [ ] The polynomial resource generation formula with fixed coefficient values
  - [ ] Lushness calculation functions
  - [ ] Egg production logic based on lushness threshold (≥7.0)

- [ ] Update the BiomeGenerator to initialize biomes with proper ecosystem values

### Phase 2: Update Rendering System
- [ ] Enhance ResourceRenderer to:
  - [ ] Display resource values numerically on tiles
  - [ ] Use opacity to visualize resource health (value/10)
  - [ ] Keep the existing resource assets, just modify their display

- [ ] Update HabitatRenderer to show biome lushness:
  - [ ] Display total lushness value on the habitat
  - [ ] Use red text for lushness below 7.0, green for 7.0+

### Phase 3: Replace Habitat Production with Biome-Based Ecosystem
- [ ] Replace the current processHabitatProduction function with ecosystem-based logic:
  - [ ] Calculate resource regeneration based on lushness
  - [ ] Update lushness values for each biome
  - [ ] Produce dormant animal units (eggs) based on lushness thresholds
  - [ ] Keep existing system where eggs are represented as dormant animal units

- [ ] Connect this to the existing evolveAnimal function for converting eggs to active animals

### Phase 4: Implement Harvesting System
- [ ] Create new action functions in actions.ts:
  - [ ] selectResourceTile(x, y)
  - [ ] harvestResource(resourceId, amount)

- [ ] Add UI components for harvesting:
  - [ ] Harvest button that appears when a resource is selected
  - [ ] Amount slider for selecting harvest amount (0-10 scale)

- [ ] Implement the harvest logic in gameStore:
  - [ ] Update resource values based on the harvested amount
  - [ ] Convert depleted resources (value 0) to blank tiles immediately
  - [ ] Update the biome's lushness based on the new resource state

### Phase 5: Refactor Simulator to Use Shared Code
- [ ] Update simulator.js to use the shared EcosystemUtils functions
- [ ] Keep the simulator UI largely the same
- [ ] Ensure both the game and simulator use exactly the same calculation methods


## ID and Structure Improvements
- [x] Update ID generation to use "biome-" prefix instead of "habitat-" prefix
- [x] Make biome IDs independent of habitat IDs (not sharing IDs)
- [x] Fully implement parent-child relationship between biomes and habitats
- [ ] Consider making habitats a collection within biomes (one-to-many)

### Habitats Array Removal Plan
- [ ] Create focused utility functions needed to replace array access:
  - [ ] `getHabitatById(id)`: Finds a habitat by its ID using biomes lookup
- [ ] Audit and update all direct references to state.habitats:
  - [ ] In BoardScene.checkTileContents(): Continue using Array.from(biomes.values()).map()
  - [ ] In StateSubscriptionManager: Replace with direct biomes iteration
  - [ ] Identify and update any other places in the codebase
- [ ] Modify `getHabitatAt()` to only search through biome.habitat properties (remove fallback to habitats array)
- [ ] Update `selectHabitat()` to only find habitats through biomes
- [ ] Add deprecation warnings to all remaining functions that reference the habitats array directly
- [ ] Add console warnings when the habitats array is accessed directly
- [ ] Remove the habitats array from the GameState interface
- [ ] Remove habitats array population during board initialization
- [ ] Update tests to reflect the removal of the habitats array
- [ ] Final pass: verify no references to habitats array remain in the codebase



