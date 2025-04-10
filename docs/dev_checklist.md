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
- [ ] Fix FOW for biomes both during game init and habitat improvement
    - [ ] Extend initializeVisibility() to reveal player's starting biome
    - [ ] Create revealBiomeTiles(habitatId) function in BoardScene.ts
    - [ ] Hook into habitat improvement logic to reveal biome when a habitat is improved
    - [ ] Test biome visibility with initial habitat and newly improved habitats


- [ ] Implement harvesting
    - Selecting a resource tile (double click behavior for units/eggs)
    
- [ ] Implement energy counter (UI and gamestore)

- [ ] Get rid of react!