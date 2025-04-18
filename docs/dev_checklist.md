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

## Habitat to Biome-Centric Refactoring

### Phase 1: Redesign Ownership Model
- [ ] Modify `Biome` interface to include direct player ownership:
  - [ ] Add `ownerId` property to biomes
  - [ ] Change habitats to be features within biomes rather than the reverse
  - [ ] Update UI and selection logic to focus on biomes as the primary entity

### Phase 2: Simplify Egg Production Logic
- [ ] Redesign egg production to be biome-driven rather than habitat-driven:
  - [ ] Base egg production rates on biome lushness directly
  - [ ] Simplify egg placement by working directly with biome tiles
  - [ ] Remove the indirect habitat → biome → tile chain

### Phase 3: Restructure Resource Generation
- [ ] Refactor `generateResources` to use biomes as the primary organizational unit:
  - [ ] Generate resources directly within biomes rather than avoiding habitats
  - [ ] Base resource types and density on biome characteristics
  - [ ] Simplify biome-resource relationship tracking

### Phase 4: Streamline Player Territory Management
- [ ] Create direct methods for tracking and managing player-owned territory:
  - [ ] Add function to get all biomes owned by a player
  - [ ] Simplify territory border calculations with biome-first approach
  - [ ] Update UI to show territory based on biome ownership, not habitat ownership

### Phase 5: Reduce Data Duplication
- [ ] Remove redundancy between habitats and biomes:
  - [ ] Move relevant properties from habitats to biomes
  - [ ] Create a cleaner habitat model as a feature within biomes
  - [ ] Update all references to habitat properties that should be biome properties

### Phase 6: Simplify Resource Adjacency Calculations
- [ ] Rewrite prioritization logic for egg placement and other territory operations:
  - [ ] Base calculations on biome as the primary unit
  - [ ] Simplify tracking of resources within biomes
  - [ ] Reduce complexity of cross-biome calculations

### Phase 7: Update EcosystemController
- [ ] Refactor `EcosystemController` to fully embrace biome-centric design:
  - [ ] Move `isHabitatZoneOverlapping` to EcosystemController
  - [ ] Rename and redesign to work with biome zones instead of habitat zones
  - [ ] Implement new methods for biome-territory calculations

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


