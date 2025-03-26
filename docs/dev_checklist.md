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

- [] Egg Hatching and Unit Displacement
  ### Unit Spawning & Displacement Implementation Plan

  #### Phase 4: Displacement Mechanics
  - [ ] Add displacement logic when a unit spawns underneath an active unit:
    - [ ] Check if active unit exists at spawn location
    - [ ] Determine displacement direction based on unit's move status:
      - [ ] If unit has already moved: attempt to continue in previous direction
        - [ ] Validate displacement location is valid
        - [ ] Fall back to adjacent tile if invalid
      - [ ] If unit has not moved: choose random valid adjacent tile
        - [ ] Ensure displaced unit remains in "not moved" state
  - [ ] Implement visual feedback for displacement

  #### Phase 5: Bug Fix for Dormant Unit Preservation
  - [ ] Identify where eggs are being removed when active units move onto them
  - [ ] Modify movement logic to allow active units to coexist with dormant units
  - [ ] Ensure dormant units remain in game state when active units occupy same tile
  - [ ] Add visual indication that both units occupy same tile

  #### Testing Scenarios
  - [x] Test dormant unit initialization
  - [x] Test UI button appears only for dormant units
  - [x] Test spawning correctly uses the unit's turn
  - [ ] Test displacement in various scenarios
  - [ ] Test units can move onto eggs without destroying them

  #### Edge Cases to Handle
  - [ ] No valid displacement location available
  - [ ] Multiple units needing displacement simultaneously
  - [ ] Displacement chain reactions
  - [ ] UI state when selecting units at different stages
  - [ ] Interaction with other game mechanics

- [] Fix Tile Selection Bug of clicking tile after egg (this seems systemic)
- [] Fix Rendering order of initial/produced eggs so its south to north
- [] Fix Tile Selection bug of spawning unit but the tile selector still stays
- [ ] Implement habitat improvement
- [ ] Add player 1 to game board
- [ ] Add fog of war


- [ ] Move Unit range to a new kind of structure where each animal has its abilities stored

- [ ] Performance optimizations
  - [ ] Add viewport culling to only render visible tiles
  - [ ] Tile Object Pooling
  - [ ] Implement texture-based rendering for terrain tiles
  - [ ] Create incremental updates to avoid full board recreation
  - [ ] Optimize event listeners with event delegation