import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { BaseRenderer } from './BaseRenderer';
import { getBoard, getBiomes, getPlayers } from '../store/actions';
import type { Biome } from '../store/gameStore';

/**
 * Responsible for rendering and managing biome graphics
 */
export class BiomeRenderer extends BaseRenderer {
  /**
   * Creates a new BiomeRenderer
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
   * Render all biomes based on the provided biome data
   * @param biomes Array of biome objects to render
   */
  renderBiomes(biomes: Biome[]): void {
    const staticLayer = this.layerManager.getStaticObjectsLayer();
    const board = getBoard();
    if (!staticLayer || !board) {
      console.warn("Cannot render biomes - missing layer or board");
      return;
    }

    this.clearBiomeGraphics();

    // Filter and place only biomes with valid positions
    const validBiomes = biomes
      .filter(b => !!b.habitat?.position)
      .map(b => ({
        id: b.id,
        x: b.habitat!.position.x,
        y: b.habitat!.position.y,
        isCaptured: b.ownerId !== null,
        lushness: b.totalLushness || 0
      }))
      .filter(({ x, y }) => x >= 0 && x < board.width && y >= 0 && y < board.height);

    validBiomes.forEach(({ id, x, y, isCaptured, lushness }) => {
      this.drawBiome(id, x, y, isCaptured, lushness);
    });
  }
  
  /**
   * Create a biome graphic based on its biome ownership
   * @param gridX Grid X coordinate (not world coordinate)
   * @param gridY Grid Y coordinate (not world coordinate)
   * @param isCaptured Whether the biome is captured (has an owner)
   * @param lushness The lushness value of the biome (0-10)
   * @param biomeId ID of the biome
   * @returns A container with the biome graphic
   */
  private createBiomeGraphic(gridX: number, gridY: number, isCaptured: boolean, lushness: number, biomeId?: string): Phaser.GameObjects.Container {
    // Convert grid coordinates to world coordinates
    const worldPosition = CoordinateUtils.gridToWorld(
      gridX, gridY, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
    );
    
    // Create a container for the biome at the world position
    const container = this.scene.add.container(worldPosition.x, worldPosition.y);
    const graphics = this.scene.add.graphics();
    
    // Calculate scale factor (approximately 5px smaller on each side)
    const scaleFactor = 0.85; // This will make the diamond about 5px smaller on a 64px tile
    
    // Create scaled diamond points using utility
    const diamondPoints = CoordinateUtils.createIsoDiamondPoints(
      this.tileSize,
      this.tileHeight,
      scaleFactor
    );
    
    // Choose color based on biome ownership
    if (isCaptured) {
      // Black for captured biomes (owned biomes)
      graphics.fillStyle(0x000000, 0.7);
    } else {
      // Black for uncaptured biomes (unowned biomes)
      graphics.fillStyle(0x000000, 0.5);
      
      // Add pulsing effect for uncaptured biomes
      this.scene.tweens.add({
        targets: graphics,
        alpha: { from: 0.5, to: 0.2 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
    
    // Draw the filled shape
    graphics.beginPath();
    graphics.moveTo(diamondPoints[0].x, diamondPoints[0].y);
    for (let i = 1; i < diamondPoints.length; i++) {
      graphics.lineTo(diamondPoints[i].x, diamondPoints[i].y);
    }
    graphics.closePath();
    graphics.fillPath();
    
    // --- PLAYER COLOR STROKE FOR OWNED HABITATS ---
    if (isCaptured && biomeId !== undefined) {
      // Get the player color from the game state
      const players = getPlayers();
      const biome = getBiomes().get(biomeId);
      const ownerId = biome?.ownerId;
      const player = players.find(p => p.id === ownerId);
      if (player && player.color) {
        // Convert hex color string to number
        const colorNum = parseInt(player.color.replace('#', ''), 16);
        graphics.lineStyle(1, colorNum, 1);
        graphics.beginPath();
        graphics.moveTo(diamondPoints[0].x, diamondPoints[0].y);
        for (let i = 1; i < diamondPoints.length; i++) {
          graphics.lineTo(diamondPoints[i].x, diamondPoints[i].y);
        }
        graphics.closePath();
        graphics.strokePath();
      }
    }
    
    // Add the graphics to the container
    container.add(graphics);
    
    // Format the lushness value to show one decimal place
    const lushnessDisplay = lushness.toFixed(1);
    
    // Determine text color based on lushness threshold (green if >= 7.0, red otherwise)
    const textColor = lushness >= 7.0 ? '#00FF00' : '#FF0000';
    
    // Create text to display lushness value
    const lushnessText = this.scene.add.text(0, 0, lushnessDisplay, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: textColor,
      stroke: '#000000',
      strokeThickness: 2
    });
    
    // Center the text on the biome
    lushnessText.setOrigin(0.5, 0.5);
    
    // Add the text to the container
    container.add(lushnessText);
    
    return container;
  }
  
  /**
   * Clean up resources when destroying this renderer
   */
  destroy(): void {
    super.destroy();
    // Clear all biome graphics from the static objects layer
    this.layerManager.clearLayer('staticObjects', true);
  }

  /**
   * Updates only the ownership state of a specific biome
   * More efficient than re-rendering all biomes when only one changes
   * @param biomeId ID of the biome whose ownership changed
   */
  updateBiomeOwnership(biomeId: string): void {
    const layer = this.layerManager.getStaticObjectsLayer();
    const biome = getBiomes().get(biomeId);
    if (!layer || !biome) return;

    // Find and replace the existing biome graphic
    const existing = layer.getAll().find(obj => obj.getData('biomeId') === biomeId);
    if (!existing) return;

    const x = existing.getData('gridX');
    const y = existing.getData('gridY');
    existing.destroy();

    this.drawBiome(biomeId, x, y, biome.ownerId !== null, biome.totalLushness || 0);
  }

  /**
   * Remove only biome graphics, leaving other static objects untouched
   */
  private clearBiomeGraphics(): void {
    const layer = this.layerManager.getStaticObjectsLayer();
    if (!layer) return;
    layer.getAll().forEach(go => {
      if (go.getData('biomeId')) {
        go.destroy();
      }
    });
  }

  /**
   * Render a single biome with its properties
   */
  private drawBiome(id: string, x: number, y: number, isCaptured: boolean, lushness: number): void {
    const graphic = this.createBiomeGraphic(x, y, isCaptured, lushness, id);
    graphic.setData('biomeId', id);
    graphic.setData('gridX', x);
    graphic.setData('gridY', y);
    graphic.setData('isCaptured', isCaptured);
    graphic.setData('lushness', lushness);
    this.layerManager.addToLayer('staticObjects', graphic);
  }
} 