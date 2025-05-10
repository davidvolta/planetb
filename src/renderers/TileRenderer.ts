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
    
    // Create tiles for each board position
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        // Convert grid position to world coordinates
        const worldPos = CoordinateUtils.gridToWorld(
          x, y, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
        );
        
        // Get terrain type and create appropriate tile
        const terrain = board.tiles[y]?.[x]?.terrain || TerrainType.GRASS;
        const tile = this.createTerrainTile(terrain, worldPos.x, worldPos.y);
        
        // Add tile to the terrain layer using the layer manager
        this.layerManager.addToLayer('terrain', tile);
        
        this.tiles.push(tile);
        
        // Add interaction data to the tile
        this.setupTileInteraction(tile, x, y);

        // --- BEACH SPRITE OVERLAY ---
        if (terrain === TerrainType.BEACH) {
          // Add a sprite using the 'beach' asset, centered and scaled
          const sprite = this.scene.add.sprite(worldPos.x, worldPos.y, 'beach');
          // Center the sprite on the tile
          sprite.setOrigin(0.5, 0.5);
          // Scale the sprite to fit tileSize x tileHeight (preserve aspect ratio)
          const nativeWidth = 192;
          const nativeHeight = 96;
          const scaleX = this.tileSize / nativeWidth;
          const scaleY = this.tileHeight / nativeHeight;
          // Use the smaller scale to fit within the tile
          const scale = Math.min(scaleX, scaleY);
          sprite.setScale(scale);
          // Set depth to 1.5 (between ground and units)
          sprite.setDepth(1.5);
          // Add to the terrain layer
          this.layerManager.addToLayer('terrain', sprite);
        }

        // --- GRASS SPRITE OVERLAY ---
        if (terrain === TerrainType.GRASS) {
          // Add a sprite using the 'grass' asset, centered and scaled
          const sprite = this.scene.add.sprite(worldPos.x, worldPos.y, 'grass');
          // Center the sprite on the tile
          sprite.setOrigin(0.5, 0.5);
          // Scale the sprite to fit tileSize x tileHeight (preserve aspect ratio)
          const nativeWidth = 192;
          const nativeHeight = 96;
          const scaleX = this.tileSize / nativeWidth;
          const scaleY = this.tileHeight / nativeHeight;
          // Use the smaller scale to fit within the tile
          const scale = Math.min(scaleX, scaleY);
          sprite.setScale(scale);
          // Set depth to 1.5 (between ground and units)
          sprite.setDepth(1.5);
          // Add to the terrain layer
          this.layerManager.addToLayer('terrain', sprite);
        }

        // --- WATER SPRITE OVERLAY ---
        if (terrain === TerrainType.WATER) {
          // Add a sprite using the 'water' asset, centered and scaled
          const sprite = this.scene.add.sprite(worldPos.x, worldPos.y, 'water');
          // Center the sprite on the tile
          sprite.setOrigin(0.5, 0.5);
          // Scale the sprite to fit tileSize x tileHeight (preserve aspect ratio)
          const nativeWidth = 192;
          const nativeHeight = 96;
          const scaleX = this.tileSize / nativeWidth;
          const scaleY = this.tileHeight / nativeHeight;
          // Use the smaller scale to fit within the tile
          const scale = Math.min(scaleX, scaleY);
          sprite.setScale(scale);
          // Set depth to 1.5 (between ground and units)
          sprite.setDepth(1.5);
          // Add to the terrain layer
          this.layerManager.addToLayer('terrain', sprite);
        }

        // --- MOUNTAIN SPRITE OVERLAY ---
        if (terrain === TerrainType.MOUNTAIN) {
          // Add a sprite using the 'mountain' asset, centered and scaled
          const sprite = this.scene.add.sprite(worldPos.x, worldPos.y, 'mountain');
          sprite.setOrigin(0.5, 0.5);
          const nativeWidth = 192;
          const nativeHeight = 96;
          const scaleX = this.tileSize / nativeWidth;
          const scaleY = this.tileHeight / nativeHeight;
          const scale = Math.min(scaleX, scaleY);
          sprite.setScale(scale);
          sprite.setDepth(1.5);
          this.layerManager.addToLayer('terrain', sprite);
        }
        // --- UNDERWATER SPRITE OVERLAY ---
        if (terrain === TerrainType.UNDERWATER) {
          // Add a sprite using the 'underwater' asset, centered and scaled
          const sprite = this.scene.add.sprite(worldPos.x, worldPos.y, 'underwater');
          sprite.setOrigin(0.5, 0.5);
          const nativeWidth = 192;
          const nativeHeight = 96;
          const scaleX = this.tileSize / nativeWidth;
          const scaleY = this.tileHeight / nativeHeight;
          const scale = Math.min(scaleX, scaleY);
          sprite.setScale(scale);
          sprite.setDepth(1.5);
          this.layerManager.addToLayer('terrain', sprite);
        }
      }
    }
    
    return [...this.tiles];
  }
  
  /**
   * Creates a single terrain tile at the specified position
   * @param terrain The terrain type for this tile
   * @param x World x-coordinate
   * @param y World y-coordinate
   * @returns The created tile game object
   */
  private createTerrainTile(
    terrain: TerrainType, 
    x: number, 
    y: number
  ): Phaser.GameObjects.Graphics {
    // Create a graphics object for the tile
    const tile = this.scene.add.graphics();
    
    // Set the position
    tile.setPosition(x, y);
    
    // Get diamond points for the tile shape
    const diamondPoints = CoordinateUtils.createIsoDiamondPoints(this.tileSize, this.tileHeight);
    
    // Get terrain style
    const terrainStyle = this.getTerrainStyle(terrain);
    
    // Draw the tile
    tile.fillStyle(terrainStyle.fillColor, 1);
    tile.lineStyle(2, terrainStyle.strokeColor, 1);
    tile.beginPath();
    tile.moveTo(diamondPoints[0].x, diamondPoints[0].y);
    diamondPoints.forEach(point => tile.lineTo(point.x, point.y));
    tile.closePath();
    tile.fillPath();
    tile.strokePath();
    
    // Store data on the tile for reference
    tile.setData('terrainType', terrain);
    
    return tile;
  }
  
  /**
   * Get the style for a terrain type
   * @param terrain The terrain type
   * @returns Object containing fill and stroke colors
   */
  private getTerrainStyle(terrain: TerrainType): { fillColor: number, strokeColor: number } {
    switch (terrain) {
      case TerrainType.GRASS:
        return { fillColor: 0x4CAF50, strokeColor: 0x388E3C };
      case TerrainType.WATER:
        return { fillColor: 0x2196F3, strokeColor: 0x1976D2 };
      case TerrainType.BEACH:
        return { fillColor: 0xFFEB3B, strokeColor: 0xFBC02D };
      case TerrainType.MOUNTAIN:
        return { fillColor: 0x795548, strokeColor: 0x5D4037 };
      case TerrainType.UNDERWATER:
        return { fillColor: 0x0288D1, strokeColor: 0x01579B };
      default:
        return { fillColor: 0x9E9E9E, strokeColor: 0x616161 };
    }
  }
  
  /**
   * Set up interaction properties for a tile
   * @param tile The tile game object
   * @param gridX The grid x-coordinate
   * @param gridY The grid y-coordinate
   */
  private setupTileInteraction(
    tile: Phaser.GameObjects.Graphics, 
    gridX: number, 
    gridY: number
  ): void {
    // Make the tile interactive with a diamond hitbox
    tile.setInteractive(new Phaser.Geom.Polygon(
      CoordinateUtils.createIsoDiamondPoints(this.tileSize, this.tileHeight)
    ), Phaser.Geom.Polygon.Contains);
    
    // Store grid coordinates for reference
    tile.setData('gridX', gridX);
    tile.setData('gridY', gridY);
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