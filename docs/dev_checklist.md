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

- [] Move Unit range to a new kind of structure where each animal has its abilities stored
- [x] Unit movement
  ### Phase 1: State Management & Setup
  - [x] Add Movement State
    - [x] Extend Zustand store with `selectedUnit`, `validMoves`, and `moveMode` fields
    - [x] Create interfaces for movement-related data structures
    - [x] Implement unit movement range parameters (movement points)

  - [x] Create Action Functions
    - [x] `selectUnit(unitId)` - Handle unit selection and calculate valid moves
    - [x] `deselectUnit()` - Clear selection state
    - [x] `moveUnit(unitId, destination)` - Handle unit movement logic
    - [x] `getValidMoves(unitId)` - Calculate tiles a unit can move to

  - [x] Movement Range Algorithm
    - [x] Implement breadth-first search to calculate valid moves
    - [x] Configure algorithm to allow free movement (no terrain restrictions)
    - [x] Enforce rule: Units can move onto tiles with eggs, but not onto tiles with other units
    - [x] Implement different movement ranges for each animal type:
      - Buffalo: 2 tiles
      - Bird: 4 tiles
      - Fish: 3 tiles
      - Snake: 2 tiles
      - Bunny: 3 tiles

  ### Phase 2: Layer Structure & Visual Feedback
  - [x] Update Layer Structure
    - [x] Add new `moveRangeLayer` between selection layer and static objects layer
    - [x] Adjust depth values for all subsequent layers
    - [x] Update the `setupLayers()` method to include the new layer

  - [x] Move Range Highlight System
    - [x] Create diamond-shaped highlight graphics for valid moves (yellow with glow effect)
    - [x] Scale highlights to 85% of tile size
    - [x] Update BoardScene to show/hide highlights based on state

  - [x] Fix Tile Click Detection
    - [x] Modify input handling to detect clicks on tiles even when units are present
    - [x] Implement proper event propagation or hit testing

  ### Phase 3: Input Flow & Movement Logic
  - [x] Input Handling Flow
    - [x] Update event handlers for unit selection → show valid moves → destination selection
    - [x] Ensure movement validation enforces the "can move onto eggs but not units" rule

  - [x] Movement Animation
    - [x] Implement `animateUnitMovement(unitId, path)` in BoardScene
    - [x] Use Phaser tweens for smooth animation between tiles
    - [x] Handle depth sorting during movement for proper layering

  ### Phase 4: Integration & Testing
  - [x] State Observer Integration
    - [x] Set up proper subscriptions for movement-related state
    - [x] Ensure Phaser only visualizes movement, not determines it

  - [x] Edge Cases & Error Handling
    - [x] Handle interrupted movements
    - [x] Prevent movement during animations
    - [x] Add validation to prevent illegal moves

  - [x] UI Integration
    - [x] Add unit information panel showing movement range
    - [x] Display valid moves count in the UI
    - [x] Add ability to deselect units

  ### Phase 5: Optimization
  - [] Performance Optimization
    - [] Batch rendering of move highlights
    - [] Reuse graphics objects
    - [] Implement object pooling for movement effects

- [] Implement habitat improvement
- [] Add fog of war
    
- [] Performance optimizations
  - [] Add viewport culling to only render visible tiles
  - [] Tile Object Pooling
  - [] Implement texture-based rendering for terrain tiles
  - [] Create incremental updates to avoid full board recreation
  - [] Optimize event listeners with event delegation

## Completed Tasks
- [x] Created Tile Layers (Removed Tile Container)
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
