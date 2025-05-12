import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { ResourceType } from '../types/gameTypes';
import { BaseRenderer } from './BaseRenderer';
import * as actions from '../store/actions';
import { StateObserver } from '../utils/stateObserver';

/**
 * Responsible for rendering and managing resource graphics
 */
export class ResourceRenderer extends BaseRenderer {
  private resourceScale: number = 0.3333;

  
  /**
   * Creates a new ResourceRenderer
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
   * Set up state subscriptions for resource rendering
   */
   public setupSubscriptions(): void {
    StateObserver.subscribe(
      'ResourceRenderer.resources',
      (state) => state.resources,
      (resourcesRecord, prevRecord) => {
        console.log('[ResourceRenderer] subscription fired');
        if (!resourcesRecord) return;

        const currentResources = Object.values(resourcesRecord);
        const prevResources = prevRecord ? Object.values(prevRecord) : null;

        if (!prevResources) {
          this.renderResources(currentResources);
        } else if (this.haveResourcesChanged(currentResources, prevResources)) {
          this.renderResources(currentResources);
          actions.selectResourceTile(null);
        }
      },
      { immediate: false, debug: false }
    );
  }
  /**
   * Render resources directly from Resource list (new architecture)
   */
  public renderResources(resources: import('../store/gameStore').Resource[]): void {
    if (resources.length === 0) return;

    const staticObjectsLayer = this.layerManager.getStaticObjectsLayer();
    if (!staticObjectsLayer) {
      console.warn("Cannot render resource graphics - staticObjectsLayer not available");
      return;
    }

    // Map of existing sprites keyed by grid position
    const existingSprites = new Map<string, { sprite: Phaser.GameObjects.Sprite; used: boolean }>();
    staticObjectsLayer.getAll().forEach(child => {
      if (child instanceof Phaser.GameObjects.Sprite && child.getData('resourceType')) {
        const gx = child.getData('gridX');
        const gy = child.getData('gridY');
        if (gx !== undefined && gy !== undefined) {
          existingSprites.set(`${gx},${gy}`, { sprite: child, used: false });
        }
      }
    });

    // Update or create sprites for each resource
    resources.forEach(r => {
      const { x, y } = r.position;
      const key = `${x},${y}`;
      const world = CoordinateUtils.gridToWorld(x, y, this.tileSize, this.tileHeight, this.anchorX, this.anchorY);
      const textureKey = this.getTextureKeyForResourceType(r.type);
      const opacity = r.value / 10;

      const existing = existingSprites.get(key);
      if (existing) {
        existing.used = true;
        existing.sprite.setPosition(world.x, world.y);
        existing.sprite.setAlpha(opacity);
        if (existing.sprite.texture.key !== textureKey) {
          existing.sprite.setTexture(textureKey);
          existing.sprite.setTint(0x222222);
        }
        existing.sprite.setData('active', r.active);
      } else {
        const sprite = this.scene.add.sprite(world.x, world.y, textureKey);
        sprite.setScale(this.resourceScale);
        sprite.setAlpha(opacity);
        sprite.setTint(0xaaaaaa);
        sprite.setData('gridX', x);
        sprite.setData('gridY', y);
        sprite.setData('resourceType', r.type);
        sprite.setData('active', r.active);
        this.layerManager.addToLayer('staticObjects', sprite);
      }
    });

    // Remove sprites that are no longer relevant
    existingSprites.forEach(({ sprite, used }) => {
      if (!used) sprite.destroy();
    });
  }
  
  /**
   * Clear all resources
   */
  clearResources(): void {
    const staticObjectsLayer = this.layerManager.getStaticObjectsLayer();
    if (!staticObjectsLayer) return;
    
    staticObjectsLayer.getAll().forEach(child => {
      if (child instanceof Phaser.GameObjects.Sprite && 
          child.getData('resourceType')) {
        child.destroy();
      }
    });
  }
  
  /**
   * Clean up resources when destroying the renderer
   */
  override destroy(): void {
    super.destroy();
    this.clearResources();
  }
  
  /**
   * Get the appropriate texture key for a resource type
   * @param resourceType The type of resource
   * @returns The texture key to use for this resource type
   */
  private getTextureKeyForResourceType(resourceType: ResourceType): string {
    switch (resourceType) {
      case ResourceType.FOREST:
        return 'forest';
      case ResourceType.KELP:
        return 'kelp';
      case ResourceType.INSECTS:
        return 'insects';
      case ResourceType.PLANKTON:
        return 'plankton';
      default:
        console.warn(`Unknown resource type: ${resourceType}, falling back to forest`);
        return 'forest';
    }
  }

  private haveResourcesChanged(currentResources: import('../store/gameStore').Resource[], previousResources: import('../store/gameStore').Resource[]): boolean {
    // Quick check for different number of resources
    if (currentResources.length !== previousResources.length) {
      return true;
    }
    
    // Create maps for quick lookup
    const previousMap = new Map();
    for (const resource of previousResources) {
      const key = `${resource.position.x},${resource.position.y}`;
      previousMap.set(key, resource);
    }
    
    // Check for any changes in resource properties
    for (const resource of currentResources) {
      const key = `${resource.position.x},${resource.position.y}`;
      const prevResource = previousMap.get(key);
      
      // If resource doesn't exist in previous data or has different properties
      if (!prevResource || 
          resource.type !== prevResource.type ||
          resource.value !== prevResource.value || 
          resource.active !== prevResource.active) {
        return true;
      }
    }
    
    return false;
  }
} 