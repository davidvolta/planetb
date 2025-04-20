import { LayerManager } from '../managers/LayerManager';

/**
 * Abstract base class for all renderers in the game.
 * Provides common functionality and properties used by different renderer types.
 */
export abstract class BaseRenderer {
  protected scene: Phaser.Scene;
  protected layerManager: LayerManager;
  protected tileSize: number;
  protected tileHeight: number;
  protected anchorX: number = 0;
  protected anchorY: number = 0;

  /**
   * Creates a new BaseRenderer
   * @param scene The parent scene
   * @param layerManager Layer manager for organizing display
   * @param tileSize The width of a tile in pixels
   * @param tileHeight The height of a tile in pixels
   */
  constructor(
    scene: Phaser.Scene, 
    layerManager: LayerManager, 
    tileSize: number = 64, 
    tileHeight: number = 32
  ) {
    this.scene = scene;
    this.layerManager = layerManager;
    this.tileSize = tileSize;
    this.tileHeight = tileHeight;
  }

  /**
   * Initialize the renderer with board anchor position
   * @param anchorX The X coordinate of the grid anchor point
   * @param anchorY The Y coordinate of the grid anchor point
   */
  initialize(anchorX: number, anchorY: number): void {
    this.setAnchor(anchorX, anchorY);
  }

  /**
   * Sets the anchor point for coordinate calculations
   * @param x X anchor point
   * @param y Y anchor point
   */
  setAnchor(x: number, y: number): void {
    this.anchorX = x;
    this.anchorY = y;
  }

  /**
   * Converts grid coordinates to screen coordinates
   * @param gridX X position on the grid
   * @param gridY Y position on the grid
   * @returns Object with screen x,y coordinates
   */
  protected gridToScreen(gridX: number, gridY: number): { x: number, y: number } {
    // Calculate isometric position
    const isoX = (gridX - gridY) * this.tileSize / 2;
    const isoY = (gridX + gridY) * this.tileHeight / 2;
    
    // Add anchor offset
    return {
      x: this.anchorX + isoX,
      y: this.anchorY + isoY
    };
  }

  /**
   * Cleans up resources used by this renderer
   * Should be called when the renderer is no longer needed
   */
  destroy(): void {
    // Common cleanup logic for all renderers
    // Specific renderers should override this method and call super.destroy()
  }
} 