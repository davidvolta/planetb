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
- [] Add first unit
- [] Unit movement
  - [] Add highlight for available moves
  - [] Add unit selector
  - [] Add Secondary (tile) selector

- [] State Management Refactoring
  - [] Implement proper subscription system
    - [] Create a state observer utility for Phaser scenes
    - [] Use Zustand's subscribe method for fine-grained updates
    - [] Remove all direct getState() calls from BoardScene.ts
  - [] Fix initialization issues
    - [] Move board initialization logic out of BoardScene
    - [] Implement fallback handling without modifying state
  - [] Implement unidirectional data flow
    - [] Create event system for Phaser → React communication
    - [] Add event handlers in React components for Phaser events
    - [] Remove state modifications from Phaser code
  - [] Improve update efficiency
    - [] Implement incremental board updates 
    - [] Add dirty checking to only update changed tiles
    - [] Replace full scene recreation with targeted updates
    
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


## State Management
- Phaser renders tiles, not React → No unnecessary React re-renders.
- Zustand handles state  → No need for prop drilling or React updates.
- Phaser subscribes to state → Tiles update only when needed, not every frame.
- React only controls UI → Buttons, menus, etc., remain separate from game rendering.

### React Handles:
✅ UI elements like menus, buttons, settings, overlays
✅ Debugging panels, player stats, chat windows
✅ Anything that's not part of the game world

### Phaser Handles:
✅ Game world interactions (clicking tiles, moving units, attacking, etc.)
✅ Rendering the game board & animations
✅ Detecting player input inside the game world (drag, zoom, click, etc.)

### Zustand Does:
✅ Syncs game state (board state, turn order, resources, etc.)
✅ Syncs UI state (menu open/close, debugging tools, etc.)
✅ Allows Phaser & React to communicate without re-renders 