import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { BaseRenderer } from './BaseRenderer';

// Types of selection states to differentiate behavior
export enum SelectionType {
  Move   = 'move',
  Action = 'action'
}

// Responsible for rendering and managing selection indicators and hover effects
export class SelectionRenderer extends BaseRenderer {
  private static readonly INDICATOR_SCALE = 0.85;

  private selectionIndicator: Phaser.GameObjects.Graphics | null = null; // Selection indicator for showing selected tiles
  private hoverIndicator: Phaser.GameObjects.Graphics | null = null;   // Hover indicator for showing mouse hover
  private hoveredGridPosition: { x: number, y: number } | null = null;  // Track currently hovered grid position
  
  // Creates a new SelectionRenderer
  constructor(
    scene: Phaser.Scene, 
    layerManager: LayerManager, 
    tileSize: number, 
    tileHeight: number
  ) {
    super(scene, layerManager, tileSize, tileHeight);
  }
  
  // Helper to draw a diamond on a graphics object with given style
  private drawDiamond(
    graphics: Phaser.GameObjects.Graphics,
    lineWidth: number,
    color: number,
    alpha: number
  ): void {
    const points = CoordinateUtils.createIsoDiamondPoints(
      this.tileSize,
      this.tileHeight,
      SelectionRenderer.INDICATOR_SCALE
    );
    graphics.lineStyle(lineWidth, color, alpha);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.closePath();
    graphics.strokePath();
  }
  
  // Create a reusable indicator graphic with given style
  private createIndicator(
    lineWidth: number,
    color: number,
    alpha: number
  ): Phaser.GameObjects.Graphics | null {
    const selectionLayer = this.layerManager.getSelectionLayer();
    if (!selectionLayer) {
      console.warn("selectionLayer not available, cannot create indicator");
      return null;
    }
    const graphics = this.scene.add.graphics();
    this.drawDiamond(graphics, lineWidth, color, alpha);
    graphics.setVisible(false);
    this.layerManager.addToLayer('selection', graphics);
    return graphics;
  }
  
  // Creates the selection indicator graphics
  private createSelectionIndicator(): Phaser.GameObjects.Graphics | null {
    if (this.selectionIndicator) {
      this.selectionIndicator.destroy();
      this.selectionIndicator = null;
    }
    this.selectionIndicator = this.createIndicator(3, 0xFFFFFF, 0.8);
    return this.selectionIndicator;
  }
  
  //Creates the hover indicator graphics
  private createHoverIndicator(): Phaser.GameObjects.Graphics | null {
    if (this.hoverIndicator) {
      this.hoverIndicator.destroy();
      this.hoverIndicator = null;
    }
    this.hoverIndicator = this.createIndicator(2, 0x999999, 0.7);
    return this.hoverIndicator;
  }
  
  // Updates the selection indicator visibility and position
  updateSelectionIndicator(shouldShow: boolean, x?: number, y?: number, color: number = 0xFFFFFF): void {
    if (!this.selectionIndicator) {
      // Create the indicator if it doesn't exist
      this.createSelectionIndicator();
      
      // If still null after attempting to create, exit
      if (!this.selectionIndicator) {
        console.warn("Could not create selection indicator");
        return;
      }
    }
    
    if (shouldShow && x !== undefined && y !== undefined) {
      // Calculate world position from grid coordinates
      const worldPosition = CoordinateUtils.gridToWorld(
        x, y, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
      );
      
      // Position the indicator and redraw
      this.selectionIndicator.setPosition(worldPosition.x, worldPosition.y);
      this.selectionIndicator.clear();
      this.drawDiamond(this.selectionIndicator, 3, color, 0.8);
      
      this.selectionIndicator.setVisible(true);
      
      // Ensure it's at the top of its layer
      const selectionLayer = this.layerManager.getSelectionLayer();
      if (selectionLayer) {
        // Re-add to make sure it's at the top of its layer
        selectionLayer.remove(this.selectionIndicator);
        selectionLayer.add(this.selectionIndicator);
      } else {
        console.warn("Cannot add selection indicator to layer - selectionLayer is null");
      }
    } else {
      // Just hide the indicator
      if (this.selectionIndicator) {
        this.selectionIndicator.setVisible(false);
      }
    }
  }
  
  //Updates the hover indicator visibility and position
  updateHoverIndicator(shouldShow: boolean, x?: number, y?: number): void {
    if (!this.hoverIndicator) {
      this.createHoverIndicator();      // Create the indicator if it doesn't exist
      
      // If still null after attempting to create, exit
      if (!this.hoverIndicator) {
        console.warn("Could not create hover indicator");
        return;
      }
    }
    
    if (shouldShow && x !== undefined && y !== undefined) {

      this.hoveredGridPosition = { x, y };       // Store the hovered position
      
      // Calculate world position from grid coordinates
      const worldPosition = CoordinateUtils.gridToWorld(
        x, y, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
      );
  
      this.hoverIndicator.setPosition(worldPosition.x, worldPosition.y);     // Position the indicator
      
      // Make the indicator visible
      this.hoverIndicator.setVisible(true);
    } else {
      // Clear the hovered position
      this.hoveredGridPosition = null;
      
      // Hide the indicator
      if (this.hoverIndicator) {
        this.hoverIndicator.setVisible(false);
      }
    }
  }
  
  //Update the hover indicator based on the current pointer position
  updateFromPointer(
    pointer: Phaser.Input.Pointer, 
    boardWidth: number, 
    boardHeight: number
  ): void {
    // Get world position from screen coordinates
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    
    // Convert to grid position
    const gridPosition = CoordinateUtils.screenToGrid(
      0, 0, // Not used when worldPoint is provided
      this.tileSize,
      this.tileHeight,
      this.anchorX,
      this.anchorY,
      worldPoint
    );
    
    // Check if position is valid
    const isValidPosition = CoordinateUtils.isValidCoordinate(
      gridPosition.x, 
      gridPosition.y, 
      boardWidth, 
      boardHeight
    );
    
    if (isValidPosition) {
      // Update the hover indicator with the new position
      this.updateHoverIndicator(true, gridPosition.x, gridPosition.y);
    } else {
      // Hide the hover indicator if we're off the grid
      this.updateHoverIndicator(false);
    }
  }
  
  // Show a selection indicator at a specific grid position with a type
  public showSelection(x: number, y: number, type: SelectionType = SelectionType.Move): void {
    // Map selection type to indicator color
    const color = type === SelectionType.Move ? 0xFFFFFF : 0xFF0000;
    this.updateSelectionIndicator(true, x, y, color);
  }

  //Hide the selection indicator
  public hideSelection(): void {
    this.updateSelectionIndicator(false);
  }
  //Clean up resources when destroying this renderer
  override destroy(): void {
    super.destroy();
    
    if (this.selectionIndicator) {
      this.selectionIndicator.destroy();
      this.selectionIndicator = null;
    }
    
    if (this.hoverIndicator) {
      this.hoverIndicator.destroy();
      this.hoverIndicator = null;
    }
  }
} 