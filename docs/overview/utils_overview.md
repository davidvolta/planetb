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

## BiomeGenerator

Generates biomes using Voronoi partitioning around specified nodes, implementing the biome-centric architecture.

### API

```typescript
// Core interfaces
interface VoronoiNode {
  id: string;  // Temporary ID for generation purposes
  position: {  // Position structure (x,y)
    x: number;
    y: number;
  };
}

interface BiomeGenerationResult {
  biomeMap: (string | null)[][]; // 2D array of biomeIds, can be null
  biomeColors: Map<string, number>; // Maps biomeId to color for visualization
}

// Main generation function
function generateVoronoiBiomes(
  width: number, 
  height: number, 
  nodes: VoronoiNode[],
  terrainData: TerrainType[][]
): BiomeGenerationResult;

// Helper functions
function isNodeOverlapping(
  position: { x: number, y: number },
  existingNodes: VoronoiNode[]
): boolean;

// Color utility
function hslToHex(h: number, s: number, l: number): number;
```

### Key Features

- **Voronoi Partitioning**: Divides the game board into natural-looking biome regions
- **Biome-Centric Design**: Creates the foundation for the biome-centric architecture
- **Habitat Integration**: Each biome contains a habitat at its center (node)
- **Visual Distinction**: Generates unique colors for each biome using the golden ratio
- **Coordinate-Based Assignment**: Uses Manhattan distance to determine biome boundaries
- **Overlap Prevention**: Ensures biomes are properly spaced during generation

### Biome Generation Process

1. **Node Placement**: Strategic placement of VoronoiNodes across different terrain types
2. **Color Assignment**: Each biome receives a visually distinct color
3. **Territory Mapping**: Tiles are assigned to the closest biome based on Manhattan distance
4. **Board Integration**: The biome map is integrated with the game board structure
5. **Resource Generation**: After biome creation, resources are distributed within biomes by the EcosystemController 