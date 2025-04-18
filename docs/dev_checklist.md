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


### True Biome-Centric Architecture

#### Phase 1: Create VoronoiNode Interface and Update Related Functions
- [x] Create VoronoiNode Interface in BiomeGenerator.ts:
  - [x] Define a simple interface with position information
  - [x] Include an ID field for temporary generation purposes
  - [x] Import necessary dependencies (Coordinate)

- [x] Update the generateVoronoiBiomes function:
  - [x] Change signature to accept VoronoiNodes instead of habitats
  - [x] Modify internal references to use node.id instead of habitat.id
  - [x] Ensure color generation and biome mapping are still working correctly

- [x] Create a node-compatible version of isBiomeOverlapping:
  - [x] Implement isNodeOverlapping with same logic as existing function
  - [x] Review distance calculations to ensure biome separation is maintained

#### Phase 2: Modify Board Initialization Process
- [x] Update initializeBoard in gameStore.ts:
  - [x] Create an array to hold temporary VoronoiNodes
  - [x] Replace habitat generation with VoronoiNode generation
  - [x] Use same positioning and terrain-type logic currently used for habitats
  - [x] Maintain player starting position identification logic

- [x] Modify biome generation to work with nodes:
  - [x] Pass nodes (not habitats) to generateVoronoiBiomes
  - [x] Generate proper biome IDs with "habitat-" prefix (for compatibility)
  - [x] Create biomes directly from VoronoiNodes
  - [x] Assign player ownership based on node terrain (e.g., beach terrain)

#### Phase 3: Create Habitats as Properties of Biomes
- [x] Add habitat field to Biome interface:
  - [x] Update the interface in gameStore.ts
  - [x] Ensure backward compatibility with existing code

- [x] Create habitats from biomes:
  - [x] After biome generation, create habitats positioned at VoronoiNode locations
  - [x] Assign habitat IDs using same format as before
  - [x] Store each habitat in its parent biome
  - [x] Also add habitats to the habitats array for compatibility

- [x] Clean up temporary structures:
  - [x] Discard VoronoiNodes after habitats are created
  - [x] Ensure no lingering references to temporary generation structures

#### Phase 4: Update References and Dependencies
- [x] Update State Access Methods
  - [x] Modify methods that retrieve habitats to go through biomes first
  - [x] Update `getHabitatAt()` to search through biomes first
  - [x] Rework `selectHabitat()` to select the biome containing the habitat

- [x] Refactor Animal Spawning
  - [x] Rework animal spawning to iterate through biomes instead of habitats
  - [x] Use biome ownership and properties to determine spawning locations

- [x] Update Player Starting Position Logic
  - [x] Find player starting biomes by checking terrain at biome.habitat.position
  - [x] Assign ownership directly to biomes

#### Phase 5: UI and Rendering Updates
- [ ] Update BoardScene and Renderers
  - [ ] Modify HabitatRenderer to get habitat data from biomes
  - [ ] Update initialization visibility to work with biome-centric structure
  - [ ] Ensure fog of war reveals work with biome-centric structure

- [ ] Update Selection and Capture Mechanics
  - [ ] Ensure `canCaptureBiome` and `captureBiome` use the new structure
  - [ ] Update UI components to work with biome selection directly

#### Phase 6: Testing and Validation
- [ ] Create Test Cases
  - [ ] Verify map generation produces expected structures
  - [ ] Test biome ownership and capturing work correctly
  - [ ] Validate animal spawning and player starting positions

- [ ] Documentation Update
  - [ ] Update BIOME CENTRIC DESIGN.md to reflect completed changes
  - [ ] Mark Phase 5 tasks as completed
  - [ ] Document the new biome-centric architecture



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



