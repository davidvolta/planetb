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

- [] Implement unit movement restriction (one move per turn)
  - Phase 1: State Management
    - [] Add `hasMoved` flag to each animal/unit in the gameStore
    - [] Modify the animal interface to include this property
    - [] Initialize `hasMoved` to false for all new units
    - [] Add a resetMovementFlags action to the store that sets all flags to false
    - [] Call resetMovementFlags when advancing to the next turn
  
  - Phase 2: Movement Logic Changes
    - [] Modify moveUnit action to set the unit's `hasMoved` flag to true
    - [] Update the onComplete handler of the animation to properly set this flag
    - [] Ensure state is updated after animation completes
  
  - Phase 3: Selection Logic Changes
    - [] Modify unit selection logic to check the `hasMoved` flag
    - [] Prevent selection for movement if the unit has already moved
    - [] Update BoardScene's click handlers to check this property
    - [] Update validMoves calculation to return empty array for units that have moved
  
  - Phase 4: Visual Feedback
    - [] Apply tint(0x888888) to units that have moved in renderAnimalSprites
    - [] Reset tint to normal (0xFFFFFF) when `hasMoved` is false
    - [] Add visual transitions when units become unavailable

  - Phase 5: Click Handling Priority
    - [] Maintain unit → tile click priority order
    - [] For moved units, modify the click handler to pass through to the tile
    - [] Ensure tile selection works even when a moved unit is present
    - [] Test all combinations of unit states and click behaviors

- [] Move Unit range to a new kind of structure where each animal has its abilities stored
- [] Egg Hatching and Unit Displacement
- [] Implement habitat improvement
- [] Add fog of war
    
- [] Performance optimizations
  - [] Add viewport culling to only render visible tiles
  - [] Tile Object Pooling
  - [] Implement texture-based rendering for terrain tiles
  - [] Create incremental updates to avoid full board recreation
  - [] Optimize event listeners with event delegation