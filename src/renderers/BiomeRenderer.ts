import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { BaseRenderer } from './BaseRenderer';
import * as actions from '../store/actions';
import { StateObserver } from '../utils/stateObserver';
import type { Board, Biome, Player } from '../store/gameStore';
import { MAX_LUSHNESS, EGG_PRODUCTION_THRESHOLD } from '../constants/gameConfig';
import BoardScene from '../scene/BoardScene';

/**
 * Responsible for rendering and managing biome graphics
 */
export class BiomeRenderer extends BaseRenderer {
  private outlineGraphics: Phaser.GameObjects.Graphics | null = null;

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
   * Set up state subscriptions for biome rendering
   */
  public setupSubscriptions(): void {
    // Subscribe to biome changes
    StateObserver.subscribe<Map<string, Biome>>(
      'BiomeRenderer.biomes', // Use a unique key
      (state) => state.biomes,
      (biomes, previousBiomes) => {

        if (!biomes) return;

        if (!previousBiomes) {
          // Initial render - render all biomes at once
          const biomesArray = Array.from(biomes.values());
          this.renderBiomes(biomesArray);
          if (this.scene instanceof BoardScene) { // Ensure scene is BoardScene
            const board = actions.getBoard();
            const players = actions.getPlayers();
            const playerId = actions.getActivePlayerId();
            if (board && players.length > 0) {
              // Call renderOutlines directly on this instance
              this.renderOutlines(board, biomes, players, playerId);
            }
          }
        } else {
          // Subsequent updates: handle changes
          for (const [id, biome] of biomes.entries()) {
            const prev = previousBiomes.get(id);
            if (!prev) continue; // Skip new biomes here, handle elsewhere if needed
            const ownerChanged = biome.ownerId !== prev.ownerId;
            const lushnessChanged = biome.totalLushness !== prev.totalLushness;

            if (ownerChanged) {
               if (this.scene instanceof BoardScene) { // Ensure scene is BoardScene
                // Reveal fog on capture
                this.scene.getVisibilityController().revealBiomeTiles(id);

                // Update ownership visuals
                this.updateBiomeOwnership(id);

                // Redraw biome outlines
                const board = actions.getBoard();
                const players = actions.getPlayers();
                const playerId = actions.getActivePlayerId();
                if (board && players.length > 0) {
                  // Call renderOutlines directly on this instance
                  this.renderOutlines(board, biomes, players, playerId);
                }
              }
            } else if (lushnessChanged) {
              // Only update visuals if lushness changed, but not owner
              this.updateBiomeOwnership(id);
            }
          }
        }
      },
      {
        immediate: true,
        debug: false,
        // Only trigger when ownerId or totalLushness changes
        equalityFn: <S>(a: S, b: S): boolean => {
          const mapA = a as Map<string, Biome>;
          const mapB = b as Map<string, Biome>;
          if (mapA.size !== mapB.size) return false;
          for (const [id, biomeA] of mapA.entries()) {
            const biomeB = mapB.get(id);
            if (!biomeB) return false;
            if (biomeA.ownerId !== biomeB.ownerId || biomeA.totalLushness !== biomeB.totalLushness) {
              return false;
            }
          }
          return true;
        }
      }
    );
  }
  
