
//Converts grid coordinates to isometric screen coordinates (without anchor offset)
export function gridToIso(gridX: number, gridY: number, tileSize: number, tileHeight: number): { x: number, y: number } {
  const isoX = (gridX - gridY) * tileSize / 2;
  const isoY = (gridX + gridY) * tileHeight / 2;
  
  return { x: isoX, y: isoY };
}

//Converts grid coordinates to world coordinates (with anchor offset)
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

// Converts screen coordinates to grid coordinates
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

//Checks if a grid coordinate is valid within the board dimensions
export function isValidCoordinate(x: number, y: number, boardWidth: number, boardHeight: number): boolean {
  return x >= 0 && x < boardWidth && y >= 0 && y < boardHeight;
}

// Gets all valid neighboring coordinates for a given grid position
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

// Gets all valid adjacent coordinates including diagonals for a given grid position including the center position itself
export function getAdjacentTiles(x: number, y: number, boardWidth: number, boardHeight: number): { x: number, y: number }[] {
  const adjacentOffsets = [
    { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
    { x: -1, y: 0 }, /* Center */ { x: 1, y: 0 },
    { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }
  ];
  
  const result = [{ x, y }]; // Include the central tile itself
  
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

//Calculates Manhattan distance between two grid coordinates
export function calculateManhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

// Creates an array of isometric diamond points for tile shapes
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

//Remove duplicate coordinate objects from an array
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