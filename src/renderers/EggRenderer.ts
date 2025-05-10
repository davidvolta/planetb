import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { Egg } from '../store/gameStore';
import { BaseRenderer } from './BaseRenderer';
import { computeDepth } from '../utils/DepthUtils';

/**
 * Responsible for rendering and managing egg sprites
 */
export class EggRenderer extends BaseRenderer {
  private eggSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private verticalOffset: number = 12;

  /**
   * Clear all egg sprites
   */
  public clearEggs(): void {
    this.eggSprites.forEach(sprite => sprite.destroy());
    this.eggSprites.clear();
  }

  /**
   * Render all eggs based on the provided egg data
   * @param eggs Array of egg objects from the game state
   */
  public renderEggs(eggs: Egg[]): void {
    const eggsLayer = this.layerManager.getEggsLayer();
    if (!eggsLayer) {
      console.warn("Cannot render eggs - eggs layer not available");
      return;
    }

    const usedIds = new Set<string>();

    for (const egg of eggs) {
      const { id, position } = egg;
      const { x, y } = position;
      const worldPos = CoordinateUtils.gridToWorld(
        x, y, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
      );
      const worldX = worldPos.x;
      const worldY = worldPos.y + this.verticalOffset;

      const existing = this.eggSprites.get(id);
      if (existing) {
        // Update position only if needed
        const prevX = existing.getData('gridX');
        const prevY = existing.getData('gridY');
        if (prevX !== x || prevY !== y) {
          existing.setPosition(worldX, worldY);
          existing.setDepth(computeDepth(x, y, true));
          existing.setData('gridX', x);
          existing.setData('gridY', y);
        }

        this.layerManager.removeFromLayer('eggs', existing);
        this.layerManager.addToLayer('eggs', existing);

        usedIds.add(id);
      } else {
        const sprite = this.scene.add.sprite(worldX, worldY, 'egg');
        sprite.setOrigin(0.5, 1);
        sprite.setScale(0.3333);
        sprite.setDepth(computeDepth(x, y, true));
        sprite.setData('eggId', id);
        sprite.setData('gridX', x);
        sprite.setData('gridY', y);

        this.layerManager.addToLayer('eggs', sprite);
        this.eggSprites.set(id, sprite);
        usedIds.add(id);
      }
    }

    // Remove any eggs that no longer exist
    this.eggSprites.forEach((sprite, id) => {
      if (!usedIds.has(id)) {
        sprite.destroy();
        this.eggSprites.delete(id);
      }
    });
  }

  /**
   * Clean up resources when destroying this renderer
   */
  override destroy(): void {
    this.clearEggs();
    super.destroy();
  }
} 