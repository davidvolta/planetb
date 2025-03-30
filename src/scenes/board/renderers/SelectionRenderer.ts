import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { BaseRenderer } from './BaseRenderer';

/**
 * Responsible for rendering and managing selection indicators and hover effects
 */
export class SelectionRenderer extends BaseRenderer {
  // Selection indicator for showing selected tiles
  private selectionIndicator: Phaser.GameObjects.Graphics | null = null;
  
  // Hover indicator for showing mouse hover
  private hoverIndicator: Phaser.GameObjects.Graphics | null = null;
  
  // Track currently hovered grid position
  private hoveredGridPosition: { x: number, y: number } | null = null;
  
  /**
   * Creates a new SelectionRenderer
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
   * Initialize the renderer with board anchor position
   * @param anchorX The X coordinate of the grid anchor point
   * @param anchorY The Y coordinate of the grid anchor point
   */
  initialize(anchorX: number, anchorY: number): void {
    this.setAnchor(anchorX, anchorY);
    
    // Create selection and hover indicators
    this.createSelectionIndicator();
    this.createHoverIndicator();
  }
  
  /**
   * Creates the selection indicator graphics
   * @returns The created selection indicator
   */
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
    
    // Create a new graphics object for the selection indicator
    this.selectionIndicator = this.scene.add.graphics();
    
    // Diamond shape for the selection indicator
    const diamondPoints = CoordinateUtils.createIsoDiamondPoints(this.tileSize, this.tileHeight);
    
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
  
  /**
   * Creates the hover indicator graphics
   * @returns The created hover indicator
   */
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
    
    // Create a new graphics object for the hover indicator
    this.hoverIndicator = this.scene.add.graphics();
    
    // Diamond shape for the hover indicator
    const diamondPoints = CoordinateUtils.createIsoDiamondPoints(this.tileSize, this.tileHeight);
    
    // Draw the hover indicator
    this.hoverIndicator.lineStyle(2, 0xD3D3D3, 0.4); // 2px light gray line with 40% opacity
    this.hoverIndicator.beginPath();
    this.hoverIndicator.moveTo(diamondPoints[0].x, diamondPoints[0].y);
    for (let i = 1; i < diamondPoints.length; i++) {
      this.hoverIndicator.lineTo(diamondPoints[i].x, diamondPoints[i].y);
    }
    this.hoverIndicator.closePath();
    this.hoverIndicator.strokePath();
    
    // Hide the hover indicator initially
    this.hoverIndicator.setVisible(false);
    
    // Add hover indicator to selection layer using layer manager
    this.layerManager.addToLayer('selection', this.hoverIndicator);
    
    return this.hoverIndicator;
  }
  
  /**
   * Updates the selection indicator visibility and position
   * @param shouldShow Whether to show the indicator
   * @param x Grid X position (if showing)
   * @param y Grid Y position (if showing)
   */
  updateSelectionIndicator(shouldShow: boolean, x?: number, y?: number): void {
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
  
  /**
   * Updates the hover indicator visibility and position
   * @param shouldShow Whether to show the indicator
   * @param x Grid X position (if showing)
   * @param y Grid Y position (if showing)
   */
  updateHoverIndicator(shouldShow: boolean, x?: number, y?: number): void {
    if (!this.hoverIndicator) {
      // Create the indicator if it doesn't exist
      this.createHoverIndicator();
      
      // If still null after attempting to create, exit
      if (!this.hoverIndicator) {
        console.warn("Could not create hover indicator");
        return;
      }
    }
    
    if (shouldShow && x !== undefined && y !== undefined) {
      // Store the hovered position
      this.hoveredGridPosition = { x, y };
      
      // Calculate world position from grid coordinates
      const worldPosition = CoordinateUtils.gridToWorld(
        x, y, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
      );
      
      // Position the indicator
      this.hoverIndicator.setPosition(worldPosition.x, worldPosition.y);
      
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
  
  /**
   * Update the hover indicator based on the current pointer position
   * @param pointer The Phaser pointer (mouse/touch) to track
   * @param boardWidth Width of the game board in tiles
   * @param boardHeight Height of the game board in tiles
   */
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
  
  /**
   * Show the selection indicator at a specific grid position
   * @param x Grid X position
   * @param y Grid Y position
   */
  showSelectionAt(x: number, y: number): void {
    this.updateSelectionIndicator(true, x, y);
  }
  
  /**
   * Hide the selection indicator
   */
  hideSelection(): void {
    this.updateSelectionIndicator(false);
  }
  
  /**
   * Get the currently hovered grid position
   * @returns The hovered grid coordinates or null if none
   */
  getHoveredPosition(): { x: number, y: number } | null {
    return this.hoveredGridPosition;
  }
  
  /**
   * Clean up resources when destroying this renderer
   */
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