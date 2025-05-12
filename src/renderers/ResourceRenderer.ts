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
   * Render all resources based on tiles with resource properties
   * @param resourceTiles Array of tiles that have active resources
   */
  renderResourceTiles(resourceTiles: { tile: any, x: number, y: number }[]): void {
    // Check if staticObjectsLayer exists before proceeding
    const staticObjectsLayer = this.layerManager.getStaticObjectsLayer();
    if (!staticObjectsLayer) {
      console.warn("Cannot render resource graphics - staticObjectsLayer not available");
      return;
    }
    
    // Clear any existing inactive resource indicators
    staticObjectsLayer.getAll().forEach(child => {
      if (child instanceof Phaser.GameObjects.Graphics && 
          child.getData('inactiveResourceMarker')) {
        child.destroy();
      }
    });
    
    // Get a map of current resource sprites by position (since we don't have resource IDs anymore)
    const existingResourceSprites = new Map();
    staticObjectsLayer.getAll().forEach(child => {
      if (child instanceof Phaser.GameObjects.Sprite && child.getData('resourceType')) {
        const gridX = child.getData('gridX');
        const gridY = child.getData('gridY');
        if (gridX !== undefined && gridY !== undefined) {
          const key = `${gridX},${gridY}`;
          existingResourceSprites.set(key, {
            sprite: child,
            used: false
          });
        }
      }
    });
    
    // Process each resource tile - create new sprites or update existing ones
    resourceTiles.forEach(({ tile, x, y }) => {
      // Calculate world position
      const worldPosition = CoordinateUtils.gridToWorld(
        x, y, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
      );
      
      const worldX = worldPosition.x;
      const worldY = worldPosition.y;
      
      // Generate a unique key for this position
      const key = `${x},${y}`;
      
      // Determine the texture based on resource type
      const textureKey = this.getTextureKeyForResourceType(tile.resourceType);
      
      // Set opacity based on resource value (0-10 scale)
      const opacity = tile.resourceValue / 10;
      
      // Check if we have an existing sprite at this position
      const existing = existingResourceSprites.get(key);
      
      if (existing) {
        // Mark as used so we don't delete it later
        existing.used = true;
        
        // Update position (shouldn't need this, but just to be safe)
        existing.sprite.setPosition(worldX, worldY);
        
        // Update opacity based on resource value
        existing.sprite.setAlpha(opacity);
        
        // Update texture if resource type changed
        if (existing.sprite.texture.key !== textureKey) {
          existing.sprite.setTexture(textureKey);
          existing.sprite.setTint(0x222222);
        }
        
        // Store active state in the sprite data
        existing.sprite.setData('active', tile.active);
      } else {
        // Create a new sprite for this resource
        const resourceSprite = this.scene.add.sprite(worldX, worldY, textureKey);
        
        // Set scale, opacity, and tint (dark grey)
        resourceSprite.setScale(this.resourceScale);
        resourceSprite.setAlpha(opacity);
        resourceSprite.setTint(0xaaaaaa);
        
        // Store position and type data on the sprite
        resourceSprite.setData('gridX', x);
        resourceSprite.setData('gridY', y);
        resourceSprite.setData('resourceType', tile.resourceType);
        resourceSprite.setData('active', tile.active);
        
        // Add the sprite to the static objects layer
        this.layerManager.addToLayer('staticObjects', resourceSprite);
      }
    });
    
    // Remove sprites for resources that no longer exist
    existingResourceSprites.forEach((data, key) => {
      if (!data.used) {
        data.sprite.destroy();
      }
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

  /**
   * Set up state subscriptions for resource rendering
   */
  public setupSubscriptions(): void {
    StateObserver.subscribe(
      'ResourceRenderer.resources',
      (state) => {
        if (!state.board) return null;
        
        // Extract only the resource-related data from tiles
        const resourceData = [];
        for (let y = 0; y < state.board.height; y++) {
          for (let x = 0; x < state.board.width; x++) {
            const tile = state.board.tiles[y][x];
            if (tile.resourceType || tile.active || tile.resourceValue > 0) {
              resourceData.push({
                x, 
                y, 
                resourceType: tile.resourceType,
                resourceValue: tile.resourceValue,
                active: tile.active
              });
            }
          }
        }
        return resourceData;
      },
      (resourceData, prevResourceData) => {
        if (!resourceData) return;
        
        if (!prevResourceData) {
          // Initial render
          const resourceTiles = actions.getResourceTiles();
          this.renderResourceTiles(resourceTiles);
        } else if (this.hasResourceChanges(resourceData, prevResourceData)) {
          // On actual resource changes (e.g., harvest)
          const resourceTiles = actions.getResourceTiles();
          this.renderResourceTiles(resourceTiles);
          // Clear selected resource after harvest
          actions.selectResourceTile(null);
        }
      },
      { immediate: true, debug: false }
    );
  }

  /**
   * Helper method to detect meaningful resource changes
   */
  private hasResourceChanges(currentResources: any[], previousResources: any[]): boolean {
    // Quick check for different number of resources
    if (currentResources.length !== previousResources.length) {
      return true;
    }
    
    // Create maps for quick lookup
    const previousMap = new Map();
    for (const resource of previousResources) {
      const key = `${resource.x},${resource.y}`;
      previousMap.set(key, resource);
    }
    
    // Check for any changes in resource properties
    for (const resource of currentResources) {
      const key = `${resource.x},${resource.y}`;
      const prevResource = previousMap.get(key);
      
      // If resource doesn't exist in previous data or has different properties
      if (!prevResource || 
          resource.resourceType !== prevResource.resourceType ||
          resource.resourceValue !== prevResource.resourceValue || 
          resource.active !== prevResource.active) {
        return true;
      }
    }
    
    return false;
  }
} 