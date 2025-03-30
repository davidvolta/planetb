# BoardScene

The BoardScene uses a component-based architecture:

1. **BaseRenderer + Specialized Renderers**: Visual rendering with common functionality shared via inheritance
2. **Managers**: Control and organization systems
3. **Controllers**: Action and animation control
4. **Utilities**: Shared helper functions

## Component Responsibilities

### Renderers

Located in `/renderers` directory:

- **BaseRenderer**: Abstract base class providing common renderer functionality
  - Properties: scene, layerManager, tileSize, tileHeight, anchor coordinates
  - Methods: `setAnchor()`, `gridToScreen()`, `destroy()`
  - All renderers inherit from this base class

- **TileRenderer**: Responsible for creating and updating terrain tiles
  - Methods: `createBoardTiles()`, `createTerrainTile()`, `setupTileInteraction()`
  - Handles: Terrain visualization, tile creation and interaction

- **SelectionRenderer**: Handles selection and hover indicators
  - Methods: `showSelectionAt()`, `hideSelection()`, `updateFromPointer()`
  - Handles: Visual feedback for user interactions, hover effects

- **MoveRangeRenderer**: Manages move range highlights
  - Methods: `showMoveRange()`, `clearMoveHighlights()`, `isValidMoveTarget()`
  - Handles: Highlighting valid movement options

- **HabitatRenderer**: Manages habitat visualizations
  - Methods: `renderHabitats()`, `createHabitatGraphic()`, `addHabitat()`, `updateHabitat()`
  - Handles: Habitat state visualization, placement

- **AnimalRenderer**: Handles animal sprites and states
  - Methods: `renderAnimals()`, `addAnimal()`, `updateAnimal()`, `removeAnimal()`
  - Handles: Unit visualization, state changes, animations

### Managers

Located in `/managers` directory:

- **LayerManager**: Manages the Phaser layer hierarchy
  - Methods: `setupLayers()`, `getLayer()`, `addToLayer()`, `clearLayer()`
  - Handles: Z-ordering, layer organization, depth management

- **InputManager**: Manages user input and event handling
  - Methods: `setupKeyboardControls()`, `setupClickEventDelegation()`, `onTileClick()`
  - Handles: Mouse interactions, keyboard shortcuts, event delegation

- **CameraManager**: Handles camera positioning and controls
  - Methods: `setupCamera()`, `adjustZoom()`, `pan()`, `centerOn()`
  - Handles: View management, zoom/pan controls

- **StateSubscriptionManager**: Centralizes state subscriptions
  - Methods: `setupSubscriptions()`, `unsubscribeAll()`, `getActiveSubscriptions()`
  - Handles: Zustand state observation, data flow, state diffing

### Controllers

Located in `/controllers` directory:

- **AnimationController**: Controls animations and transitions
  - Methods: `moveUnit()`, `displaceUnit()`, `isAnimating()`
  - Handles: Movement animations, displacement effects, tweening

### Utils

Located in `/utils` directory:

- **CoordinateUtils**: Provides coordinate conversion utilities
  - Methods: `gridToWorld()`, `screenToGrid()`, `isValidCoordinate()`, `getNeighbors()`
  - Handles: Isometric conversion, position calculations

- **TerrainGenerator**: Handles terrain generation
  - Methods: `generateIslandTerrain()`, `addBeaches()`, `addUnderwaterTiles()`
  - Handles: Procedural terrain generation with various biomes


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