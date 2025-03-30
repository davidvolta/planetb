# Board Utilities

This directory contains utility modules that provide support functions for the board scene.

## CoordinateUtils

Provides coordinate conversion utilities for working with the isometric grid.

### API

```typescript
// Convert grid to screen/world coordinates
function gridToIso(
  gridX: number, 
  gridY: number, 
  tileSize: number, 
  tileHeight: number
): { x: number, y: number };

function gridToWorld(
  gridX: number, 
  gridY: number, 
  tileSize: number, 
  tileHeight: number,
  anchorX: number,
  anchorY: number
): { x: number, y: number };

// Convert screen coordinates to grid
function screenToGrid(
  screenX: number, 
  screenY: number, 
  tileSize: number, 
  tileHeight: number,
  anchorX: number,
  anchorY: number,
  worldPoint?: { x: number, y: number }
): { x: number, y: number };

// Grid coordinate operations
function isValidCoordinate(
  x: number, 
  y: number, 
  boardWidth: number, 
  boardHeight: number
): boolean;

function getNeighbors(
  x: number, 
  y: number, 
  boardWidth: number, 
  boardHeight: number
): Array<{ x: number, y: number }>;

function calculateManhattanDistance(
  x1: number, 
  y1: number, 
  x2: number, 
  y2: number
): number;

// Tile visual utilities
function createIsoDiamondPoints(
  tileSize: number, 
  tileHeight: number, 
  scaleFactor?: number
): Array<{ x: number, y: number }>;

// Validation
function validateCoordinateConversion(
  gridX: number,
  gridY: number,
  tileSize: number,
  tileHeight: number,
  anchorX: number,
  anchorY: number
): { isValid: boolean, original: { x: number, y: number }, world: { x: number, y: number }, converted: { x: number, y: number } };
```

### Key Features

- **World/Screen Coordinate Conversion**: Converts between grid and screen coordinate systems
- **Grid Operations**: Validates and manipulates grid coordinates
- **Distance Calculation**: Computes distances between coordinates
- **Isometric Shape Generation**: Creates diamond shapes for tile rendering
- **Coordinate Validation**: Ensures that coordinate transformations work bidirectionally

## TerrainGenerator

Procedurally generates terrain for the game board.

### API

```typescript
interface TerrainGenerationOptions {
  seed?: number;
  waterRatio?: number;     // 0-1: how much water to include
  mountainRatio?: number;  // 0-1: how many mountains to include
  beachWidth?: number;     // Width of beaches around water
  smoothingPasses?: number; // How many smoothing passes to apply
}

// Main generation function
function generateIslandTerrain(
  width: number, 
  height: number, 
  options?: TerrainGenerationOptions
): TerrainType[][];

// Helper functions
function addBeaches(
  terrain: TerrainType[][], 
  width: number, 
  height: number, 
  beachWidth: number
): void;

function addUnderwaterTiles(
  terrain: TerrainType[][], 
  width: number, 
  height: number
): void;

function smoothTerrain(
  terrain: TerrainType[][], 
  width: number, 
  height: number
): void;
```

### Key Features

- **Island Generation**: Creates natural-looking island terrain with multiple biomes
- **Customizable Parameters**: Controls water ratio, mountain density, beach width, etc.
- **Terrain Smoothing**: Applies multiple smoothing passes for natural-looking terrain
- **Biome Variety**: Generates water, beaches, grass, mountains, and underwater tiles
- **Deterministic Generation**: Supports fixed seeds for reproducible terrain

### Terrain Types

The generator creates a varied terrain with these types:
- **Water**: Ocean tiles surrounding the island
- **Beach**: Shoreline tiles between water and land
- **Grass**: The main land area
- **Mountain**: Elevated areas on the island
- **Underwater**: Deep water tiles away from the shore 