- Single Selection Tracking: Track only selectedBiomeId in your state, and derive the habitat information when needed.
- Unified Selection Method: Replace selectHabitat with selectBiome that only updates the biome ID.
- Simplify UI Logic: Update UI components to work directly with biomes rather than checking both entities.
- ID Generation: Generate IDs with biome- prefix instead of habitat- to reflect your biome-centric architecture.


### Core State Functions
1. `getHabitatAt(x, y)` - Finds a habitat at specific coordinates
2. `selectHabitat(id)` - Selects a habitat by ID
3. `canImproveHabitat(habitatId)` - Checks if a habitat can be improved
4. `improveHabitat(habitatId)` - Upgrades a habitat's state
5. `recordHabitatImproveEvent(habitatId)` - Tracks habitat improvement for UI/animations

### Initialization and Generation
1. `initializeBoard()` - Creates habitats first, then derives biomes from them
2. `isBiomeOverlapping(position, existingHabitats)` - Uses habitats to check biome overlap
3. `generateVoronoiBiomes(width, height, habitats, terrainData)` - Takes habitats as input for biome generation

### UI/Rendering Functions
1. `revealBiomeTiles(biomeId)` - Takes a biome ID directly to reveal biome tiles
2. `getHabitatRenderer()` - Returns the habitat rendering system
3. `createHabitatGraphic()` - Creates graphical representation of habitats

### Game State Tracking
1. `selectedHabitatId` - Tracks which habitat is selected rather than which biome
2. `selectedHabitatIsPotential` - Checks habitat state rather than biome properties
3. `habitatImproveEvent` - Tracks habitat improvement instead of biome changes

### Other Key Areas
1. Data structure - Biomes have `habitatId` and habitats have `biomeId` (bidirectional references)
2. Tile data - Tiles store `biomeId` but many functions access this through habitats first
3. Game events - Events are habitat-focused (habitatImproveEvent) rather than biome-focused
4. Resource allocation - Initially based around habitat positions
5. Ownership mechanics - While ownership is now stored in biomes, the UI still interacts through habitats



1. **Habitat Selection**: When a habitat is clicked, `selectedHabitatId` is updated and used to identify the selected habitat
3. **UI Elements**: The UIScene uses `selectedHabitatId` in state tracking to determine when to show the capture button
4. **Rendering**: The HabitatRenderer uses habitat IDs to manage graphics and identify habitats in the scene
6. **Event Handling**: Input handling in InputManager checks the `selectedHabitatId` when processing clicks



### Phase 5: Refactor Initialization Logic
- [ ] Update `generateVoronoiBiomes` function:
  - [ ] Make it the primary mechanism for territory assignment
  - [ ] Remove the habitat-centric ID relationship (biomes should have their own IDs)
  - [ ] Simplify biome generation to be independent of habitats
- [ ] Modify habitat placement logic:
  - [ ] Place habitats within existing biomes rather than creating biomes from habitats
  - [ ] Update habitat-biome relationship to be parent-child (biome contains habitats)
  - [ ] Ensure habitats are properly positioned within their parent biome

