import Phaser from 'phaser';
import { TerrainType } from '../../../store/gameStore';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';

/**
 * Responsible for rendering and managing board tiles
 */
export class TileRenderer {
  // Reference to the scene
  private scene: Phaser.Scene;
  
  // Reference to the layer manager
  private layerManager: LayerManager;
  
  // Store fixed size properties for tiles
  private tileSize: number;
  private tileHeight: number;
  
  // Store anchor coordinates for the grid origin
  private anchorX: number;
  private anchorY: number;
  
  // Track all created tiles
  private tiles: Phaser.GameObjects.GameObject[] = [];
  
  /**
   * Creates a new TileRenderer
   * @param scene The parent scene
   * @param layerManager Layer manager for organizing tile display
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
    
    // Initialize anchors to center of the game width/height or use defaults
    // Don't access cameras during construction as they're not initialized yet
    this.anchorX = 0;
    this.anchorY = 0;
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
    this.anchorX = centerX ?? this.scene.cameras.main.width / 2;
    this.anchorY = centerY ?? this.scene.cameras.main.height / 2;
    
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
    
    // Get color and style based on terrain type
    const { fillColor, strokeColor } = this.getTerrainStyle(terrain);
    
    // Draw the tile - diamond shape for isometric view
    const diamondPoints = CoordinateUtils.createIsoDiamondPoints(this.tileSize, this.tileHeight);
    
    // Draw filled shape with outline
    tile.fillStyle(fillColor, 1);
    tile.lineStyle(1, strokeColor, 1);
    
    tile.beginPath();
    tile.moveTo(diamondPoints[0].x, diamondPoints[0].y);
    
    for (let i = 1; i < diamondPoints.length; i++) {
      tile.lineTo(diamondPoints[i].x, diamondPoints[i].y);
    }
    
    tile.closePath();
    tile.fillPath();
    tile.strokePath();
    
    // Store terrain type on the tile for reference
    tile.setData('terrainType', terrain);
    
    return tile;
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
    tile.setInteractive(new Phaser.Geom.Polygon([
      { x: 0, y: -this.tileHeight / 2 },
      { x: this.tileSize / 2, y: 0 },
      { x: 0, y: this.tileHeight / 2 },
      { x: -this.tileSize / 2, y: 0 }
    ]), Phaser.Geom.Polygon.Contains);
    
    // Store grid coordinates on the tile for reference
    tile.setData('gridX', gridX);
    tile.setData('gridY', gridY);
  }
  
  /**
   * Get color and style properties for a terrain type
   * @param terrain The terrain type
   * @returns Object with fill and stroke colors
   */
  private getTerrainStyle(terrain: TerrainType): { fillColor: number, strokeColor: number } {
    switch (terrain) {
      case TerrainType.WATER:
        return { fillColor: 0x3498db, strokeColor: 0x2980b9 };
      
      case TerrainType.MOUNTAIN:
        return { fillColor: 0x7f8c8d, strokeColor: 0x6c7a89 };
      
      case TerrainType.BEACH:
        return { fillColor: 0xf1c40f, strokeColor: 0xf39c12 };
      
      case TerrainType.UNDERWATER:
        return { fillColor: 0x2980b9, strokeColor: 0x1a5276 };
      
      case TerrainType.GRASS:
      default:
        return { fillColor: 0x2ecc71, strokeColor: 0x27ae60 };
    }
  }
  
  /**
   * Updates tile information without recreating them
   * @param board Updated board data
   */
  updateTiles(board: { width: number, height: number, tiles: any[][] }): void {
    // If board dimensions have changed, recreate all tiles
    if (
      board.width * board.height !== this.tiles.length ||
      this.tiles.length === 0
    ) {
      this.createBoardTiles(board);
      return;
    }
    
    // Otherwise, just update existing tiles
    let index = 0;
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        if (index < this.tiles.length) {
          const tile = this.tiles[index];
          const currentTerrain = tile.getData('terrainType');
          const newTerrain = board.tiles[y]?.[x]?.terrain || TerrainType.GRASS;
          
          // Only update if terrain has changed
          if (currentTerrain !== newTerrain) {
            // Get position
            const worldPos = CoordinateUtils.gridToWorld(
              x, y, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
            );
            
            // Create replacement tile
            const newTile = this.createTerrainTile(newTerrain, worldPos.x, worldPos.y);
            this.setupTileInteraction(newTile, x, y);
            
            // Replace in layer
            this.layerManager.removeFromLayer('terrain', tile, true);
            this.layerManager.addToLayer('terrain', newTile);
            
            // Update tiles array
            this.tiles[index] = newTile;
          }
        }
        index++;
      }
    }
  }
  
  /**
   * Clears all tiles
   * @param destroy Whether to destroy the tile objects
   */
  clearTiles(destroy: boolean = true): void {
    // Clear all tiles from the terrain layer
    this.layerManager.clearLayer('terrain', destroy);
    
    // Clear the tiles array
    this.tiles = [];
  }
  
  /**
   * Gets all created tiles
   * @returns Array of tile game objects
   */
  getTiles(): Phaser.GameObjects.GameObject[] {
    return [...this.tiles];
  }
  
  /**
   * Gets the size properties used for tile rendering
   * @returns Object with tile size and height
   */
  getTileSize(): { tileSize: number, tileHeight: number } {
    return {
      tileSize: this.tileSize,
      tileHeight: this.tileHeight
    };
  }
  
  /**
   * Gets the grid anchor position
   * @returns Object with anchor X and Y coordinates
   */
  getAnchorPosition(): { anchorX: number, anchorY: number } {
    return {
      anchorX: this.anchorX,
      anchorY: this.anchorY
    };
  }
} 