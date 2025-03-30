# BoardScene Refactoring

This directory contains the refactored components of the BoardScene, breaking down the original monolithic class into smaller, focused components.

## Component Responsibilities

### Renderers

Located in `/renderers` directory:

- **TileRenderer**: Responsible for creating and updating terrain tiles
  - Methods: `renderTiles()`, `createTerrainTile()`, `updateTile()`
  - Handles: Terrain visualization, tile creation

- **SelectionRenderer**: Handles selection and hover indicators
  - Methods: `createSelectionIndicator()`, `updateSelection()`, `showHover()`, `hideHover()`
  - Handles: Visual feedback for user interactions

- **MoveRangeRenderer**: Manages move range highlights
  - Methods: `showMoveRange()`, `clearMoveRange()`, `createMoveHighlight()`
  - Handles: Highlighting valid movement options

- **HabitatRenderer**: Manages habitat visualizations
  - Methods: `renderHabitats()`, `createHabitatGraphic()`, `updateHabitat()`
  - Handles: Habitat state visualization, placement

- **AnimalRenderer**: Handles animal sprites and states
  - Methods: `renderAnimals()`, `createAnimalSprite()`, `updateAnimal()`, `calculateUnitDepth()`
  - Handles: Unit visualization, state changes, animations

### Managers

Located in `/managers` directory:

- **LayerManager**: Manages the Phaser layer hierarchy
  - Methods: `setupLayers()`, `getLayer()`, `clearLayer()`, `removeAll()`
  - Handles: Z-ordering, layer organization, depth management

- **InputManager**: Manages user input and event handling
  - Methods: `setupClickEvents()`, `setupKeyboard()`, `delegateClick()`
  - Handles: Mouse interactions, keyboard shortcuts, event delegation

- **AnimationController**: Controls animations and transitions
  - Methods: `animateUnit()`, `stopAnimations()`, `onAnimationComplete()`
  - Handles: Movement animations, displacement effects, tweening

- **CameraManager**: Handles camera positioning and controls
  - Methods: `setupCamera()`, `zoom()`, `pan()`, `centerOn()`
  - Handles: View management, zoom/pan controls

- **StateSubscriptionManager**: Centralizes state subscriptions
  - Methods: `setupSubscriptions()`, `unsubscribeAll()`, `subscribe()`
  - Handles: Zustand state observation, data flow to components

### Utils

Located in `/utils` directory:

- **CoordinateUtils**: Provides coordinate conversion utilities
  - Methods: `gridToScreen()`, `screenToGrid()`, `isValidCoordinate()`
  - Handles: Isometric conversion, position calculations

## Naming Conventions

1. **Classes**:
   - PascalCase (e.g., `TileRenderer`, `LayerManager`)
   - Suffix indicates role (`Renderer`, `Manager`, `Controller`, `Utils`)

2. **Methods**:
   - camelCase (e.g., `createTile()`, `setupLayers()`)
   - Verb-first naming for actions (e.g., `render`, `update`, `create`, `setup`)

3. **Properties**:
   - camelCase (e.g., `moveRangeLayer`, `isAnimating`)
   - Descriptive names that reflect purpose

4. **Component Communication**:
   - Renderer methods should be designed to accept specific data they need
   - Managers should provide clear public APIs for BoardScene to use
   - Components should not directly reference each other; BoardScene orchestrates

## Implementation Pattern

1. Extract functionality from BoardScene one component at a time
2. Pass required references (scene, layers) to components in constructors
3. Use composition instead of inheritance
4. Test functionality after each extraction
5. Gradually reduce BoardScene's responsibilities as components take over 