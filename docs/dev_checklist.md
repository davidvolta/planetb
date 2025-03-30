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
- [ ] Document Fog of War!
- [ ] Track visibility changes for fog of war state / generally connect it to zustand
- [ ] Fix egg rendering in fog of war (should I cheat and just a smaller graphic?)
- [ ] Change unimproved habitats to not produce eggs after initialization (it seems like owned an improved are the same for now - eventually with multiplayer this will be different)
- [ ] Fix habitat/unit bug
- [ ] I think I lost my optimizations for fog of war where we hide objects/units/tiles cause i can see eggs peaking out of the edge of the board.

- [ ] Move Unit range to a new kind of structure where each animal has its abilities stored
- [ ] Fix the habitat generation to actually be one zone apart
