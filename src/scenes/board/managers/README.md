# Managers

This directory contains manager classes that handle specific aspects of the game scene, focusing on organization, control, and state management rather than rendering.

## LayerManager

The LayerManager will be responsible for creating, accessing, and managing the various Phaser layers used in the game scene.

### Planned API

```typescript
class LayerManager {
  constructor(scene: Phaser.Scene);
  
  // Setup and initialization
  setupLayers(): void;
  
  // Layer accessors
  getBackgroundLayer(): Phaser.GameObjects.Layer;
  getTerrainLayer(): Phaser.GameObjects.Layer;
  getSelectionLayer(): Phaser.GameObjects.Layer;
  getMoveRangeLayer(): Phaser.GameObjects.Layer;
  getStaticObjectsLayer(): Phaser.GameObjects.Layer;
  getUnitsLayer(): Phaser.GameObjects.Layer;
  getUILayer(): Phaser.GameObjects.Layer;
  
  // Layer operations
  clearLayer(layerName: string): void;
  removeAll(layerName: string, destroyChildren?: boolean): void;
  
  // Utility methods
  logLayerInfo(): void;
  isLayersSetup(): boolean;
}
```

### Responsibilities

- Creating all required layers with proper depth ordering
- Providing access to layers via getter methods
- Managing layer visibility and content
- Providing utilities for clearing or removing layer contents
- Handling z-index and depth management

### Layer Structure

The LayerManager will manage the following layers (from bottom to top):

1. **backgroundLayer** (depth 0): Background elements
2. **terrainLayer** (depth 1): Terrain tiles
3. **selectionLayer** (depth 2): Selection indicators and hover effects
4. **moveRangeLayer** (depth 3): Movement range indicators
5. **staticObjectsLayer** (depth 4): Habitats and static game objects
6. **unitsLayer** (depth 5): Units and animals
7. **uiLayer** (depth 10): UI elements that appear above the game

## Other Planned Managers

- **InputManager**: Will handle user input and interaction delegation
- **AnimationController**: Will manage game animations and transitions
- **CameraManager**: Will control camera positioning and zoom/pan
- **StateSubscriptionManager**: Will centralize Zustand state subscriptions 