# Renderers

This directory contains renderer classes for the game board, which are responsible for creating and updating visual elements.

## BaseRenderer

The `BaseRenderer` serves as the foundation for all renderer components, providing common functionality:

- **Properties**: Manages scene reference, layer manager, tile size, and anchor coordinates
- **Methods**: Contains shared operations like coordinate conversion and resource cleanup
- **Inheritance**: All specific renderers extend this base class

## TileRenderer

Responsible for creating and rendering the terrain tiles that make up the game board.

**Planned API:**
```typescript
class TileRenderer {
  constructor(scene: Phaser.Scene, layerManager: LayerManager);
  
  createTerrainTile(terrain: TerrainType, x: number, y: number): Phaser.GameObjects.GameObject;
  renderTiles(board: Board): void;
  updateTile(x: number, y: number, terrain: TerrainType): void;
  getTileAt(x: number, y: number): Phaser.GameObjects.GameObject | null;
}
```

**Responsibilities:**
- Creating visual representations of different terrain types
- Rendering the complete game board based on terrain data
- Updating individual tiles when terrain changes
- Managing tile interactivity

### SelectionRenderer

Handles selection indicators and hover effects for user interaction.

**Planned API:**
```typescript
class SelectionRenderer {
  constructor(scene: Phaser.Scene, layerManager: LayerManager);
  
  createSelectionIndicator(): void;
  updateSelectionPosition(x: number, y: number): void;
  showSelectionAt(x: number, y: number): void;
  hideSelection(): void;
  showHoverAt(x: number, y: number): void;
  hideHover(): void;
}
```

**Responsibilities:**
- Creating and positioning the selection indicator
- Showing/hiding selection based on game state
- Managing hover effects for interactive elements
- Providing visual feedback for user interactions

### MoveRangeRenderer

Manages the visualization of valid movement ranges for units.

**Planned API:**
```typescript
class MoveRangeRenderer {
  constructor(scene: Phaser.Scene, layerManager: LayerManager);
  
  createMoveHighlight(x: number, y: number): Phaser.GameObjects.Graphics;
  showMoveRange(validMoves: ValidMove[], moveMode: boolean): void;
  clearMoveHighlights(): void;
}
```

**Responsibilities:**
- Creating visual indicators for valid movement options
- Showing/hiding movement range based on selected unit
- Clearing movement highlights when selection changes
- Ensuring movement options are clearly visible to players

### HabitatRenderer

Manages the visualization of habitat elements on the game board.

**Planned API:**
```typescript
class HabitatRenderer {
  constructor(scene: Phaser.Scene, layerManager: LayerManager);
  
  createHabitatGraphic(x: number, y: number, state: HabitatState): Phaser.GameObjects.Graphics;
  renderHabitats(habitats: Habitat[]): void;
  updateHabitat(habitat: Habitat): void;
}
```

**Responsibilities:**
- Creating visual representations of different habitat types
- Rendering habitats based on their state (potential, active, etc.)
- Updating habitat visuals when state changes
- Managing habitat interactivity

### AnimalRenderer

Handles the visualization and animation of animal units.

**Planned API:**
```typescript
class AnimalRenderer {
  constructor(scene: Phaser.Scene, layerManager: LayerManager);
  
  createAnimalSprite(animal: Animal, x: number, y: number): Phaser.GameObjects.Sprite;
  renderAnimals(animals: Animal[]): void;
  updateAnimal(animal: Animal): void;
  calculateUnitDepth(x: number, y: number, isActive: boolean): number;
  hideAnimal(id: string): void;
  showAnimal(id: string): void;
}
```

**Responsibilities:**
- Creating sprites for different animal types
- Managing sprite state (active, dormant, moved)
- Handling unit depth sorting for proper layering
- Updating unit visuals when state changes
- Managing unit interactivity based on game state 