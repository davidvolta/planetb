# Planet X

A unique turn-based 4x ecological strategy game that dispenses with traditional mechanics and power structures. Planet X models nature and population dynamics to create gameplay that asks the user to balance their growth and exploitation with the world's natural rates of production.

## Project Overview

Planet X is a turn-based strategy game focusing on ecological balance and natural population dynamics rather than traditional power structures.

## Technology Stack

- React + Vite frontend
- TypeScript for type safety
- Zustand + immer for state management
- Phaser as the game engine

## State Management

### Core Principles

- **Global Game State**: Held in Zustand (turns, players, board)
- **Rendering State**: Managed by Phaser (rendering, physics, frame-by-frame updates)
- **Connection Strategy**: Connect Zustand and Phaser sparingly (use Zustand at turn changes, not per-frame updates)
- **Separation of Concerns**: Logical game state is separate from visual representation

### State Components

- **Turn**: Tracks current game progression
- **Players**: Player entities with properties like name, color, and active status
- **Board**: Grid of tiles with terrain types (water, grass, beach, mountain, underwater)
- **Tiles**: Individual grid cells with coordinates, terrain type, and visibility properties
- **Units**: (Planned) Player-controlled entities that can move and interact
- **Habitats**: (Planned) Structures on the board

### State Update Flow

1. User actions trigger state changes via store methods
2. State updates are processed in Zustand
3. React components and Phaser scenes respond to state changes
4. Visual representation updates accordingly

## Development Status

See the [Development Checklist](./docs/%23%20Development%20Checklist.md) for current project status and upcoming tasks.

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```
