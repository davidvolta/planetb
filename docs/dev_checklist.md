# Development Checklist

## Biome-Centric Refactoring Plan

### Phase 1: Data Model Changes
1. **Revise Core Interfaces**
   - [x] Remove `HabitatState` enum completely
   - [x] Update `Habitat` interface to remove state and shelterType
   - [x] Ensure Biome ownership is the central data concept

2. **Event System Updates**
   - [x] Replace `habitatImproveEvent` with `biomeCaptureEvent`
   - [x] Update event structure to reference biomeId instead of habitatId
   - [x] Update event handlers and subscriptions

3. **Selection System Revision**
   - [x] Consolidate habitat/biome selection into a single concept
   - [x] Ensure selecting a habitat correctly sets the selected biome

### Phase 2: Method & Function Refactoring
1. **Action Method Renaming**
   - [x] Rename `improveHabitat()` to `captureBiome()`
   - [x] Rename `canImproveHabitat()` to `canCaptureBiome()`
   - [x] Update parameters to use biomeId where possible

2. **State Logic Updates**
   - [x] Modify state tracking to focus on biome ownership
   - [x] Remove all habitat-state-related conditionals
   - [x] Update egg production logic to depend solely on biome ownership

3. **UI Text Updates**
   - [x] Change button text from "Improve Habitat" to "Capture Biome"
   - [x] Update any tooltips or help text

### Phase 3: Testing & Gameplay Verification
1. **Core Mechanics Testing**
   - [x] Test biome capturing process
   - [x] Verify egg production in owned biomes
   - [x] Ensure resource generation still works correctly

2. **UI/UX Testing**
   - [x] Verify all UI elements work with the new model
   - [x] Ensure proper feedback for player actions

### Phase 4: Code Cleanup
1. **Remove Obsolete Code**
   - [x] Delete unnecessary habitat state references
   - [ ] Remove redundant code paths

2. **Documentation Update**
   - [x] Update comments to reflect biome-centric design
   - [x] Update development checklist

## Upcoming Tasks
- [ ] Fix bug where unit spawning at valid location shows "invalid location" message
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

### Phase 4: Biome-Centric Function Updates
- [x] Simplify `getValidEggPlacementTiles`:
  - [x] Refactor to use biomes directly instead of habitats
  - [x] Further optimize by removing habitat-based proximity calculations
- [x] Streamline resource generation:
  - [x] Focus on biome-based generation without complex habitat avoidance
  - [x] Simplify resource-biome relationship
- [ ] Simplify player territory recognition:
- [ ] Reduce data duplication:
  - [ ] Make biomes contain habitats as features
  - [ ] Remove redundant ownership data
- [ ] Optimize resource adjacency calculations:
  - [x] Use biomes as the primary unit for resource adjacency
  - [ ] Simplify tile prioritization for egg placement


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


