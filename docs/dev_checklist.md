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
- [] Implement diagonal movement and displacement
- [ ] Implement habitat improvement
- [ ] Add player 1 to game board on beach with habitat already under player control
- [ ] Add fog of war
- [ ] Move Unit range to a new kind of structure where each animal has its abilities stored


- ### Technical Debt / Refactoring
- [ ] Refactor BoardScene (currently too large at 1400+ lines):
  - [ ] Create dedicated renderer classes:
    - [ ] TileRenderer: Handle tile creation and updates
    - [ ] AnimalRenderer: Manage animal sprite lifecycle
    - [ ] HabitatRenderer: Handle habitat visuals 
  - [ ] Extract input handling to InputManager class
  - [ ] Move coordinate conversion logic to CoordinateUtils
  - [ ] Create AnimationController for movement animations
  - [ ] Split layer management into LayerManager

- ### Performance optimizations
  - [ ] Add viewport culling to only render visible tiles
  - [ ] Tile Object Pooling
  - [ ] Implement texture-based rendering for terrain tiles
  - [ ] Create incremental updates to avoid full board recreation
  - [ ] Optimize event listeners with event delegation

