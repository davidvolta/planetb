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

- [x] Egg Hatching and Unit Displacement
  ### Unit Spawning & Displacement Implementation Plan
  
  #### Phase 1: Dormant Unit Initialization
  - [x] Modify game initialization to place units in dormant state (eggs) near habitats
  - [x] Ensure dormant units have appropriate visual representation (egg sprites)
  - [x] Validate dormant units are properly registered in game state

  #### Phase 2: UI-Controlled Spawning
  - [x] Modify click handler for eggs to only select the dormant unit rather than activating it
  - [x] Add a "Spawn Unit" button to the game controller UI that only appears when a dormant unit is selected
  - [x] Connect button to the existing activation function to transform egg into active unit
  - [x] Test that eggs can be selected but only activate when button is pressed

  #### Phase 3: Spawning as Turn Action
  - [x] Modify the unit activation function to:
    - [x] Change unit state from dormant to active
    - [x] Apply the "moved" tint to indicate turn is used
    - [x] Set unit state to "hasMoved" (or equivalent)
    - [x] Ensure unit cannot perform other actions this turn

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