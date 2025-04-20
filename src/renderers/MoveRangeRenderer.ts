import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { ValidMove } from '../store/gameStore';
import { BaseRenderer } from './BaseRenderer';

/**
 * Responsible for rendering and managing move range highlights
 */
export class MoveRangeRenderer extends BaseRenderer {
  // Array to store move range highlight graphics
  private moveRangeHighlights: Phaser.GameObjects.Graphics[] = [];
  
  /**
   * Creates a new MoveRangeRenderer
   * @param scene The parent scene
   * @param layerManager Layer manager for organizing display
   * @param tileSize The width of a tile in pixels
   * @param tileHeight The height of a tile in pixels
   */
  constructor(
    scene: Phaser.Scene, 
    layerManager: LayerManager, 
    tileSize: number, 
    tileHeight: number
  ) {
    super(scene, layerManager, tileSize, tileHeight);
  }
  
  /**
   * Show move range highlights for valid moves
   * @param validMoves Array of valid move positions
   * @param moveMode Whether move mode is active
   */
  showMoveRange(validMoves: ValidMove[], moveMode: boolean): void {
    // Clear any existing highlights first
    this.clearMoveHighlights();
    
    // Get the move range layer
    const moveRangeLayer = this.layerManager.getMoveRangeLayer();
    
    // If not in move mode or no valid moves, we're done
    if (!moveMode || !validMoves.length || !moveRangeLayer) {
      return;
    }
    
    console.log(`Rendering ${validMoves.length} valid move highlights`);
    
    // Create highlight for each valid move
    validMoves.forEach(move => {
      const highlight = this.createMoveHighlight(move.x, move.y);
      this.moveRangeHighlights.push(highlight);
      
      // Add the highlight to the move range layer
      this.layerManager.addToLayer('moveRange', highlight);
    });
  }
  
  /**
   * Creates a highlight for a move target
   * @param x Grid X position
   * @param y Grid Y position
   * @returns The created highlight graphic
   */
  private createMoveHighlight(x: number, y: number): Phaser.GameObjects.Graphics {
    // Use coordinate utility to get world position
    const worldPosition = CoordinateUtils.gridToWorld(
      x, y, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
    );
    
    // Create a graphics object for the move highlight
    const highlight = this.scene.add.graphics();
    
    // Set the position
    highlight.setPosition(worldPosition.x, worldPosition.y);
    
    // Apply scaling factor
    const scaleFactor = 0.85;
    
    // Create scaled diamond points using utility
    const diamondPoints = CoordinateUtils.createIsoDiamondPoints(
      this.tileSize,
      this.tileHeight,
      scaleFactor
    );
    
 
    
    // Draw the main diamond shape
    highlight.lineStyle(2, 0x999999, 0.7); // Reduced from 3px to 2px, changed color to gray
    highlight.beginPath();
    highlight.moveTo(diamondPoints[0].x, diamondPoints[0].y);
    for (let i = 1; i < diamondPoints.length; i++) {
      highlight.lineTo(diamondPoints[i].x, diamondPoints[i].y);
    }
    highlight.closePath();
    highlight.strokePath();
    
    // Store grid coordinates on the highlight for reference
    highlight.setData('gridX', x);
    highlight.setData('gridY', y);
    
    return highlight;
  }
  
  /**
   * Clear all move highlights
   */
  clearMoveHighlights(): void {
    // Destroy all existing highlights
    this.moveRangeHighlights.forEach(highlight => {
      highlight.destroy();
    });
    
    // Reset the array
    this.moveRangeHighlights = [];
    
    // Also clear the layer using layer manager
    this.layerManager.clearLayer('moveRange', true);
  }
  
  /**
   * Get all current move range highlights
   * @returns Array of highlight graphics
   */
  getMoveHighlights(): Phaser.GameObjects.Graphics[] {
    return [...this.moveRangeHighlights];
  }
  
  /**
   * Check if a grid position is a valid move target
   * @param gridX Grid X coordinate
   * @param gridY Grid Y coordinate
   * @returns Whether the position has a move highlight
   */
  isValidMoveTarget(gridX: number, gridY: number): boolean {
    // Check if any of the highlights are at this position
    return this.moveRangeHighlights.some(highlight => 
      highlight.getData('gridX') === gridX && 
      highlight.getData('gridY') === gridY
    );
  }
  
  /**
   * Clean up resources when no longer needed
   */
  override destroy(): void {
    super.destroy();
    this.clearMoveHighlights();
  }
} 