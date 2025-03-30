/**
 * Utility for testing and validating the CoordinateUtils functions
 */

import * as CoordinateUtils from './CoordinateUtils';
import * as actions from '../../../store/actions';

/**
 * Runs a validation test on coordinate conversions
 * 
 * @param tileSize The width of a tile in pixels
 * @param tileHeight The height of a tile in pixels
 * @param anchorX The X anchor point of the scene
 * @param anchorY The Y anchor point of the scene
 * @returns Validation results
 */
export function runCoordinateValidation(
  tileSize: number,
  tileHeight: number,
  anchorX: number,
  anchorY: number
): { success: boolean, results: any[] } {
  // Get board dimensions
  const board = actions.getBoard();
  
  if (!board) {
    console.error('Cannot validate coordinates: board not found');
    return { success: false, results: [] };
  }
  
  const results: any[] = [];
  let allValid = true;
  
  // Test a grid of points
  const testPoints = [
    { x: 0, y: 0 },                        // Top-left corner
    { x: board.width - 1, y: 0 },          // Top-right corner
    { x: 0, y: board.height - 1 },         // Bottom-left corner
    { x: board.width - 1, y: board.height - 1 }, // Bottom-right corner
    { x: Math.floor(board.width / 2), y: Math.floor(board.height / 2) } // Center
  ];
  
  // Add some random points
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(Math.random() * board.width);
    const y = Math.floor(Math.random() * board.height);
    testPoints.push({ x, y });
  }
  
  // Test each point
  testPoints.forEach(point => {
    const validation = CoordinateUtils.validateCoordinateConversion(
      point.x, point.y, tileSize, tileHeight, anchorX, anchorY
    );
    
    results.push(validation);
    
    if (!validation.isValid) {
      allValid = false;
      console.error(`Validation failed for point (${point.x}, ${point.y}):`, validation);
    }
  });
  
  return {
    success: allValid,
    results
  };
}

/**
 * Runs a reverse validation test (screen to grid to screen)
 * 
 * @param screenX Screen X coordinate
 * @param screenY Screen Y coordinate
 * @param tileSize The width of a tile in pixels
 * @param tileHeight The height of a tile in pixels
 * @param anchorX The X anchor point of the scene
 * @param anchorY The Y anchor point of the scene
 * @returns Validation result
 */
export function validateScreenToGridConversion(
  screenX: number,
  screenY: number,
  tileSize: number,
  tileHeight: number,
  anchorX: number,
  anchorY: number
): { isValid: boolean, screen: { x: number, y: number }, grid: { x: number, y: number }, backToScreen: { x: number, y: number } } {
  const screen = { x: screenX, y: screenY };
  
  // Convert screen to grid
  const grid = CoordinateUtils.screenToGrid(
    screenX, screenY, tileSize, tileHeight, anchorX, anchorY
  );
  
  // Convert back to screen
  const backToScreen = CoordinateUtils.gridToWorld(
    grid.x, grid.y, tileSize, tileHeight, anchorX, anchorY
  );
  
  // Calculate distance between original and converted points (allow small deviation due to rounding)
  const distance = Math.sqrt(
    Math.pow(screen.x - backToScreen.x, 2) + 
    Math.pow(screen.y - backToScreen.y, 2)
  );
  
  // Allow a small margin of error due to rounding and the nature of the conversions
  const isValid = distance < tileSize / 2;
  
  return {
    isValid,
    screen,
    grid,
    backToScreen
  };
}

/**
 * Tests if a specific coordinate lies within the grid
 * 
 * @param gridX Grid X to test
 * @param gridY Grid Y to test
 * @returns Whether the coordinate is valid
 */
export function testCoordinateValidity(gridX: number, gridY: number): boolean {
  const board = actions.getBoard();
  
  if (!board) {
    return false;
  }
  
  return CoordinateUtils.isValidCoordinate(gridX, gridY, board.width, board.height);
} 