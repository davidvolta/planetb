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

# Upcoming Tasks

- [x] Add fog of war
  - [x] Phase 1: FOW Data Structure
    - [x] Create FogOfWarRenderer Class
    - [x] Add Visibility State to Tile Structure
    - [x] Set Up Initial Visibility State
  - [x] Phase 2: FOW Tile Rendering
    - [x] Create FOW Tile Graphics
    - [x] Manage FOW Tiles Container
    - [x] Build FOW Layer Management
  - [x] Phase 3: Visibility Calculation Logic
    - [x] Implement Visibility Calculation Functions
    - [x] Optimize Visibility Calculations
    - [x] Create Visibility Update Pipeline
  - [x] Phase 4: Animation and Reveal Effects
    - [x] Implement Tile Reveal Animation
    - [x] Handle Transition Edge Cases
  - [x] Phase 5: Toggle Functionality
    - [x] Add FOW Toggle Controls
    - [x] Implement Global Reveal for Debug Mode
  - [ ] Phase 6: Optimization and Edge Cases
    - [ ] Handle Unit Overlap/Peaking
    - [ ] Performance Optimization
    - [x] Multiplayer Groundwork
  - [ ] Phase 7: Testing and Integration
    - [ ] Unit Testing
    - [ ] Integration Testing
    - [ ] Final Polish
- [ ] Move Unit range to a new kind of structure where each animal has its abilities stored
- [ ] Fix the habitat generation to actually be one zone apart
