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

- [] Implement Layer-Based Architecture
  - [] Phase 1: Preparation and Planning
    - [] Review existing container-based implementation
    - [] List all game object types that need rendering
    - [] Define layer hierarchy with appropriate depths
  - [] Phase 2: Core Layer Structure Implementation
    - [] Replace tilesContainer with separate layer properties
    - [] Modify createTiles() to initialize all layers
    - [] Update camera setup to work with layers
  - [] Phase 3: Terrain Layer Implementation
    - [] Refactor createTerrainTile() to use Graphics objects
    - [] Update tile creation to add tiles to terrain layer
  - [] Phase 4: Selection Layer Implementation
    - [] Move selection indicator to selection layer
    - [] Update selection indicator handling
  - [] Phase 5: Static Objects Layer Implementation
    - [] Refactor habitat graphics to use layers
    - [] Implement efficient habitat updating
  - [] Phase 6: Units Layer Implementation
    - [] Update animal sprites to use units layer
    - [] Verify unit interaction
  - [] Phase 7: UI Layer Preparation
    - [] Set up UI layer structure
  - [] Phase 8: State Management Integration
    - [] Update state subscribers for layer architecture
  - [] Phase 9: Clean-up and Optimization
    - [] Remove unused container code
    - [] Fix TypeScript errors and add comments
  - [] Phase 10: Testing and Verification
    - [] Test rendering order and interactions


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
