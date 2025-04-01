/**
 * Coordinate utilities for isometric grid conversions.
 * Handles conversions between grid coordinates (logical) and screen/world coordinates (pixel).
 */

/**
 * Converts grid coordinates to isometric screen coordinates (without anchor offset)
 * 
 * @param gridX X position on the logical grid
 * @param gridY Y position on the logical grid
 * @param tileSize The width of a tile in pixels
 * @param tileHeight The height of a tile in pixels (typically half of tileSize for isometric)
 * @returns Object with {x, y} screen coordinates relative to (0,0)
 */
export function gridToIso(gridX: number, gridY: number, tileSize: number, tileHeight: number): { x: number, y: number } {
  const isoX = (gridX - gridY) * tileSize / 2;
  const isoY = (gridX + gridY) * tileHeight / 2;
  
  return { x: isoX, y: isoY };
}

/**
 * Converts grid coordinates to world coordinates (with anchor offset)
 * 
 * @param gridX X position on the logical grid
 * @param gridY Y position on the logical grid
 * @param tileSize The width of a tile in pixels
 * @param tileHeight The height of a tile in pixels
 * @param anchorX The X anchor point of the scene
 * @param anchorY The Y anchor point of the scene
 * @returns Object with absolute {x, y} world coordinates
 */
export function gridToWorld(
  gridX: number, 
  gridY: number, 
  tileSize: number, 
  tileHeight: number,
  anchorX: number,
  anchorY: number
): { x: number, y: number } {
  const { x: isoX, y: isoY } = gridToIso(gridX, gridY, tileSize, tileHeight);
  
  return { 
    x: anchorX + isoX, 
    y: anchorY + isoY 
  };
}

/**
 * Converts screen coordinates to grid coordinates
 * 
 * @param screenX X position in screen space
 * @param screenY Y position in screen space
 * @param tileSize The width of a tile in pixels
 * @param tileHeight The height of a tile in pixels
 * @param anchorX The X anchor point of the scene
 * @param anchorY The Y anchor point of the scene
 * @returns Object with grid {x, y} coordinates or null if out of bounds
 */
export function screenToGrid(
  screenX: number, 
  screenY: number, 
  tileSize: number, 
  tileHeight: number,
  anchorX: number,
  anchorY: number,
  worldPoint?: { x: number, y: number }
): { x: number, y: number } {
  // If a world point is provided (from camera.getWorldPoint), use it
  // Otherwise, assume screenX/Y are already in world coordinates
  const worldX = worldPoint ? worldPoint.x : screenX;
  const worldY = worldPoint ? worldPoint.y : screenY;
  
  // Adjust for anchor position
  const localX = worldX - anchorX;
  const localY = worldY - anchorY;
  
  // Add small offset to compensate for visual vs. logical grid mismatch
  const offsetX = 0;
  const offsetY = -tileHeight / 2;
  
  // Convert to isometric grid coordinates with adjustment
  // This follows the original BoardScene implementation for consistency
  let gridX = Math.floor(((localY + offsetY) / (tileHeight / 2) + (localX + offsetX) / (tileSize / 2)) / 2);
  let gridY = Math.floor(((localY + offsetY) / (tileHeight / 2) - (localX + offsetX) / (tileSize / 2)) / 2);
  
  // Add +1 to both coordinates to fix the off-by-one error
  // This is from the original implementation
  gridX += 1;
  gridY += 1;
  
  return { x: gridX, y: gridY };
}

/**
 * Checks if a grid coordinate is valid within the board dimensions
 * 
 * @param x X position on the grid
 * @param y Y position on the grid
 * @param boardWidth Width of the board in tiles
 * @param boardHeight Height of the board in tiles
 * @returns boolean indicating if the coordinate is within bounds
 */
export function isValidCoordinate(x: number, y: number, boardWidth: number, boardHeight: number): boolean {
  return x >= 0 && x < boardWidth && y >= 0 && y < boardHeight;
}

/**
 * Gets all valid neighboring coordinates for a given grid position
 * 
 * @param x X position on the grid
 * @param y Y position on the grid
 * @param boardWidth Width of the board in tiles
 * @param boardHeight Height of the board in tiles
 * @returns Array of neighboring coordinate objects
 */
