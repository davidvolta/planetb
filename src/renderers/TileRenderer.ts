import * as Phaser from "phaser";
import { TerrainType, Biome } from '../store/gameStore';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { BaseRenderer } from './BaseRenderer';
import * as actions from "../store/actions";

/**
 * Responsible for rendering and managing board tiles
 */
export class TileRenderer extends BaseRenderer {
  // Track all created tiles
  private tiles: Phaser.GameObjects.GameObject[] = [];
  
  // Terrain visualization style
  private showBiomeMode: boolean = false;
  
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
   * @param biomeId Optional biome ID for this tile
   * @param biomeColor Optional biome color for visualization
   * @returns The created tile game object
   */
  private createTerrainTile(
    terrain: TerrainType, 
    x: number, 
    y: number,
    biomeId?: string | null,
    biomeColor?: number
  ): Phaser.GameObjects.Graphics {
    // Create a graphics object for the tile
    const tile = this.scene.add.graphics();
    
    // Set the position
    tile.setPosition(x, y);
    
    // Get diamond points for the tile shape
    const diamondPoints = CoordinateUtils.createIsoDiamondPoints(this.tileSize, this.tileHeight);
    
    // Determine coloring based on mode
    let fillColor: number;
    let strokeColor: number;
    
    if (this.showBiomeMode && biomeId && biomeColor) {
      // In biome mode, use the biome color with slightly darker stroke
      fillColor = biomeColor;
      strokeColor = this.darkenColor(biomeColor, 0.7); // 70% brightness for stroke
    } else {
      // In terrain mode, use terrain colors
      const terrainStyle = this.getTerrainStyle(terrain);
      fillColor = terrainStyle.fillColor;
      strokeColor = terrainStyle.strokeColor;
    }
    
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
    
    // Store data on the tile for reference
    tile.setData('terrainType', terrain);
    if (biomeId) {
      tile.setData('biomeId', biomeId);
    }
    
    return tile;
  }
  
  /**
   * Darken a color by a given factor
   * @param color The color to darken
   * @param factor The factor to darken by (0-1, where lower is darker)
   * @returns The darkened color
   */
  private darkenColor(color: number, factor: number): number {
    // Convert color to RGB components
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;
    
    // Darken each component
    const newR = Math.floor(r * factor);
    const newG = Math.floor(g * factor);
    const newB = Math.floor(b * factor);
    
    // Recombine into a color
    return (newR << 16) | (newG << 8) | newB;
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
  
    // Get biome colors using actions instead of directly from registry
    const biomes = actions.getBiomes();
    
    // Track biome sizes if in biome mode
    const biomeSizes = new Map<string, number>();
    
    // Otherwise, just update existing tiles
    let index = 0;
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        if (index < this.tiles.length) {
          const tile = this.tiles[index];
          const currentTerrain = tile.getData('terrainType');
          const currentBiomeId = tile.getData('biomeId');
          
          const newTerrain = board.tiles[y]?.[x]?.terrain || TerrainType.GRASS;
          const newBiomeId = board.tiles[y]?.[x]?.biomeId;
          
          // Count tile for its biome if in biome mode
          if (this.showBiomeMode && newBiomeId) {
            // Increment count for this biome
            biomeSizes.set(newBiomeId, (biomeSizes.get(newBiomeId) || 0) + 1);
          }
          
          // Update if terrain or biome changed or if visualization mode changed
          if (
            currentTerrain !== newTerrain || 
            currentBiomeId !== newBiomeId ||
            tile.getData('visualMode') !== (this.showBiomeMode ? 'biome' : 'terrain')
          ) {
            // Get position
            const worldPos = CoordinateUtils.gridToWorld(
              x, y, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
            );
            
            // Get biome color if available using actions
            let biomeColor: number | undefined;
            if (newBiomeId) {
              const biome = actions.getBiomeById(newBiomeId);
              if (biome) {
                biomeColor = biome.color;
              }
            }
            
            // Create replacement tile
            const newTile = this.createTerrainTile(newTerrain, worldPos.x, worldPos.y, newBiomeId, biomeColor);
            newTile.setData('visualMode', this.showBiomeMode ? 'biome' : 'terrain');
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
   * Clean up and prepare for destruction
   */
  destroy(): void {
    // Clear all existing tiles
    this.clearTiles(true);
    
    // Remove all event listeners
    
    // Clear arrays and properties
    this.tiles = [];
  }
  
  /**
   * Toggle biome visualization mode
   * @param enabled Whether to enable biome visualization
   */
  toggleBiomeMode(enabled: boolean): void {
    if (this.showBiomeMode !== enabled) {
      this.showBiomeMode = enabled;
      
      // Force update all tiles with the new visualization mode
      const board = actions.getBoard();
      if (board) {
        // Update tiles with the new visualization mode
        this.updateTiles(board);
      }
    }
  }
} 