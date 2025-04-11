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


- [ ] Implement harvesting
    - Selecting a resource tile (double click behavior for units/eggs)
    
- [ ] Implement energy counter (UI and gamestore)

- [ ] Remove React from Planet B
    - [x] Phase 1: Setup Standalone Structure
      - [x] Create public/index.html with game container div
      - [x] Create src/game.ts with Phaser initialization code
      - [x] Create src/index.ts as the entry point that imports game.ts
      - [x] Update build configuration (vite.config.js or webpack.config.js) to use new entry point
    - [x] Phase 2: Port Initialization Logic
      - [x] Copy Phaser config from Game.tsx to game.ts
      - [x] Move any game initialization code from React components to game.ts
      - [x] Ensure all necessary scene imports are in game.ts
      - [x] Verify initial board setup logic is properly transferred
    - [x] Phase 3: Test Dual-Mode Running
      - [x] Add "build:standalone" script to package.json to build standalone version
      - [x] Create a way to toggle between React and standalone modes for testing
      - [x] Run in standalone mode and verify game loads correctly
      - [x] Test all core game functionality in standalone mode
    - [ ] Phase 4: Clean Transition
      - [ ] Once standalone mode is fully functional, remove React dependencies
      - [ ] Delete React components (.tsx files)
      - [ ] Update package.json to remove React scripts and dependencies
      - [ ] Simplify build process for standalone-only operation
    - [ ] Phase 5: Optimization
      - [ ] Remove any unused imports/files left over from React
      - [ ] Check for redundant state updates that were needed for React bridge
      - [ ] Optimize the game initialization sequence
      - [ ] Verify performance improvement without React overhead