export function getNeighbors(x: number, y: number, boardWidth: number, boardHeight: number): Array<{ x: number, y: number }> {
  // Define the potential neighbor directions
  const directions = [
    { x: -1, y: 0 }, // Left
    { x: 1, y: 0 },  // Right
    { x: 0, y: -1 }, // Up
    { x: 0, y: 1 },  // Down
  ];
  
  return directions
    .map(dir => ({ x: x + dir.x, y: y + dir.y }))
    .filter(pos => isValidCoordinate(pos.x, pos.y, boardWidth, boardHeight));
}

/**
 * Gets all valid adjacent coordinates including diagonals for a given grid position
 * Also includes the central position itself
 * 
 * @param x X position on the grid
 * @param y Y position on the grid
 * @param boardWidth Width of the board in tiles
 * @param boardHeight Height of the board in tiles
 * @returns Array of adjacent coordinate objects including the center position
 */
export function getAdjacentTiles(x: number, y: number, boardWidth: number, boardHeight: number): { x: number, y: number }[] {
  const adjacentOffsets = [
    { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
    { x: -1, y: 0 }, /* Center */ { x: 1, y: 0 },
    { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }
  ];
  
  // Include the central tile itself
  const result = [{ x, y }];
  
  // Add all valid adjacent tiles
  adjacentOffsets.forEach(offset => {
    const newX = x + offset.x;
    const newY = y + offset.y;
    
    // Check if coordinates are within board boundaries
    if (newX >= 0 && newX < boardWidth && newY >= 0 && newY < boardHeight) {
      result.push({ x: newX, y: newY });
    }
  });
  
  return result;
}

/**
 * Calculates Manhattan distance between two grid coordinates
 * 
 * @param x1 X position of first coordinate
 * @param y1 Y position of first coordinate
 * @param x2 X position of second coordinate
 * @param y2 Y position of second coordinate
 * @returns The Manhattan distance (sum of absolute differences)
 */
export function calculateManhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

/**
 * Creates an array of isometric diamond points for tile shapes
 * 
 * @param tileSize The width of a tile in pixels
 * @param tileHeight The height of a tile in pixels
 * @param scaleFactor Optional scaling factor for the points (default: 1.0)
 * @returns Array of point objects
 */
export function createIsoDiamondPoints(
  tileSize: number, 
  tileHeight: number, 
  scaleFactor: number = 1.0
): Array<{ x: number, y: number }> {
  return [
    { x: 0, y: -tileHeight / 2 * scaleFactor },
    { x: tileSize / 2 * scaleFactor, y: 0 },
    { x: 0, y: tileHeight / 2 * scaleFactor },
    { x: -tileSize / 2 * scaleFactor, y: 0 }
  ];
}

/**
 * Validates that coordinate conversions work bidirectionally
 * 
 * @param gridX Original grid X
 * @param gridY Original grid Y
 * @param tileSize Tile width
 * @param tileHeight Tile height
 * @param anchorX Scene anchor X
 * @param anchorY Scene anchor Y
 * @returns Object with validation results
 */
export function validateCoordinateConversion(
  gridX: number,
  gridY: number,
  tileSize: number,
  tileHeight: number,
  anchorX: number,
  anchorY: number
): { isValid: boolean, original: { x: number, y: number }, world: { x: number, y: number }, converted: { x: number, y: number } } {
  const original = { x: gridX, y: gridY };
  
  // Convert to world coordinates
  const world = gridToWorld(gridX, gridY, tileSize, tileHeight, anchorX, anchorY);
  
  // Convert back to grid coordinates
  const converted = screenToGrid(world.x, world.y, tileSize, tileHeight, anchorX, anchorY);
  
  // Check if the conversion is valid
  const isValid = original.x === converted.x && original.y === converted.y;
  
  return {
    isValid,
    original,
    world,
    converted
  };
}

/**
 * Remove duplicate coordinate objects from an array
 * 
 * @param tiles Array of coordinate objects with potential duplicates
 * @returns Array with duplicate coordinates removed
 */
export function removeDuplicateTiles(tiles: { x: number, y: number }[]): { x: number, y: number }[] {
  const uniqueKeys = new Set<string>();
  const uniqueTiles: { x: number, y: number }[] = [];
  
  tiles.forEach(tile => {
    const key = `${tile.x},${tile.y}`;
    if (!uniqueKeys.has(key)) {
      uniqueKeys.add(key);
      uniqueTiles.push(tile);
    }
  });
  
  return uniqueTiles;
} 