# Development Checklist

## Upcoming Tasks
- [ ] Change tinting mechanism
- [ ] Hide selector when move is done
- [ ] Fix ineligble spawning moves on terrain
- [ ] Fix bug where player can move after improving habitat

- [ ] Populate biomes with resources (remove random function)
    - [ ] Update resource generation to be biome-specific instead of random based on lushness quotient of 8
    - [ ] Add mountain/insects and underwater/plankton resource types
- [ ] Style edges of owned biomes (flood fill with stroke)
- [ ] Update egg production to be anywhere in biome
    - [ ] Extend getValidEggPlacementTiles to find all valid tiles in biome
    - [ ] Add filter to prevent placing eggs on resource tiles
    - [ ] Prioritize placement next to resource tiles
    - [ ] Add performance tracking to measure execution time
    - [ ] Maintain existing production rate rules and limitations


- [ ] Implement harvesting
    - Selecting a resource tile (double click behavior for units/eggs)
    
- [ ] Implement energy counter (UI and gamestore)

- [ ] Get rid of react!