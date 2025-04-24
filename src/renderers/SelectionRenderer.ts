import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { BaseRenderer } from './BaseRenderer';

// Responsible for rendering and managing selection indicators and hover effects
export class SelectionRenderer extends BaseRenderer {
  
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
  
  // Creates the selection indicator graphics
  private createSelectionIndicator(): Phaser.GameObjects.Graphics | null {
    // Destroy existing selection indicator if it exists
    if (this.selectionIndicator) {
      this.selectionIndicator.destroy();
      this.selectionIndicator = null;
    }
    
    // Check if selectionLayer exists using layer manager
    const selectionLayer = this.layerManager.getSelectionLayer();
    if (!selectionLayer) {
      console.warn("selectionLayer not available, cannot create selection indicator");
      return null;
    }
  
    this.selectionIndicator = this.scene.add.graphics();     // Create a new graphics object for the selection indicator
    const scaleFactor = 0.85;    // Apply scaling factor to match move indicators
    
    // Diamond shape for the selection indicator with scaling to match move indicators
    const diamondPoints = CoordinateUtils.createIsoDiamondPoints(
      this.tileSize, 
      this.tileHeight,
      scaleFactor
    );
    
    // Draw the selection indicator
    this.selectionIndicator.lineStyle(3, 0xFFFFFF, 0.8); // 3px white line with 80% opacity
    this.selectionIndicator.beginPath();
    this.selectionIndicator.moveTo(diamondPoints[0].x, diamondPoints[0].y);
    for (let i = 1; i < diamondPoints.length; i++) {
      this.selectionIndicator.lineTo(diamondPoints[i].x, diamondPoints[i].y);
    }
    this.selectionIndicator.closePath();
    this.selectionIndicator.strokePath();
    
    // Hide the selection indicator initially
    this.selectionIndicator.setVisible(false);
    
    // Add selection indicator to selection layer using layer manager
    this.layerManager.addToLayer('selection', this.selectionIndicator);
    
    return this.selectionIndicator;
  }
  
  //Creates the hover indicator graphics
  private createHoverIndicator(): Phaser.GameObjects.Graphics | null {
    // Destroy existing hover indicator if it exists
    if (this.hoverIndicator) {
      this.hoverIndicator.destroy();
      this.hoverIndicator = null;
    }
    
    // Check if selectionLayer exists using layer manager
    const selectionLayer = this.layerManager.getSelectionLayer();
    if (!selectionLayer) {
      console.warn("selectionLayer not available, cannot create hover indicator");
      return null;
    }
    
    this.hoverIndicator = this.scene.add.graphics();   // Create a new graphics object for the hover indicator
    const scaleFactor = 0.85;     // Apply scaling factor to match move indicators
    
    // Diamond shape for the hover indicator with scaling to match move indicators
    const diamondPoints = CoordinateUtils.createIsoDiamondPoints(
      this.tileSize, 
      this.tileHeight,
      scaleFactor
    );
    
    // Draw the hover indicator with same style as move indicators
    this.hoverIndicator.lineStyle(2, 0x999999, 0.7); // Match move indicator style
    this.hoverIndicator.beginPath();
    this.hoverIndicator.moveTo(diamondPoints[0].x, diamondPoints[0].y);
    for (let i = 1; i < diamondPoints.length; i++) {
      this.hoverIndicator.lineTo(diamondPoints[i].x, diamondPoints[i].y);
    }
    this.hoverIndicator.closePath();
    this.hoverIndicator.strokePath();
    this.hoverIndicator.setVisible(false);     // Hide the hover indicator initially
    this.layerManager.addToLayer('selection', this.hoverIndicator); // Add hover indicator to selection layer using layer manager
    
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
      
      // Position the indicator
      this.selectionIndicator.setPosition(worldPosition.x, worldPosition.y);
      
      // Clear previous graphics
      this.selectionIndicator.clear();
      
      // Apply scaling factor to match move indicators
      const scaleFactor = 0.85;
      
      // Redraw with the specified color
      const diamondPoints = CoordinateUtils.createIsoDiamondPoints(
        this.tileSize, 
        this.tileHeight,
        scaleFactor
      );
      this.selectionIndicator.lineStyle(3, color, 0.8); // 3px line with 80% opacity
      this.selectionIndicator.beginPath();
      this.selectionIndicator.moveTo(diamondPoints[0].x, diamondPoints[0].y);
      for (let i = 1; i < diamondPoints.length; i++) {
        this.selectionIndicator.lineTo(diamondPoints[i].x, diamondPoints[i].y);
      }
      this.selectionIndicator.closePath();
      this.selectionIndicator.strokePath();
      
      // Make the indicator visible
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
  
  //Show the selection indicator at a specific grid position
  showSelectionAt(x: number, y: number, color?: number): void {
    this.updateSelectionIndicator(true, x, y, color);
  }
  
  // Show a red selection indicator at a specific grid position
  showRedSelectionAt(x: number, y: number): void {
    this.showSelectionAt(x, y, 0xFF0000);
  }
  
  //Hide the selection indicator
  hideSelection(): void {
    this.updateSelectionIndicator(false);
  }
  
  //Get the currently hovered grid position
  getHoveredPosition(): { x: number, y: number } | null {
    return this.hoveredGridPosition;
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