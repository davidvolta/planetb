/**
 * Utilities for handling grid-based operations and coordinate conversions
 * for isometric grids.
 */

/**
 * Convert screen coordinates to grid coordinates
 * @param screenX Screen X coordinate
 * @param screenY Screen Y coordinate
 * @param tileWidth Width of a tile
 * @param tileHeight Height of a tile
 * @param originX X origin of the grid in screen coordinates
 * @param originY Y origin of the grid in screen coordinates
 * @returns Grid coordinates {x, y}
 */
export function screenToGrid(
  screenX: number, 
  screenY: number, 
  tileWidth: number, 
  tileHeight: number,
  originX: number, 
  originY: number
): { x: number, y: number } {
  // Adjust for grid origin
  const localX = screenX - originX;
  const localY = screenY - originY;
  
  // Convert isometric coordinates to grid coordinates
  // Based on isometric projection where:
  // screen_x = (grid_x - grid_y) * (tile_width / 2)
  // screen_y = (grid_x + grid_y) * (tile_height / 2)
  
  // Solving for grid_x and grid_y:
  const gridX = Math.floor((localY / (tileHeight / 2) + localX / (tileWidth / 2)) / 2);
  const gridY = Math.floor((localY / (tileHeight / 2) - localX / (tileWidth / 2)) / 2);
  
  return { x: gridX, y: gridY };
}

/**
 * Convert grid coordinates to screen coordinates
 * @param gridX Grid X coordinate
 * @param gridY Grid Y coordinate
 * @param tileWidth Width of a tile
 * @param tileHeight Height of a tile
 * @param originX X origin of the grid in screen coordinates
 * @param originY Y origin of the grid in screen coordinates
 * @returns Screen coordinates {x, y} for the center of the tile
 */
export function gridToScreen(
  gridX: number, 
  gridY: number, 
  tileWidth: number, 
  tileHeight: number,
  originX: number, 
  originY: number
): { x: number, y: number } {
  // Calculate isometric coordinates
  const isoX = (gridX - gridY) * (tileWidth / 2);
  const isoY = (gridX + gridY) * (tileHeight / 2);
  
  // Adjust for grid origin
  const screenX = isoX + originX;
  const screenY = isoY + originY;
  
  return { x: screenX, y: screenY };
}

/**
 * Check if grid coordinates are within the bounds of the grid
 * @param x Grid X coordinate
 * @param y Grid Y coordinate
 * @param width Grid width
 * @param height Grid height
 * @returns True if coordinates are within bounds
 */
export function isInGridBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
} 