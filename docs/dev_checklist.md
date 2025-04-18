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

## Architecture Cleanup

### Refactor EcosystemController
- [x] Create missing action functions in actions.ts:
  - [x] `getBiomes()`: To replace direct calls to `useGameStore.getState().biomes`
  - [x] `getBiomeById(id)`: To get a specific biome (already exists but needs review)
  - [x] `getResourcesForBiome(biomeId)`: To get resources belonging to a biome
  - [x] `updateBiomeLushness(biomeId, value)`: To update a biome's lushness value
  - [x] `addAnimal(animal)`: To add new animals to the state
  - [x] `updateBiomesMap(biomes)`: To update multiple biomes at once
  
- [x] Refactor EcosystemController methods to use action functions:
  - [x] Update `generateResources()` to use actions instead of direct state access
  - [x] Update `getValidEggPlacementTiles()` to use actions
  - [x] Update `biomeEggProduction()` to use actions for state mutations
  - [x] Refactor `selectResourceTile()` and `harvestResource()` to follow architecture
  - [x] Update `calculateBiomeLushness()` and other methods
  
- [x] Add proper state update patterns:
  - [x] Replace any direct state mutations with action function calls
  - [x] Ensure EcosystemController remains stateless (controller only)
  - [x] Update return types to be consistent with action functions

### Further Biome-Centric Alignment
- [ ] Audit and update terminology in codebase:
  - [ ] Rename any remaining habitat-focused variables to emphasize biomes
  - [ ] Update comments and documentation to reflect biome-centric design
  - [ ] Ensure habitat properties are always accessed through parent biomes
  
- [ ] Update EcosystemController methods for biome-centric approach:
  - [ ] Refine `getValidEggPlacementTiles()` to emphasize biome ownership
  - [ ] Update resource generation to more directly associate resources with biomes
  - [ ] Ensure egg production is fully biome-driven (not habitat-driven)

- [ ] Correct any data modeling inconsistencies:
  - [ ] Ensure `Biome` interface properly encapsulates all habitat functionality
  - [ ] Verify habitat references are only accessed through biomes
  - [ ] Remove any lingering habitat-centric domain concepts


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


