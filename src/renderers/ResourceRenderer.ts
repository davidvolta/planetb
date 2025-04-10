import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { Resource, ResourceType } from '../store/gameStore';
import { BaseRenderer } from './BaseRenderer';

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
   * Initialize the renderer with board anchor position
   * @param anchorX The X coordinate of the grid anchor point
   * @param anchorY The Y coordinate of the grid anchor point
   */
  initialize(anchorX: number, anchorY: number): void {
    this.setAnchor(anchorX, anchorY);
  }
  
  /**
   * Render all resources based on the provided resource data
   * @param resources Array of resource objects from the game state
   */
  renderResources(resources: Resource[]): void {
    // Check if staticObjectsLayer exists before proceeding
    const staticObjectsLayer = this.layerManager.getStaticObjectsLayer();
    if (!staticObjectsLayer) {
      console.warn("Cannot render resource graphics - staticObjectsLayer not available");
      return;
    }
    
    // Get a map of current resource sprites by ID
    const existingResources = new Map();
    staticObjectsLayer.getAll().forEach(child => {
      if (child instanceof Phaser.GameObjects.Sprite) {
        const resourceId = child.getData('resourceId');
        if (resourceId) {
          existingResources.set(resourceId, {
            sprite: child,
            used: false
          });
        }
      }
    });
    
    // Process each resource - create new or update existing
    resources.forEach(resource => {
      // Calculate position using coordinate utility
      const gridX = resource.position.x;
      const gridY = resource.position.y;
      const worldPosition = CoordinateUtils.gridToWorld(
        gridX, gridY, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
      );
      
      // Apply vertical offset to raise the sprite above the tile
      const worldX = worldPosition.x;
      const worldY = worldPosition.y;
      
      // Determine the texture based on resource type
      const textureKey = resource.type === ResourceType.FOREST ? 'forest' : 'kelp';
      
      // Check if we have an existing sprite
      const existing = existingResources.get(resource.id);
      
      if (existing) {
        // Mark as used so we don't delete it later
        existing.used = true;
        
        // Update position
        existing.sprite.setPosition(worldX, worldY);
        
        // Update texture if resource type changed
        if (existing.sprite.texture.key !== textureKey) {
          existing.sprite.setTexture(textureKey);
        }
      } else {
        // Create a new sprite for this resource
        const resourceSprite = this.scene.add.sprite(worldX, worldY, textureKey);
        
        // Set scale
        resourceSprite.setScale(this.resourceScale);
        
        // Store the resource ID on the sprite
        resourceSprite.setData('resourceId', resource.id);
        resourceSprite.setData('resourceType', resource.type);
        resourceSprite.setData('gridX', gridX);
        resourceSprite.setData('gridY', gridY);
        
        // Add the sprite to the static objects layer
        this.layerManager.addToLayer('staticObjects', resourceSprite);
      }
    });
    
    // Remove sprites for resources that no longer exist
    existingResources.forEach((data) => {
      if (!data.used) {
        data.sprite.destroy();
      }
    });
  }
  
  /**
   * Add a single resource sprite
   * @param resource The resource to add
   */
  addResource(resource: Resource): void {
    const worldPosition = CoordinateUtils.gridToWorld(
      resource.position.x, 
      resource.position.y, 
      this.tileSize, 
      this.tileHeight, 
      this.anchorX, 
      this.anchorY
    );
    
    const worldX = worldPosition.x;
    const worldY = worldPosition.y;
    const textureKey = resource.type === ResourceType.FOREST ? 'forest' : 'kelp';
    
    const resourceSprite = this.scene.add.sprite(worldX, worldY, textureKey);
    resourceSprite.setScale(this.resourceScale);
    
    resourceSprite.setData('resourceId', resource.id);
    resourceSprite.setData('resourceType', resource.type);
    resourceSprite.setData('gridX', resource.position.x);
    resourceSprite.setData('gridY', resource.position.y);
    
    this.layerManager.addToLayer('staticObjects', resourceSprite);
  }
  
  /**
   * Update a single resource sprite
   * @param resource The resource to update
   */
  updateResource(resource: Resource): void {
    const staticObjectsLayer = this.layerManager.getStaticObjectsLayer();
    if (!staticObjectsLayer) return;
    
    staticObjectsLayer.getAll().forEach(child => {
      if (child instanceof Phaser.GameObjects.Sprite && 
          child.getData('resourceId') === resource.id) {
        
        // Update position if needed
        const worldPosition = CoordinateUtils.gridToWorld(
          resource.position.x,
          resource.position.y,
          this.tileSize,
          this.tileHeight,
          this.anchorX,
          this.anchorY
        );
        
        const worldX = worldPosition.x;
        const worldY = worldPosition.y;
        
        child.setPosition(worldX, worldY);
        
        // Update texture if type changed
        const textureKey = resource.type === ResourceType.FOREST ? 'forest' : 'kelp';
        if (child.texture.key !== textureKey) {
          child.setTexture(textureKey);
        }
        
        // Update grid position data
        child.setData('gridX', resource.position.x);
        child.setData('gridY', resource.position.y);
      }
    });
  }
  
  /**
   * Remove a resource sprite
   * @param resourceId ID of the resource to remove
   */
  removeResource(resourceId: string): void {
    const staticObjectsLayer = this.layerManager.getStaticObjectsLayer();
    if (!staticObjectsLayer) return;
    
    staticObjectsLayer.getAll().forEach(child => {
      if (child instanceof Phaser.GameObjects.Sprite && 
          child.getData('resourceId') === resourceId) {
        child.destroy();
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
          child.getData('resourceId')) {
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
} 