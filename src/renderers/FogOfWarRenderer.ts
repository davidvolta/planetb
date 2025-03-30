import Phaser from 'phaser';
import { LayerManager } from '../managers/LayerManager';
import { BaseRenderer } from './BaseRenderer';
import * as CoordinateUtils from '../utils/CoordinateUtils';

/**
 * Responsible for rendering and managing fog of war tiles
 */
export class FogOfWarRenderer extends BaseRenderer {
  // Track all created fog tiles
  private fogTiles: Map<string, Phaser.GameObjects.Graphics> = new Map();
  
  // Fog visual properties
  private readonly fogColor: number = 0x000000;
  private readonly fogStrokeColor: number = 0x222222;
  private readonly fogStrokeWidth: number = 1;
  private readonly fadeAnimationDuration: number = 150; // ms
  
  // Callback for when tile visibility changes
  private onTileVisibilityChange: ((x: number, y: number, isVisible: boolean) => void) | null = null;
  
  /**
   * Creates a new FogOfWarRenderer
   * @param scene The parent scene
   * @param layerManager Layer manager for organizing fog display
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
   * Set a callback to be called when tile visibility changes
   * @param callback The callback function
   */
  setTileVisibilityCallback(callback: (x: number, y: number, isVisible: boolean) => void): void {
    this.onTileVisibilityChange = callback;
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
   * Create a fog tile at the specified grid coordinates
   * @param gridX X position on the grid
   * @param gridY Y position on the grid
   * @returns The created fog tile
   */
  createFogTile(gridX: number, gridY: number): Phaser.GameObjects.Graphics {
    // Get screen position from grid coordinates
    const position = this.gridToScreen(gridX, gridY);
    
    // Create a new graphics object for the fog tile
    const fogTile = this.scene.add.graphics();
    
    // Draw fog tile shape (same as terrain tiles)
    const points = CoordinateUtils.createIsoDiamondPoints(this.tileSize, this.tileHeight);
    
    // Fill with fog color
    fogTile.fillStyle(this.fogColor, 1);
    fogTile.lineStyle(this.fogStrokeWidth, this.fogStrokeColor, 1);
    
    // Draw the shape
    fogTile.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        fogTile.moveTo(point.x, point.y);
      } else {
        fogTile.lineTo(point.x, point.y);
      }
    });
    fogTile.closePath();
    fogTile.fillPath();
    fogTile.strokePath();
    
    // Position at the grid location
    fogTile.setPosition(position.x, position.y);
    
    // Add to the fog layer (which should be on top of units but below UI)
    this.layerManager.addToLayer('fogOfWar', fogTile);
    
    // Store in our map for future reference
    const key = `${gridX},${gridY}`;
    this.fogTiles.set(key, fogTile);
    
    return fogTile;
  }
  
  /**
   * Reveal a tile by fading out and removing its fog
   * @param gridX X position on the grid
   * @param gridY Y position on the grid
   */
  revealTile(gridX: number, gridY: number): void {
    const key = `${gridX},${gridY}`;
    const fogTile = this.fogTiles.get(key);
    
    if (fogTile) {
      // Notify about visibility change before animation starts
      if (this.onTileVisibilityChange !== null) {
        this.onTileVisibilityChange!(gridX, gridY, true);
      }
      
      // Animate the fade out
      this.scene.tweens.add({
        targets: fogTile,
        alpha: 0,
        duration: this.fadeAnimationDuration,
        onComplete: () => {
          // Remove and destroy the fog tile after animation
          fogTile.destroy();
          this.fogTiles.delete(key);
        }
      });
    }
  }
  
  /**
   * Reveal multiple tiles at once
   * @param tiles Array of grid coordinates to reveal
   */
  revealTiles(tiles: { x: number, y: number }[]): void {
    // Notify about visibility changes before animation starts
    if (this.onTileVisibilityChange !== null) {
      tiles.forEach(tile => {
        const key = `${tile.x},${tile.y}`;
        if (this.fogTiles.has(key)) {
          this.onTileVisibilityChange!(tile.x, tile.y, true);
        }
      });
    }
    
    // Create an array of fog tiles to animate
    const tilesToAnimate: Phaser.GameObjects.Graphics[] = [];
    
    // Find all existing fog tiles for the coordinates
    tiles.forEach(tile => {
      const key = `${tile.x},${tile.y}`;
      const fogTile = this.fogTiles.get(key);
      if (fogTile) {
        tilesToAnimate.push(fogTile);
      }
    });
    
    // Animate all tiles together
    if (tilesToAnimate.length > 0) {
      this.scene.tweens.add({
        targets: tilesToAnimate,
        alpha: 0,
        duration: this.fadeAnimationDuration,
        onComplete: () => {
          // Remove and destroy all revealed fog tiles
          tilesToAnimate.forEach(fogTile => {
            fogTile.destroy();
          });
          
          // Remove from the map
          tiles.forEach(tile => {
            const key = `${tile.x},${tile.y}`;
            this.fogTiles.delete(key);
          });
        }
      });
    }
  }
  
  /**
   * Create fog tiles for all tiles on the board
   * @param board The game board
   */
  createFogOfWar(board: { width: number, height: number }): void {
    // Clear any existing fog tiles first
    this.clearFogOfWar();
    
    // Create a fog tile for every position on the board
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        this.createFogTile(x, y);
        
        // Notify about the tile being hidden (under fog)
        if (this.onTileVisibilityChange !== null) {
          this.onTileVisibilityChange!(x, y, false);
        }
      }
    }
  }
  
  /**
   * Remove all fog tiles
   */
  clearFogOfWar(): void {
    // Notify about visibility changes for all fogged tiles
    if (this.onTileVisibilityChange !== null) {
      this.fogTiles.forEach((tile, key) => {
        const [x, y] = key.split(',').map(Number);
        this.onTileVisibilityChange!(x, y, true);
      });
    }
    
    // Destroy all fog tiles
    this.fogTiles.forEach(tile => {
      tile.destroy();
    });
    
    // Clear the map
    this.fogTiles.clear();
  }
  
  /**
   * Check if a tile is currently under fog
   * @param gridX X position on the grid
   * @param gridY Y position on the grid
   * @returns Whether the tile is fogged
   */
  isTileFogged(gridX: number, gridY: number): boolean {
    const key = `${gridX},${gridY}`;
    return this.fogTiles.has(key);
  }
  
  /**
   * Clean up resources when destroying this renderer
   */
  override destroy(): void {
    super.destroy();
    this.clearFogOfWar();
  }
} 