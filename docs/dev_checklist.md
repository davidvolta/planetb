# Development Checklist

## Current Priorities
- [ ] Fix initial biome fog of war issue:
  - [ ] Trigger `revealBiomeTiles` for the player's starting biome during initialization
  - [ ] Ensure the initial biome is fully revealed, not just 8 adjacent tiles around habitat
  - [ ] Fix the issue in `initializeVisibility` method in BoardScene.ts (line ~730)
- [ ] Fix linter errors in EcosystemController.ts:
  - [ ] Add proper type checking for Biome properties
  - [ ] Update the biomeEggProduction function to handle the new Biome interface
- [ ] Complete the improveHabitat function refactoring:
  - [ ] Update to set ownership on the biome instead of the habitat
  - [ ] Maintain habitat state changes (POTENTIAL → IMPROVED)
- [ ] Test biome-first ownership logic:
  - [ ] Verify egg production works with biome ownership
  - [ ] Check that new units inherit biome ownership correctly
  - [ ] Ensure UI properly reflects biome ownership

## Upcoming Tasks
- [x] Fix visibility bug in BoardScene.initializeVisibility method where it's using habitat.ownerId instead of biome.ownerId
- [x] Fix visibility bug in BoardScene.revealBiomeTiles where it's using habitat.id as biomeId instead of habitat.biomeId
- [ ] Fix viewport tinting (change to WebGL shader or use a different approach)
- [ ] Fix animal click not functioning
- [ ] Fix animal sprite not showing animation
- [ ] Fix unit rendering over habitats 
- [ ] Enable harvest mechanic, add energy counter (see ecosystem mechanic implementation)
- [ ] Fix empty space beside world map
- [ ] Refactor GameController to follow ECS pattern
- [ ] Implement biome highlighting for valid territory selection
- [ ] Implement egg placement highlighting
- [ ] Highlight adjacency bonuses during placement
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

## Habitat to Biome-Centric Refactoring

### Phase 1: Core Interface Changes
- [x] Update `Biome` interface:
  - [x] Add properties from Habitat (ownerId, productionRate, lastProductionTurn)
  - [x] Make it the primary entity for ownership and production

- [x] Update `Habitat` interface:
  - [x] Add biomeId property
  - [x] Remove ownerId property
  - [x] Keep only position, state, and shelterType
  - [x] Simplify to be just a UI/selection element

- [ ] Fix linter errors:
  - [ ] Add proper type definitions in EcosystemController to recognize Biome properties
  - [ ] Update type definitions in other files where needed

### Phase 2: Update References & Functionality
- [ ] Update initialization code:
  - [x] Set ownership on biomes, not habitats
  - [x] Ensure proper linking between habitats and their parent biomes
  - [x] Set initial player ownership on starting biome

- [ ] Update habitat improvement logic:
  - [ ] Change to set ownership on the parent biome
  - [ ] Keep habitat state transitions (POTENTIAL → IMPROVED)
  - [ ] Remove all habitat ownership code

- [ ] Update animal creation/spawning:
  - [x] Set animal ownership based on biome ownership
  - [x] Ensure eggs inherit ownership from biomes

### Phase 3: Simplify and Rename
- [ ] Rename `isHabitatZoneOverlapping` to `isBiomeOverlapping`
- [ ] Update ownership checks throughout codebase:
  - [ ] Replace `habitat.ownerId` with biome ownership lookups
  - [ ] Keep UI and selection interfaces the same
  - [ ] Keep function signatures where possible to minimize changes

### Phase 4: Biome-Centric Function Updates
- [ ] Simplify `getValidEggPlacementTiles`:
  - [x] Start directly with biomes instead of finding habitats first
  - [x] Remove habitat ownership checks
  - [x] Filter tiles based on biome ownership directly
- [ ] Streamline resource generation:
  - [ ] Focus on biome-based generation without complex habitat avoidance
  - [ ] Simplify resource-biome relationship
- [ ] Update egg production logic:
  - [x] Iterate through biomes directly instead of habitats
  - [x] Set ownership based on biome ownership
- [ ] Simplify player territory recognition:
  - [x] Filter biomes by player ID directly
  - [x] Remove habitat-biome lookup steps
- [ ] Reduce data duplication:
  - [ ] Make biomes contain habitats as features
  - [ ] Remove redundant ownership data
- [ ] Optimize resource adjacency calculations:
  - [ ] Use biomes as the primary unit for resource adjacency
  - [ ] Simplify tile prioritization for egg placement

### Phase 5: Refactor Initialization Logic
**Note**: Early progress made with current implementation. Biomes now store ownership and habitats reference biomes.

- [ ] Update `generateVoronoiBiomes` function:
  - [ ] Make it the primary mechanism for territory assignment
  - [ ] Remove the habitat-centric ID relationship (biomes should have their own IDs)
  - [ ] Simplify biome generation to be independent of habitats

- [ ] Modify habitat placement logic:
  - [ ] Place habitats within existing biomes rather than creating biomes from habitats
  - [ ] Update habitat-biome relationship to be parent-child (biome contains habitats)
  - [ ] Ensure habitats are properly positioned within their parent biome

### Phase 6: Update EcosystemController
**Note**: Progress made with initial functionality, but needs type definition fixes and testing.

- [ ] Refactor EcosystemController methods:
  - [x] Update `generateResources` to work directly with biomes
  - [x] Modify `biomeEggProduction` to iterate through biomes instead of habitats
  - [x] Remove any functions that rely on habitat ownership
  - [ ] Update all utility functions to use biome-first approach





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


