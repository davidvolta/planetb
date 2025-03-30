/**
 * This file contains code to run coordinate validation directly from a BoardScene instance.
 * Useful for verifying that the coordinate system works correctly after refactoring.
 */

import * as CoordinateUtils from './CoordinateUtils';
import * as actions from '../../../store/actions';
import { runCoordinateValidation } from './coordinateValidation';

// Add this method to BoardScene to test coordinate conversions
export function runCoordinateTestsFromBoardScene(scene: any) {
  console.log("Running coordinate conversion tests...");
  
  // Get board dimensions
  const board = actions.getBoard();
  if (!board) {
    console.error("Cannot run tests: no board found");
    return { success: false, message: "No board found" };
  }
  
  // Extract needed properties from the scene
  const { tileSize, tileHeight, anchorX, anchorY } = scene;
  
  // Basic grid-to-world test
  const gridPos = { x: 5, y: 5 };
  const worldPos = CoordinateUtils.gridToWorld(
    gridPos.x, gridPos.y, tileSize, tileHeight, anchorX, anchorY
  );
  console.log(`Grid (${gridPos.x}, ${gridPos.y}) -> World (${worldPos.x}, ${worldPos.y})`);
  
  // World-to-grid test (round trip)
  const convertedGridPos = CoordinateUtils.screenToGrid(
    worldPos.x, worldPos.y, tileSize, tileHeight, anchorX, anchorY
  );
  console.log(`World (${worldPos.x}, ${worldPos.y}) -> Grid (${convertedGridPos.x}, ${convertedGridPos.y})`);
  
  // Check if the conversion is valid
  const isValidConversion = gridPos.x === convertedGridPos.x && gridPos.y === convertedGridPos.y;
  console.log(`Conversion valid: ${isValidConversion}`);
  
  // Test multiple points
  const testPositions = [
    { x: 0, y: 0 },
    { x: board.width - 1, y: 0 },
    { x: 0, y: board.height - 1 },
    { x: board.width - 1, y: board.height - 1 },
    { x: Math.floor(board.width / 2), y: Math.floor(board.height / 2) }
  ];
  
  const results = testPositions.map(pos => {
    const world = CoordinateUtils.gridToWorld(
      pos.x, pos.y, tileSize, tileHeight, anchorX, anchorY
    );
    const grid = CoordinateUtils.screenToGrid(
      world.x, world.y, tileSize, tileHeight, anchorX, anchorY
    );
    return {
      original: pos,
      world,
      converted: grid,
      valid: pos.x === grid.x && pos.y === grid.y
    };
  });
  
  const allValid = results.every(r => r.valid);
  console.log("All test positions valid:", allValid);
  console.log("Test results:", results);
  
  return { 
    success: allValid,
    message: allValid ? "All coordinate conversions passed" : "Some coordinate conversions failed",
    results
  };
} 