  /**
   * Render all biomes based on the provided biome data
   * @param biomes Array of biome objects to render
   */
  renderBiomes(biomes: Biome[]): void {
    const staticLayer = this.layerManager.getStaticObjectsLayer();
    const board = actions.getBoard();
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
      const players = actions.getPlayers();
      const biome = actions.getBiomes().get(biomeId);
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
    const biome = biomeId ? actions.getBiomes().get(biomeId) : undefined;
    const activePlayerId = actions.getActivePlayerId();
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
    const biome = actions.getBiomes().get(biomeId);
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

  /**
   * Render outlines for biomes
   * @param board The game board
   * @param biomes Map of biomes
   * @param players Array of players
   * @param activePlayerId ID of the active player
   */
  public renderOutlines(
    board: Board,
    biomes: Map<string, Biome>,
    players: Player[],
    activePlayerId: number
  ): void {
    this.clearOutlines();
  
    const player = players.find(p => p.id === activePlayerId);
    if (!player || !player.color) return;
  
    const color = parseInt(player.color.replace('#', ''), 16);
    if (!this.outlineGraphics) {
      this.outlineGraphics = this.scene.add.graphics();
      this.outlineGraphics.setDepth(5);
    }
    this.outlineGraphics.clear();
    this.outlineGraphics.lineStyle(1, color, 1); //0xffffff
  
    const drawnEdges = new Set<string>();
  
    for (const [biomeId, biome] of biomes.entries()) {
      if (biome.ownerId !== activePlayerId) continue;
  
      for (let y = 0; y < board.height; y++) {
        for (let x = 0; x < board.width; x++) {
          const tile = board.tiles[y][x];
          if (tile.biomeId !== biomeId) continue;
  
          const verts = this.getDiamondVertices(x, y);
  
          const directions = [
            { dx: 0, dy: -1, a: 0, b: 1 }, // top edge (connect top → right)
            { dx: 1, dy: 0, a: 1, b: 2 },  // right edge (right → bottom)
            { dx: 0, dy: 1, a: 2, b: 3 },  // bottom edge (bottom → left)
            { dx: -1, dy: 0, a: 3, b: 0 }, // left edge (left → top)
          ];
           
  
          for (const { dx, dy, a, b } of directions) {
            const nx = x + dx;
            const ny = y + dy;
            const neighbor = board.tiles[ny]?.[nx];
            const neighborBiome = neighbor?.biomeId ? biomes.get(neighbor.biomeId) : null;
  
            const sameOwner = neighborBiome?.ownerId === activePlayerId;
            if (sameOwner) continue;
  
            const p1 = verts[a];
            const p2 = verts[b];
            const key = this.normalizeEdgeKey(p1, p2);
  
            if (!drawnEdges.has(key)) {
              drawnEdges.add(key);
              this.drawDashedLine(p1.x, p1.y, p2.x, p2.y, 3, 2);
            }
          }
        }
      }
    }
  }

  private clearOutlines(): void {
    this.outlineGraphics?.clear();
  }

  private getDiamondVertices(x: number, y: number): Phaser.Math.Vector2[] {
    const cx = (x - y) * (this.tileSize / 2) + this.anchorX;
    const cy = (x + y) * (this.tileHeight / 2) + this.anchorY;
    return [
      new Phaser.Math.Vector2(cx, cy - this.tileHeight / 2), // top
      new Phaser.Math.Vector2(cx + this.tileSize / 2, cy),   // right
      new Phaser.Math.Vector2(cx, cy + this.tileHeight / 2), // bottom
      new Phaser.Math.Vector2(cx - this.tileSize / 2, cy),   // left
    ];
  }

  private normalizeEdgeKey(p1: Phaser.Math.Vector2, p2: Phaser.Math.Vector2): string {
    // Ensures same key for both directions
    if (p1.y < p2.y || (p1.y === p2.y && p1.x < p2.x)) {
      return `${p1.x},${p1.y}:${p2.x},${p2.y}`;
    } else {
      return `${p2.x},${p2.y}:${p1.x},${p1.y}`;
    }
  }

  private drawDashedLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    dashLength: number,
    gapLength: number
  ) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const steps = Math.floor(length / (dashLength + gapLength));

    for (let i = 0; i < steps; i++) {
      const start = i * (dashLength + gapLength);
      const end = start + dashLength;

      const sx = x1 + Math.cos(angle) * start;
      const sy = y1 + Math.sin(angle) * start;
      const ex = x1 + Math.cos(angle) * Math.min(end, length);
      const ey = y1 + Math.sin(angle) * Math.min(end, length);

      this.outlineGraphics!.beginPath();
      this.outlineGraphics!.moveTo(sx, sy);
      this.outlineGraphics!.lineTo(ex, ey);
      this.outlineGraphics!.strokePath();
    }
  }
} 