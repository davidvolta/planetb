import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { Egg } from '../store/gameStore';
import { BaseRenderer } from './BaseRenderer';
import { computeDepth } from '../utils/DepthUtils';

/**
 * Responsible for rendering and managing egg sprites
 */
export class EggRenderer extends BaseRenderer {
  private eggSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private verticalOffset: number = -12;

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
    this.clearEggs();

    const eggsLayer = this.layerManager.getEggsLayer();
    if (!eggsLayer) {
      console.warn("Cannot render eggs - eggs layer not available");
      return;
    }

    for (const egg of eggs) {
      const { id, position } = egg;
      const { x, y } = position;
      const worldPos = CoordinateUtils.gridToWorld(
        x, y, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
      );
      const worldX = worldPos.x;
      const worldY = worldPos.y + this.verticalOffset;
      const sprite = this.scene.add.sprite(worldX, worldY, 'egg');
      sprite.setOrigin(0.5, 1);
      sprite.setScale(0.3333);
      // Depth matches active unit logic
      sprite.setDepth(computeDepth(x, y, true));

      sprite.setData('eggId', id);
      sprite.setData('gridX', x);
      sprite.setData('gridY', y);

      this.layerManager.addToLayer('eggs', sprite);
      this.eggSprites.set(id, sprite);
    }
  }

  /**
   * Clean up resources when destroying this renderer
   */
  override destroy(): void {
    this.clearEggs();
    super.destroy();
  }
} 