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

- [] Implement Layer-Based Architecture
  - [] Phase 8: State Management Integration
    - [x] Update state subscribers for layer architecture
    - [x] Refactor setupSubscriptions method to more deeply embrace layer architecture
    - [x] Enhance updateBoard method to better leverage the layer system when rebuilding board state
  - [] Phase 9: Clean-up and Optimization
    - [x] Remove unused container code
    - [] Migrate remaining methods from container-based to layer-based:
      - [x] updateBoard() - Remove tilesContainer dependency
      - [x] getHoveredTile() - Use layer-based approach instead of tilesContainer
      - [x] setupClickEventDelegation() - Refactor to fully embrace layers
      - [x] createTiles() - Remove "backward compatibility" container creation
      - [x] setupControls() - Update camera controls to use layers
      - [x] onDragStart() and onDragEnd() - Update to work with layers
      - [x] shutdown() - Update cleanup to handle layers
      - [x] onAnimalClicked() - Remove or update for layer architecture
      - [x] worldToGrid() - Use layer-independent coordinate conversion
    - [] Fix TypeScript errors and add comments
  - [] Phase 10: Testing and Verification
    - [] Test rendering order and interactions


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
