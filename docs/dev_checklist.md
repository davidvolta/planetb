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
- [] Tile Selection Implementation
  - [] Phase 1: Basic Selection Layer
    - [x] Create a single selection indicator object in BoardScene
    - [x] Implement scene-level mouse tracking (replacing tile-level hover events)
    - [x] Add a grid coordinate conversion utility (screen coords → tile coords)
    - [] Implement logic to move selection indicator to the tile under cursor
    - [x] Remove all individual tile hover listeners
  - [] Phase 2: Enhanced Selection Features
    - [] Add visual states for the selection indicator (hover, selected, invalid)
    - [] Implement click handling using the selection layer
    - [] Add keyboard navigation support for selection
    - [] Connect selection events to game state
  - [] Phase 3: Multi-selection and Actions
    - [] Implement secondary selection for target tiles
    - [] Add visual indication for available moves/actions
    - [] Connect selection to unit movement mechanics
    - [] Implement action validation and preview

- [] Fix Corners of Terrain Generation
- [] Add first unit
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

- [] Add fog of war
- [] Implement habitats
- [] Implement habitat improvement
- [] Add unit production (eggs)
- [] Add unit hatching from eggs
- [] Add unit spawning

## Completed Tasks
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
