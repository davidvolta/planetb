# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Planet B** is a turn-based ecological strategy game where players compete to build sustainable ecosystems by placing habitats and managing animal populations. Built with Phaser 3 and TypeScript.

## Core Architecture

### Tech Stack
- **Engine**: Phaser 3 for rendering and game loop
- **State Management**: Zustand for global game state
- **Language**: TypeScript for type safety
- **Build**: Vite for development and production builds

### Key Patterns
- **Unidirectional Data Flow**: Components trigger actions → Actions modify state → State updates trigger renders
- **Biome-Centric Design**: Biomes are primary data structures, habitats are embedded within biomes
- **Observer Pattern**: StateObserver utility for efficient state subscriptions
- **Component Lifecycle**: All components follow init/update/destroy pattern

### Directory Structure
```
src/
├── constants/        # Game configuration (gameConfig.ts)
├── controllers/      # Game logic (EcosystemController, TileInteractionController, etc.)
├── managers/         # System managers (CameraManager, LayerManager)
├── renderers/        # Visual components (TileRenderer, AnimalRenderer, etc.)
├── scenes/           # Phaser scenes (BoardScene, UIScene, DebugScene)
├── store/            # Zustand state management (actions.ts, gameStore.ts)
├── types/            # TypeScript type definitions
├── utils/            # Utilities (CoordinateUtils, TerrainGenerator, StateObserver)
└── AI/               # AI-related components (LLMClient, PromptBuilder)
```

## Development Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build

# Testing
# No test framework configured - manual testing via browser
```

## Key Files to Know

### Entry Points
- `src/index.ts` - Application entry point
- `src/game.ts` - Game initialization
- `src/scene/BoardScene.ts` - Main game scene

### State Management
- `src/store/gameStore.ts` - Global state store
- `src/store/actions.ts` - All state mutations (centralized API)
- `src/utils/stateObserver.ts` - State subscription utility

### Core Systems
- `src/controllers/EcosystemController.ts` - Ecology logic (resources, eggs, capture)
- `src/controllers/TileInteractionController.ts` - User input handling
- `src/renderers/` - All visual rendering components

### Configuration
- `src/constants/gameConfig.ts` - Game settings and constants
- `vite.config.ts` - Build configuration
- `eslint.config.js` - Linting rules

## Important Architecture Rules

1. **State Access**: Always use action functions from `actions.ts` for state mutations
2. **Subscriptions**: Use StateObserver for Phaser-to-Zustand communication, not direct polling
3. **Component Design**: Follow the lifecycle pattern (init/update/destroy)
4. **Biome Focus**: Treat biomes as primary entities, access habitats through biomes
5. **Rendering**: Phaser handles rendering, Zustand handles state - never mix these concerns
6. **🚨 CRITICAL: Player View Model**: Always develop and test with player-restricted views, NOT god-mode/dev-mode access. Use the PlayerView system from `src/selectors/getPlayerView.ts` as the primary interface for all game features. Build everything as if you're a player with limited information - this prevents architectural shortcuts and ensures proper game balance.

## Documentation

Key documentation files (always read these first):
- `docs/app_guide.md` - Comprehensive architecture guide
- `docs/dev_checklist.md` - Development checklist
- `docs/overview/` - Component-specific overviews
- `.cursor/rules/cursor.mdc` - Project-specific development rules