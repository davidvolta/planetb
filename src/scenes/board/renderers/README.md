# Renderers

This directory contains renderer classes for the game board, which are responsible for creating and updating visual elements.

## BaseRenderer

The `BaseRenderer` serves as the foundation for all renderer components, providing common functionality:

- **Properties**: 
  - `scene`: Reference to the Phaser scene
  - `layerManager`: Reference to the layer management system
  - `tileSize`: Width of tiles in pixels
  - `tileHeight`: Height of tiles in pixels
  - `anchorX/anchorY`: Origin point for coordinate calculations

- **Methods**:
  - `setAnchor(x, y)`: Sets the anchor point for coordinate calculations
  - `gridToScreen(gridX, gridY)`: Converts grid coordinates to screen coordinates
  - `destroy()`: Base cleanup method for renderer resources

- **Inheritance**: All specialized renderers extend this base class for consistent implementation

## TileRenderer

Responsible for creating and rendering the terrain tiles that make up the game board.

**API:**
```typescript
class TileRenderer extends BaseRenderer {
  constructor(scene: Phaser.Scene, layerManager: LayerManager, tileSize: number, tileHeight: number);
  
  initialize(anchorX: number, anchorY: number): void;
  createBoardTiles(board: { width: number, height: number, tiles: any[][] }, centerX?: number, centerY?: number): Phaser.GameObjects.GameObject[];
  clearTiles(destroyChildren?: boolean): void;
  setupTileInteraction(tile: Phaser.GameObjects.Graphics, gridX: number, gridY: number): void;
  
  override destroy(): void;
}
```

**Responsibilities:**
- Creating visual representations of different terrain types
- Rendering the complete game board based on terrain data
- Managing tile interactivity and event delegation
- Properly cleaning up resources

## SelectionRenderer

Handles selection indicators and hover effects for user interaction.

**API:**
```typescript
class SelectionRenderer extends BaseRenderer {
  constructor(scene: Phaser.Scene, layerManager: LayerManager, tileSize: number, tileHeight: number);
  
  initialize(anchorX: number, anchorY: number): void;
  showSelectionAt(x: number, y: number): void;
  hideSelection(): void;
  updateFromPointer(pointer: Phaser.Input.Pointer, boardWidth: number, boardHeight: number): void;
  
  override destroy(): void;
}
```

**Responsibilities:**
- Creating and positioning selection indicators
- Showing/hiding selection based on game state
- Handling hover effects for interactive elements
- Providing visual feedback for user interactions

## MoveRangeRenderer

Manages the visualization of valid movement ranges for units.

**API:**
```typescript
class MoveRangeRenderer extends BaseRenderer {
  constructor(scene: Phaser.Scene, layerManager: LayerManager, tileSize: number, tileHeight: number);
  
  initialize(anchorX: number, anchorY: number): void;
  showMoveRange(validMoves: ValidMove[], moveMode: boolean): void;
  clearMoveHighlights(): void;
  isValidMoveTarget(gridX: number, gridY: number): boolean;
  getMoveHighlights(): Phaser.GameObjects.Graphics[];
  
  override destroy(): void;
}
```

**Responsibilities:**
- Creating visual indicators for valid movement options
- Showing/hiding movement range based on selected unit
- Checking if a position is a valid move target
- Managing the lifecycle of movement highlight objects

## HabitatRenderer

Manages the visualization of habitat elements on the game board.

**API:**
```typescript
class HabitatRenderer extends BaseRenderer {
  constructor(scene: Phaser.Scene, layerManager: LayerManager, tileSize: number, tileHeight: number);
  
  initialize(anchorX: number, anchorY: number): void;
  renderHabitats(habitats: any[]): void;
  createHabitatGraphic(x: number, y: number, state: HabitatState): Phaser.GameObjects.Container;
  clearHabitats(): void;
  
  // State diffing methods
  addHabitat(habitat: Habitat): void;
  updateHabitat(habitat: Habitat): void;
  removeHabitat(habitatId: string): void;
  
  override destroy(): void;
}
```

**Responsibilities:**
- Creating visual representations of different habitat types
- Rendering habitats based on their state (potential, improved, etc.)
- Efficiently adding, updating, and removing habitats
- Supporting state diffing for optimized rendering

## AnimalRenderer

Handles the visualization and animation of animal units.

**API:**
```typescript
class AnimalRenderer extends BaseRenderer {
  constructor(scene: Phaser.Scene, layerManager: LayerManager, tileSize: number, tileHeight: number);
  
  initialize(anchorX: number, anchorY: number): void;
  renderAnimals(animals: Animal[], onUnitClicked?: (animalId: string, gridX: number, gridY: number) => void): void;
  animateUnit(unitId: string, fromX: number, fromY: number, toX: number, toY: number, options?: any): Promise<void>;
  updateSpriteDepth(sprite: Phaser.GameObjects.Sprite, gridX: number, gridY: number, isActive: boolean): void;
  
  // State diffing methods
  addAnimal(animal: Animal): void;
  updateAnimal(animal: Animal): void;
  removeAnimal(animalId: string): void;
  
  override destroy(): void;
}
```

**Responsibilities:**
- Creating and managing sprites for different animal types
- Handling unit state visualization (active, dormant, moved)
- Managing sprite depth for proper layering
- Supporting efficient state diffing for optimized rendering
- Managing unit interactivity and click handling 