# Development Checklist

## Upcoming Tasks
- [ ] Fog of War Fixes
  - [ ] Document Fog of War!
  - [ ] Fix the FOW checkbox to retain state
  - [ ] Track visibility changes for fog of war state / generally connect it to zustand


- [ ] Animal Movement Abilities System
  - [x] Phase 1: Core Structure
    - [x] Create Animal Abilities interface (moveRange and compatibleTerrains)
    - [x] Establish Species Registry with abilities for each animal type
    - [x] Update Animal interface (rename type to species)
    - [x] Create utility functions to access species abilities
  - [x] Phase 2: Implementation
    - [x] Update all references from animal.type to animal.species
    - [x] Refactor movement calculation to check terrain compatibility
    - [x] Update displacement logic to respect terrain restrictions
  - [x] Phase 3: Habitat Integration
    - [x] Update habitat spawning to use terrain-compatible species
    - [x] Ensure compatibility with existing sprite system
    - [ ] Test all animal/terrain combinations
  - [ ] Phase 4: Polish
    - [x] Fix AnimalRenderer to use species for sprite textures
    - [ ] Documentation and code cleanup

## Playable Game Tasks
- [ ] Do not let players spawn units from habitats they do not own (during multiplayer)
- [ ] Fix habitat/unit bug
- [ ] Limit player movement to only those biomes they are allowed in
- [ ] Players can only improve habitat on their next turn and that ends their turn