import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { BaseRenderer } from './BaseRenderer';
import { getBoard, getBiomes, getPlayers, getActivePlayerId } from '../store/actions';
import type { Biome } from '../store/gameStore';
import { MAX_LUSHNESS, EGG_PRODUCTION_THRESHOLD } from '../constants/gameConfig';

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

    // --- LUSHNESS BAR (only for owned biomes and only for active player) ---
    const biome = biomeId ? getBiomes().get(biomeId) : undefined;
    const activePlayerId = getActivePlayerId();
    const isPlayersBiome = biome && biome.ownerId === activePlayerId;

    if (isCaptured && isPlayersBiome) {
      // Bar dimensions
      const barWidth = this.tileSize * 0.8; // 80% of tile width
      const barHeight = 5; // 5px height
      const barX = 0 - barWidth / 2;
      const barY = this.tileHeight * 0.5 - barHeight - 2; // bottom of diamond, with small padding

      // Round lushness to one decimal place for all calculations
      const roundedLushness = Number(lushness.toFixed(1));

      // Color interpolation: 0-5 solid red, 5-MAX_LUSHNESS red to green, >MAX_LUSHNESS stays green
      function getLushnessColor(value: number): number {
        if (value <= 5) {
          // Solid bright red
          return 0xFF0000;
        } else if (value <= MAX_LUSHNESS) {
          // Highly saturated gradient: red -> yellow -> green
          const midpoint = 5 + (MAX_LUSHNESS - 5) / 2;
          if (value <= midpoint) {
            // Red (#FF0000) to Yellow (#FFFF00)
            const t = (value - 5) / (midpoint - 5);
            const r = 255;
            const g = Math.round(255 * t);
            const b = 0;
            return (r << 16) | (g << 8) | b;
          } else {
            // Yellow (#FFFF00) to Green (#00FF00)
            const t = (value - midpoint) / (MAX_LUSHNESS - midpoint);
            const r = Math.round(255 * (1 - t));
            const g = 255;
            const b = 0;
            return (r << 16) | (g << 8) | b;
          }
        } else {
          // Above MAX_LUSHNESS: bright green (pulse will be applied)
          return 0x00FF00;
        }
      }

      // Draw bar background (gray)
      const barBg = this.scene.add.graphics();
      barBg.fillStyle(0x222222, 0.7);
      barBg.fillRoundedRect(barX, barY, barWidth, barHeight, 2);
      container.add(barBg);

      // Draw bar fill
      const barFill = this.scene.add.graphics();
      const barColor = getLushnessColor(roundedLushness);
      const fillPercent = Math.max(0, Math.min(1, roundedLushness / 10));
      const fillWidth = barWidth * fillPercent;
      barFill.fillStyle(barColor, 1);
      barFill.fillRoundedRect(barX, barY, fillWidth, barHeight, 2);
      container.add(barFill);

      // Draw white stroke if roundedLushness >= EGG_PRODUCTION_THRESHOLD
      if (roundedLushness >= EGG_PRODUCTION_THRESHOLD) {
        const barStroke = this.scene.add.graphics();
        barStroke.lineStyle(1, 0xFFFFFF, 1);
        barStroke.strokeRoundedRect(barX, barY, barWidth, barHeight, 2);
        container.add(barStroke);
      }

      // Pulse effect if roundedLushness > MAX_LUSHNESS and it's the player's turn
      const isPlayersTurn = isPlayersBiome;
      if (roundedLushness > MAX_LUSHNESS && isPlayersTurn) {
        // Animate a pulse value and redraw the bar with interpolated color
        const pulseObj = { t: 0 };
        this.scene.tweens.add({
          targets: pulseObj,
          t: 1,
          duration: 900, // fast pulse
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          onUpdate: () => {
            // Interpolate between #00FF00 and #00CE00
            // #00FF00 (0,255,0) to #00CE00 (0,206,0)
            const r = 0;
            const g = Math.round(255 * (1 - pulseObj.t) + 206 * pulseObj.t);
            const b = 0;
            const color = (r << 16) | (g << 8) | b;
            barFill.clear();
            barFill.fillStyle(color, 1);
            barFill.fillRoundedRect(barX, barY, fillWidth, barHeight, 2);
          }
        });
      }
    }

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