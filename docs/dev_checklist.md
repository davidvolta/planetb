# Development Checklist

## Upcoming Tasks
- [ ] Change tinting mechanism
- [ ] Hide selector when move is done
- [ ] Fix ineligble spawning moves on terrain
- [x] Fix bug where player can move after improving habitat
- [ ] Fix Raley Font (lost during architecture update)
- [x] Hide hover selector during unit movement
- [x] Start player 1 on beach with turtle, adjust turtles to move on grass (Completed: Player 1 starts on beach with turtle unit; turtle unit always spawns on beach tiles; turtles can now move on grass terrain)

- [ ] Populate biomes with resources (remove random function)
    - [ ] Update resource generation to be biome-specific instead of random based on lushness quotient of 8
    - [ ] Add mountain/insects and underwater/plankton resource types
        - [x] Update ResourceType enum to include INSECTS and PLANKTON
        - [x] Modify generateResources() to create insects on mountain terrain and plankton on underwater terrain
        - [x] Update ResourceRenderer to handle new resource types using the existing sprites
        - [ ] Test resource generation and distribution on all terrain types
- [ ] Style edges of owned biomes (flood fill with stroke)

- [ ] Implement harvesting
    - Selecting a resource tile (double click behavior for units/eggs)
    
- [ ] Implement energy counter (UI and gamestore)

- [ ] Refactor for GameController and lessen the load on BoardScene and Gamestore