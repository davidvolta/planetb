# Development Checklist

## Project Context
- Project Name: Planet X
- Description: A unique turn-based 4x ecological strategy game that dispenses with traditional mechanics and power structures. Planet X models nature and population dynamics to create gameplay that asks the user to balance their growth and exploitation with the world's natural rates of production. 

## Environment Setup
- Node.js environment
- React + Vite
- TypeScript
- Zustand + immer for game state management
- Phaser as our game engine

## Current Focus:
- Create core game state store in Zustand with turn, player, and board state including tiles (terrain and biomes), habitats and units 
- Build a simple local game loop that mimics a backend. 
- Focus on core game mechanics (movement, reproduction, interactions, state updates, etc.) client-side in a way that could later run on a server. 


## Upcoming Tasks
- [] Create core game state store with turn, player, and board state
- [] Create basic game board with tiles
- [] Implement Coordinate System for tiles
- [] Implement terrain generation
- [] Create turn-based system
- [ ] Add game status panel
  - [ ] Show current player
  - [ ] Display turn number
- [] Add first unit
- [] Unit movement
  - [] Add highlight for available moves
  - [] Add unit selector
  - [] Add Secondary (tile) selector
- [] Add fog of war
- [] Implement habitats
- [] Implement habitat improvement
- [] Add unit production (eggs)
- [] Add unit hatching from eggs
- [] Add unit spawning

## Completed Tasks
- [x] Install Node.js, Phaser, Zustand, React and Vite
- [x] Project structure organization
- [x] Main game routing setup