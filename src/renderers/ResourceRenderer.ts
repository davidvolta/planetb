import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { ResourceType } from '../types/gameTypes';
import type { Resource } from '../store/gameStore';
import { BaseRenderer } from './BaseRenderer';

/**
 * Responsible for rendering and managing resource graphics
 */
export class ResourceRenderer extends BaseRenderer {
  private resourceScale: number = 0.3333;

  constructor(
    scene: Phaser.Scene,
    layerManager: LayerManager,
    tileSize: number,
    tileHeight: number
  ) {
    super(scene, layerManager, tileSize, tileHeight);
  }

  /**
   * Render resources using a filtered array from getPlayerView().resources
   */
  public renderResources(resources: Resource[]): void {
    const staticObjectsLayer = this.layerManager.getStaticObjectsLayer();
    if (!staticObjectsLayer) {
      console.warn("Cannot render resources - staticObjectsLayer missing");
      return;
    }

    // Map of existing sprites by grid key
    const existingSprites = new Map<string, { sprite: Phaser.GameObjects.Sprite, used: boolean }>();
    staticObjectsLayer.getAll().forEach(child => {
      if (child instanceof Phaser.GameObjects.Sprite && child.getData('resourceType')) {
        const gx = child.getData('gridX');
        const gy = child.getData('gridY');
        if (gx !== undefined && gy !== undefined) {
          existingSprites.set(`${gx},${gy}`, { sprite: child, used: false });
        }
      }
    });

    resources.forEach(resource => {
      const { x, y } = resource.position;
      const key = `${x},${y}`;
      const world = CoordinateUtils.gridToWorld(x, y, this.tileSize, this.tileHeight, this.anchorX, this.anchorY);
      const opacity = resource.value / 10;
      const textureKey = this.getTextureKeyForResourceType(resource.type);

      const existing = existingSprites.get(key);
      if (existing) {
        existing.used = true;
        existing.sprite.setPosition(world.x, world.y);
        existing.sprite.setAlpha(opacity);
        if (existing.sprite.texture.key !== textureKey) {
          existing.sprite.setTexture(textureKey);
          existing.sprite.setTint(0x222222);
        }
        existing.sprite.setData('active', resource.active);
      } else {
        const sprite = this.scene.add.sprite(world.x, world.y, textureKey);
        sprite.setScale(this.resourceScale);
        sprite.setAlpha(opacity);
        sprite.setTint(0xaaaaaa);
        sprite.setData('gridX', x);
        sprite.setData('gridY', y);
        sprite.setData('resourceType', resource.type);
        sprite.setData('active', resource.active);
        this.layerManager.addToLayer('staticObjects', sprite);
      }
    });

    // Remove any unused sprites
    existingSprites.forEach(({ sprite, used }) => {
      if (!used) sprite.destroy();
    });
  }

  /**
   * Clear all resource sprites
   */
  public clearResources(): void {
    const staticObjectsLayer = this.layerManager.getStaticObjectsLayer();
    if (!staticObjectsLayer) return;
    staticObjectsLayer.getAll().forEach(child => {
      if (child instanceof Phaser.GameObjects.Sprite && child.getData('resourceType')) {
        child.destroy();
      }
    });
  }

  override destroy(): void {
    super.destroy();
    this.clearResources();
  }

  private getTextureKeyForResourceType(type: ResourceType): string {
    switch (type) {
      case ResourceType.FOREST: return 'forest';
      case ResourceType.KELP: return 'kelp';
      case ResourceType.INSECTS: return 'insects';
      case ResourceType.PLANKTON: return 'plankton';
      default:
        console.warn(`Unknown resource type: ${type}`);
        return 'forest';
    }
  }
}
