import * as Phaser from "phaser";
import { TerrainType } from '../types/gameTypes';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { BaseRenderer } from './BaseRenderer';

/**
 * Responsible for rendering and managing board tiles
 */
export class TileRenderer extends BaseRenderer {
  // Track all created tiles
  private tiles: Phaser.GameObjects.GameObject[] = [];
  
  /**
   * Create a new TileRenderer
   * @param scene The scene this renderer is attached to
   * @param layerManager The layer manager to use
   * @param tileSize The size of tiles in pixels
   * @param tileHeight The height of tiles in pixels
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
   * Creates all tiles for the board
   * @param board The board data with terrain information
   * @param centerX Optional center X position (defaults to screen center)
   * @param centerY Optional center Y position (defaults to screen center) 
   * @returns Array of created tile game objects
   */
  createBoardTiles(
    board: { width: number, height: number, tiles: any[][] },
    centerX?: number, 
    centerY?: number
  ): Phaser.GameObjects.GameObject[] {
    console.log(`TileRenderer: Creating tiles for board: ${board.width}x${board.height}`);
    
    // Clear any existing tiles
    this.clearTiles();
    
    // Use provided center coordinates or default to screen center
    this.setAnchor(centerX ?? this.scene.cameras.main.width / 2, centerY ?? this.scene.cameras.main.height / 2);
    
    // Map terrain types to asset keys
    const terrainSpriteMap: Record<TerrainType, string> = {
      [TerrainType.BEACH]: 'beach',
      [TerrainType.GRASS]: 'grass',
      [TerrainType.WATER]: 'water',
      [TerrainType.MOUNTAIN]: 'mountain',
      [TerrainType.UNDERWATER]: 'underwater',
    };
    
    // Create tiles for each board position
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        // Convert grid position to world coordinates
        const worldPos = CoordinateUtils.gridToWorld(
          x, y, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
        );
        
        // Get terrain type
        const terrain = board.tiles[y]?.[x]?.terrain || TerrainType.GRASS;
        // Create invisible graphics for interactivity
        const tile = this.scene.add.graphics();
        tile.setPosition(worldPos.x, worldPos.y);
        tile.setData('terrainType', terrain);
        this.layerManager.addToLayer('terrain', tile);
        this.tiles.push(tile);
        // Set up interaction properties for the tile (inlined)
        tile.setInteractive(new Phaser.Geom.Polygon(
          CoordinateUtils.createIsoDiamondPoints(this.tileSize, this.tileHeight)
        ), Phaser.Geom.Polygon.Contains);
        tile.setData('gridX', x);
        tile.setData('gridY', y);
        // Add sprite overlay if applicable
        const assetKey = terrainSpriteMap[terrain as TerrainType];
        if (assetKey) {
          const sprite = this.scene.add.sprite(worldPos.x, worldPos.y, assetKey);
          sprite.setOrigin(0.5, 0.5);
          const scale = Math.min(this.tileSize / 192, this.tileHeight / 96);
          sprite.setScale(scale);
          sprite.setDepth(1.5);
          this.layerManager.addToLayer('terrain', sprite);
        }
      }
    }
    
    return [...this.tiles];
  }
  
  /**
   * Update tiles based on new board state
   * @param board The new board state
   */
  updateTiles(board: { width: number, height: number, tiles: any[][] }): void {
    // Clear existing tiles
    this.clearTiles();
    
    // Create new tiles
    this.createBoardTiles(board);
  }
  
  /**
   * Clear all tiles from the board
   * @param destroy Whether to destroy the tile objects
   */
  clearTiles(destroy: boolean = true): void {
    if (destroy) {
      this.tiles.forEach(tile => tile.destroy());
    }
    this.tiles = [];
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    this.clearTiles(true);
  }
} 