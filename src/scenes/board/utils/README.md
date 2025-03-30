# Coordinate Utilities

This module will contain utility functions for handling coordinate transformations between grid (logical) coordinates and screen (pixel) coordinates in the isometric game world.

## Planned Methods

### `gridToScreen(gridX: number, gridY: number, tileSize: number, tileHeight: number): { x: number, y: number }`

Converts logical grid coordinates to screen (pixel) coordinates.

- **Parameters**:
  - `gridX`: X position on the logical grid
  - `gridY`: Y position on the logical grid
  - `tileSize`: The width of a tile in pixels
  - `tileHeight`: The height of a tile in pixels (typically half of tileSize for isometric)
  
- **Returns**: Object with screen x,y coordinates

### `screenToGrid(screenX: number, screenY: number, tileSize: number, tileHeight: number): { x: number, y: number }`

Converts screen (pixel) coordinates to logical grid coordinates.

- **Parameters**:
  - `screenX`: X position in screen space
  - `screenY`: Y position in screen space
  - `tileSize`: The width of a tile in pixels
  - `tileHeight`: The height of a tile in pixels
  
- **Returns**: Object with grid x,y coordinates (may need rounding for exact tile)

### `getWorldPositionFromGrid(gridX: number, gridY: number, anchorX: number, anchorY: number, tileSize: number, tileHeight: number): { x: number, y: number }`

Gets the absolute world position for a grid coordinate, accounting for the scene's anchor point.

- **Parameters**:
  - `gridX`: X position on the logical grid
  - `gridY`: Y position on the logical grid
  - `anchorX`: The X anchor point of the scene
  - `anchorY`: The Y anchor point of the scene
  - `tileSize`: The width of a tile in pixels
  - `tileHeight`: The height of a tile in pixels
  
- **Returns**: Object with absolute world x,y coordinates

### `isValidCoordinate(x: number, y: number, boardWidth: number, boardHeight: number): boolean`

Checks if the given grid coordinates are within the board boundaries.

- **Parameters**:
  - `x`: X position on the logical grid
  - `y`: Y position on the logical grid
  - `boardWidth`: Width of the game board in tiles
  - `boardHeight`: Height of the game board in tiles
  
- **Returns**: Boolean indicating if coordinate is valid

### `getNeighbors(x: number, y: number, boardWidth: number, boardHeight: number): Array<{ x: number, y: number }>`

Gets all valid neighboring coordinates for a given grid position.

- **Parameters**:
  - `x`: X position on the logical grid
  - `y`: Y position on the logical grid
  - `boardWidth`: Width of the game board in tiles
  - `boardHeight`: Height of the game board in tiles
  
- **Returns**: Array of coordinate objects representing neighboring positions

### `calculateManhattanDistance(x1: number, y1: number, x2: number, y2: number): number`

Calculates the Manhattan distance between two grid coordinates.

- **Parameters**:
  - `x1`: X position of first coordinate
  - `y1`: Y position of first coordinate
  - `x2`: X position of second coordinate
  - `y2`: Y position of second coordinate
  
- **Returns**: Number representing the Manhattan distance 