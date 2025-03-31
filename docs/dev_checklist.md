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
- [ ] Fog of War Fixes
  - [ ] Document Fog of War!
  - [ ] Fix the FOW checkbox to retain state
  - [ ] Track visibility changes for fog of war state / generally connect it to zustand
  - [ ] I think I lost my optimizations for fog of war where we hide objects/units/tiles cause i can see eggs peaking out of the edge of the board.

- [ ] Move Unit range to a new kind of structure where each animal has its abilities stored

# Playable Game
- [ ] Do not let players spawn units from habitats they do not own (during multiplayer)
- [ ] Fix habitat/unit bug
- [ ] Limit player movement to only those biomes they are allowed in
- [ ] Players can only improve habitat on their next turn and that ends their turn
- [ ] Get the correct isometric units (fish, octopus, bird, turtle, egg)
- [ ] Fix bug that produces a ton of eggs on the newly owned habitat... sometimes