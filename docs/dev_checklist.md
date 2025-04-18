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

#### Phase 1: Temporary VoronoiNode Implementation
- [ ] Create VoronoiNode Interface
  - [ ] Define a simple interface with just position information
  - [ ] Keep it separate from game entities - purely for generation

- [ ] Modify Map Generation Logic
  - [ ] Update map initialization to generate voronoiNodes instead of habitats

#### Phase 2: Biome-First Generation
- [ ] Update Biome Generation
  - [ ] Use voronoiNodes as centers for Voronoi diagram generation
  - [ ] Store necessary metadata like colors, lushness in biomes

- [ ] Update Biome Interface
  - [ ] Add `habitat` property directly to the Biome interface
  - [ ] Remove habitat-related ID references

#### Phase 3: Habitat Derivation
- [ ] Generate Habitats From Biomes
  - [ ] After biome generation, create habitats for each biome
  - [ ] Place habitats at the same positions as the voronoiNodes
  - [ ] Set habitat IDs independent of biome IDs
  - [ ] Store each habitat directly in its parent biome

- [ ] Remove Temporary VoronoiNodes
  - [ ] Discard voronoiNodes after habitats are placed

#### Phase 4: Update References and Dependencies
- [ ] Update State Access Methods
  - [ ] Modify methods that retrieve habitats to go through biomes
  - [ ] Update `getHabitatAt()` to search through biomes first
  - [ ] Rework `selectHabitat()` to select the biome containing the habitat

- [ ] Refactor Animal Spawning
  - [ ] Rework animal spawning to iterate through biomes instead of habitats
  - [ ] Use biome ownership and properties to determine spawning locations

- [ ] Update Player Starting Position Logic
  - [ ] Find player starting biomes by checking terrain at biome.habitat.position
  - [ ] Assign ownership directly to biomes

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



