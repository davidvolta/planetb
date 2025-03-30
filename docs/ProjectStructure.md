# Planet B Project Structure

This document provides a detailed overview of the Planet B project structure, describing key components and file organization.

## Directory Structure

```
planetb/
├── docs/                  # Project documentation
├── public/                # Static assets
│   ├── assets/            # Game assets like images, sprites, audio
│   │   ├── sprites/       # Game sprites and textures
│   │   ├── tiles/         # Tile textures
│   │   └── ui/            # UI assets
├── src/                   # Source code
│   ├── components/        # React UI components
│   ├── game/              # Core game initialization
│   ├── scenes/            # Phaser scenes
│   │   ├── board/         # Main game board scene
│   │   │   ├── controllers/  # Game logic controllers
│   │   │   ├── managers/     # System managers
│   │   │   ├── renderers/    # Visual rendering components
│   │   │   └── utils/        # Board-specific utilities
│   ├── state/             # State management
│   │   ├── actions/       # State actions
│   │   ├── reducers/      # State reducers
│   │   ├── selectors/     # State selectors
│   │   └── store/         # State store configuration
│   ├── ui/                # UI-specific components
│   └── utils/             # Shared utility functions
└── types/                 # TypeScript type definitions
```

## Key Components

### Game Initialization

- **src/game/Game.ts**: Main game initialization and configuration
- **src/game/scenes.ts**: Scene registration and management
- **src/game/config.ts**: Phaser game configuration

### BoardScene Components

#### Renderers

- **src/scenes/board/renderers/BaseRenderer.ts**: Base class for all renderers
- **src/scenes/board/renderers/TileRenderer.ts**: Renders terrain tiles
- **src/scenes/board/renderers/SelectionRenderer.ts**: Handles selection indicators
- **src/scenes/board/renderers/MoveRangeRenderer.ts**: Visualizes movement ranges
- **src/scenes/board/renderers/HabitatRenderer.ts**: Handles habitat visualization
- **src/scenes/board/renderers/AnimalRenderer.ts**: Manages animal sprites and animations

#### Managers

- **src/scenes/board/managers/LayerManager.ts**: Manages display layers
- **src/scenes/board/managers/InputManager.ts**: Processes user input
- **src/scenes/board/managers/CameraManager.ts**: Controls camera behavior
- **src/scenes/board/managers/StateSubscriptionManager.ts**: Handles state subscriptions and diffing

#### Controllers

- **src/scenes/board/controllers/GameController.ts**: Implements game logic and rules
- **src/scenes/board/controllers/AnimationController.ts**: Manages animation sequences

#### Utils

- **src/scenes/board/utils/CoordinateUtils.ts**: Coordinate conversion utilities
- **src/scenes/board/utils/TerrainGenerator.ts**: Procedural terrain generation

### State Management

- **src/state/store/index.ts**: Central state store
- **src/state/actions/index.ts**: Action creators and action types
- **src/state/reducers/index.ts**: Root reducer and sub-reducers
- **src/state/selectors/index.ts**: State selection functions
- **src/state/types.ts**: State type definitions

### React Components

- **src/components/GameContainer.tsx**: Main game container
- **src/components/UI/GameControls.tsx**: Game control UI
- **src/components/UI/ResourceDisplay.tsx**: Resource UI
- **src/components/UI/ActionPanel.tsx**: Action controls UI

## File Organization Guidelines

### Code Organization Principles

1. **Separation of Concerns**: Each file has a specific responsibility
2. **Component Modularity**: Components are designed to be self-contained
3. **Consistent Structure**: Similar components follow consistent patterns
4. **Clear Dependencies**: Dependencies are explicitly imported and managed

### Naming Conventions

- **Files**: PascalCase for components, camelCase for utilities
- **Directories**: camelCase for all directories
- **Component Classes**: PascalCase (e.g., TileRenderer)
- **Interfaces/Types**: PascalCase with descriptive names (e.g., GameState)
- **Constants**: UPPER_SNAKE_CASE for true constants

## System Integration

### Phaser and React Integration

The game architecture integrates Phaser 3 and React through:

1. **Initialization Flow**:
   - React app initializes and renders the main UI
   - GameContainer component mounts and initializes Phaser
   - Phaser creates a canvas and loads the initial scene

2. **Communication**:
   - State changes in Phaser propagate to React through the state store
   - React UI interacts with the game by dispatching actions
   - The StateSubscriptionManager ensures efficient updates

3. **Rendering Responsibilities**:
   - Phaser: Game board, game entities, animations, effects
   - React: UI controls, menus, information displays, overlays 