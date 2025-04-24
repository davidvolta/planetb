# Managers

This directory contains manager classes that handle specific aspects of the game scene, focusing on organization, control, and state management rather than rendering.

## LayerManager

The LayerManager is responsible for creating, accessing, and managing the various Phaser layers used in the game scene.

### API

```typescript
class LayerManager {
  constructor(scene: Phaser.Scene);
  
  // Setup and initialization
  setupLayers(): void;
  isLayersSetup(): boolean;
  
  // Layer accessors
  getBackgroundLayer(): Phaser.GameObjects.Container;
  getTerrainLayer(): Phaser.GameObjects.Container;
  getSelectionLayer(): Phaser.GameObjects.Container;
  getMoveRangeLayer(): Phaser.GameObjects.Container;
  getStaticObjectsLayer(): Phaser.GameObjects.Container;
  getUnitsLayer(): Phaser.GameObjects.Container;
  getUILayer(): Phaser.GameObjects.Container;
  
  // Layer operations
  addToLayer(layerName: string, gameObject: Phaser.GameObjects.GameObject): void;
  clearLayer(layerName: string, destroyChildren?: boolean): void;
  clearAllLayers(destroyChildren?: boolean): void;
  
  // Utility methods
  logLayerInfo(): void;
}
```

### Responsibilities

- Creating all required layers with proper depth ordering
- Providing access to layers via getter methods
- Managing layer visibility and content
- Providing utilities for clearing or removing layer contents
- Handling z-index and depth management

### Layer Structure

The LayerManager manages the following layers (from bottom to top):

1. **backgroundLayer** (depth 0): Background elements
2. **terrainLayer** (depth 1): Terrain tiles
3. **selectionLayer** (depth 2): Selection indicators and hover effects
4. **moveRangeLayer** (depth 3): Movement range indicators
5. **staticObjectsLayer** (depth 4): Habitats and static game objects
6. **unitsLayer** (depth 5): Units and animals
7. **uiLayer** (depth 10): UI elements that appear above the game

## InputManager

The InputManager handles user input processing and delegation to the appropriate handlers.

### API

```typescript
class InputManager {
  constructor(
    scene: Phaser.Scene,
    tileSize?: number = 64,
    tileHeight?: number = 32,
    anchorX?: number = 0,
    anchorY?: number = 0
  );
  
  // Initialization
  initialize(anchorX: number, anchorY: number): void;
  
  // Input setup
  setupControls(): void;          // camera panning and zooming
  setupKeyboardControls(): void;  // keyboard shortcuts
  setupClickEventDelegation(): void; // click event delegation
  
  // Click handlers
  onTileClick(callback: (gameObject: Phaser.GameObjects.GameObject) => void): void;
  onPointerMove(callback: (worldX: number, worldY: number, pointer: Phaser.Input.Pointer) => void): void;
  
  // Coordinate utilities
  getGridPositionAt(screenX: number, screenY: number): { x: number, y: number } | null;
  
  // Cleanup
  destroy(): void;
}
```

### Responsibilities

- Setting up camera panning on pointer drag and wheel zoom
- Setting up keyboard shortcuts and handling key events
- Delegating click events for grid-based game objects via onTileClick
- Managing pointer movement and hover callbacks via onPointerMove
- Converting screen coordinates to grid coordinates
- Cleaning up input event listeners and keyboard shortcuts

## CameraManager

The CameraManager handles camera controls, zoom, and positioning for the game view.

### API

```typescript
class CameraManager {
  constructor(scene: Phaser.Scene);
  
  // Initialization
  setupCamera(): void;
  
  // Camera control
  getCamera(): Phaser.Cameras.Scene2D.Camera;
  pan(deltaX: number, deltaY: number): void;
  adjustZoom(zoomChange: number): void;
  centerOn(x: number, y: number): void;
  
  // Cleanup
  destroy(): void;
}
```

### Responsibilities

- Setting up the Phaser camera system
- Providing methods for panning and zooming
- Managing camera bounds and restrictions
- Centering the camera on specific coordinates
- Maintaining zoom limits for usability

## StateSubscriptionManager

The StateSubscriptionManager centralizes all state subscriptions for the BoardScene and its components, optimizing state updates and rendering.

### API

```typescript
class StateSubscriptionManager {
  constructor(
    scene: Phaser.Scene,
    components: {
      animalRenderer: AnimalRenderer;
      habitatRenderer: HabitatRenderer;
      moveRangeRenderer: MoveRangeRenderer;
      animationController: AnimationController;
      tileRenderer: TileRenderer;
    }
  );
  
  // Subscription management
  setupSubscriptions(onUnitClicked?: (animalId: string, gridX: number, gridY: number) => void): void;
  unsubscribeAll(): void;
  getActiveSubscriptions(): string[];
  
  // Cleanup
  destroy(): void;
}
```

### Responsibilities

- Centralizing all Zustand state subscriptions
- Managing efficient state updates through diffing
- Optimizing rendering by identifying only changed entities
- Coordinating data flow between state and renderers
- Providing consistent subscription lifecycle management

### State Diffing

The StateSubscriptionManager implements state diffing, which:

1. Caches previous states to compare with new updates
2. Identifies specifically which entities were added, changed, or removed
3. Calls optimized renderer methods like `addAnimal()`, `updateAnimal()`, and `removeAnimal()`
4. Minimizes unnecessary re-renders by only updating changed elements
5. Significantly improves performance, especially with large numbers of entities

## Other Planned Managers

- **AnimationController**: Will manage game animations and transitions
- **CameraManager**: Will control camera positioning and zoom/pan
- **StateSubscriptionManager**: Will centralize Zustand state subscriptions 