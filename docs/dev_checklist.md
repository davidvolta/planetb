# Development Checklist

## Upcoming Tasks
- [ ] Change tinting mechanism
- [ ] Hide selector when move is done
- [ ] Fix ineligble spawning moves on terrain
- [ ] Fix bug where player can move after improving habitat

- [x] Create concept of biomes
    - [x] Create BiomeGenerator.ts utility with Voronoi partitioning
    - [x] Update Tile interface to include biomeId property
    - [x] Add Biome interface and biomes collection to GameState
    - [x] Modify TileRenderer to visualize biome borders with colored strokes
    - [x] Add debug toggle for biome visualization
- [x] Init map to create biomes, not just habitats
    - [x] Update initializeBoard to generate biomes using Voronoi algorithm
    - [x] Ensure all tiles belong to a biome based on closest habitat
    - [x] Assign unique color to each biome for visualization
    - [x] Attempted Poisson Disk Sampling for more balanced biome sizes
- [ ] Populate biomes with resources (remove random function)
    - [ ] Update resource generation to be biome-specific instead of random
    - [ ] Associate resource types with specific biome/terrain combinations


- [ ] Implement harvesting
    - Selecting a resource tile (double click behavior for units/eggs)
    
- [ ] Implement energy counter (UI and gamestore)

- [ ] Get rid of react!