# Planet B - Project Overview

## Introduction

Planet B is a turn-based strategy game where players compete to build sustainable ecosystems by placing habitats and managing animal populations. The game is built using Phaser 3 as the core game engine with React for UI components, and TypeScript for type safety and improved developer experience.

## Project Architecture

The project follows a component-based architecture with clear separation of concerns:

```
src/
├── components/  # React UI components
├── game/        # Core game initialization
├── scenes/      # Phaser scenes including the main BoardScene
│   ├── board/   # Board-related components
│   │   ├── controllers/  # Game logic controllers
│   │   ├── managers/     # System managers
│   │   ├── renderers/    # Visual rendering components
│   │   └── utils/        # Utility functions
├── state/       # State management system
├── ui/          # UI-related components
└── utils/       # General utility functions
```

### Game Engine Integration

- **Phaser + React Integration**: The game uses a custom integration layer to connect the Phaser game engine with React UI components
- **Scene Management**: Game scenes are loaded dynamically based on the application state
- **UI Overlay**: React UI components are rendered as an overlay on top of the Phaser canvas

## Core Game Systems

### BoardScene Architecture

The BoardScene employs a modular architecture with specialized components:

#### Renderers
Renderers are responsible for visualizing game elements:
- **BaseRenderer**: Provides common functionality for all renderers
- **TileRenderer**: Renders the terrain tiles and handles tile-related visual effects
- **HabitatRenderer**: Manages habitat visualization, including creation and improvement animations
- **AnimalRenderer**: Handles animal visualization, movement animations, and state changes
- **SelectionRenderer**: Shows selection indicators for tiles, animals, and habitats
- **MoveRangeRenderer**: Visualizes movement ranges and valid action targets

#### Managers
Managers handle system-level concerns:
- **LayerManager**: Manages the various display layers in the scene
- **InputManager**: Processes user input (mouse/touch events)
- **CameraManager**: Controls camera movement, zoom, and positioning
- **StateSubscriptionManager**: Centralizes state subscription and implements state diffing

#### Controllers
Controllers implement game logic:
- **GameController**: Manages game rules, turn flow, and action processing
- **AnimationController**: Coordinates complex animation sequences

### State Management

The game uses a custom state management system:

#### Component Structure

- **Game State**: Central state store with typed data structures
- **Actions**: Typed actions for state modifications
- **Reducers**: Pure functions that transform state based on actions
- **Selectors**: Functions to query and filter state data
- **Subscriptions**: Component-specific state subscriptions with diffing

#### State Flow

1. User interactions trigger events in Phaser or React
2. Events are processed by controllers/components
3. Controllers dispatch actions to modify state
4. Reducers process actions and update the state store
5. State changes are communicated to subscribers
6. Components react to state changes and update visuals

## Optimizations

### State Diffing
The `StateSubscriptionManager` implements state diffing to improve performance:
- Components subscribe only to relevant state slices
- State changes are compared before rendering updates
- Only affected components receive updates

### Component Lifecycle
All components follow a consistent lifecycle:
- **Initialization**: Set up resources, subscribe to events/state
- **Update**: Process changes and update visuals
- **Destruction**: Clean up resources, unsubscribe from events
