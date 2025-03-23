# Development Checklist

## Project Context
- Project Name: Planet B
- Description: A unique turn-based 4x ecological strategy game that dispenses with traditional mechanics and power structures. Planet B models nature and population dynamics to create gameplay that asks the user to balance their growth and exploitation with the world's natural rates of production. 

## Environment Setup
- Node.js environment
- React + Vite
- TypeScript
- Zustand + immer for game state management
- Phaser as our game engine

## Current Focus:
- Focus on core game mechanics (movement, reproduction, interactions, state updates, etc.) client-side in a way that could later run on a server. 

## Upcoming Tasks

- [ ] Implement Game State Machine for Initialization
  - Phase 1: Create Foundation
    - [ ] Define GameInitState enum (UNINITIALIZED, LOADING_ASSETS, CREATING_BOARD, PLACING_HABITATS, PLACING_ANIMALS, READY)
    - [ ] Update GameInitializer Service with state tracking
    - [ ] Create state transition guards and validation

  - Phase 2: Sequential Initialization
    - [ ] Refactor Asset Loading into GameInitializer
    - [ ] Create separate Board Initialization Stage
    - [ ] Implement separate Entity Placement Stages

  - Phase 3: Integration
    - [ ] Update BoardScene to follow state machine
    - [ ] Refactor Game Component to handle initialization states
    - [ ] Implement Clean Restart Process for map size changes

  - Phase 4: Cleanup & Polish
    - [ ] Remove Redundant Code and console warnings
    - [ ] Add Error Recovery and timeout detection
    - [ ] Add Initialization Progress UI

  - Phase 5: Testing & Verification
    - [ ] Test Edge Cases (rapid changes, missing assets)
    - [ ] Measure Performance improvements
    - [ ] Final Polish and documentation

- [] Implement habitat improvement

- [] Add fog of war

- [] Unit movement
  - [] Add highlight for available moves
  - [] Add unit selector
  - [] Add Secondary (tile) selector
    
- [] Performance optimizations
  - [] Add viewport culling to only render visible tiles
  - [] Tile Object Pooling
  - [] Implement texture-based rendering for terrain tiles
  - [] Create incremental updates to avoid full board recreation
  - [] Optimize event listeners with event delegation


## Completed Tasks
- [x] Add unit production (eggs)
- [x] Add unit spawning
- [x] Implement habitats
- [x] Add unit hatching from eggs
- [x] Fix Corners of Terrain Generation
- [x] Add first unit
- [x] Add state for player
- [x] Add game status panel
- [x] Display turn number
- [x] Create basic game board with tiles
- [x] Implement Coordinate System for tiles
- [x] Implement terrain generation
- [x] Create turn-based system
- [X] Create core game state store with turn, and board state
- [x] Main game routing setup
- [x] Project structure organization
- [x] Install Node.js, Phaser, Zustand, React and Vite
- [x] Implement GameInitializer service for centralized game initialization
- [x] Create StateObserver utility for safe Phaser-Zustand communication
