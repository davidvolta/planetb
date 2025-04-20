import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { Resource, ResourceType } from '../store/gameStore';
import { BaseRenderer } from './BaseRenderer';
import * as actions from '../store/actions';
import { TileResult } from '../store/actions';

/**
 * Responsible for rendering and managing resource graphics
 */
export class ResourceRenderer extends BaseRenderer {
  private resourceScale: number = 0.3333;
  // Track blank tile sprites by position key (x,y)
  private blankTileSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  
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
        }
        
        // Store active state in the sprite data
        existing.sprite.setData('active', tile.active);
      } else {
        // Create a new sprite for this resource
        const resourceSprite = this.scene.add.sprite(worldX, worldY, textureKey);
        
        // Set scale and opacity
        resourceSprite.setScale(this.resourceScale);
        resourceSprite.setAlpha(opacity);
        
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
    
    // Always refresh blank tiles after updating resources
    this.visualizeBlankTiles();
  }
  
  /**
   * Clear all blank tile visualization markers
   */
  clearBlankTileMarkers(): void {
    const staticObjectsLayer = this.layerManager.getStaticObjectsLayer();
    if (!staticObjectsLayer) return;
    
    let removedCount = 0;
    
    // Destroy all tracked blank tile sprites
    this.blankTileSprites.forEach((sprite) => {
      sprite.destroy();
      removedCount++;
    });
    
    // Clear the tracking map
    this.blankTileSprites.clear();
    
    if (removedCount > 0) {
      console.log(`Removed ${removedCount} blank tile markers`);
    }
  }
  
  /**
   * Visualize blank tiles (tiles with hasEgg=false and no resources or habitats)
   * This performs an incremental update rather than clearing and recreating all markers
   */
  visualizeBlankTiles(): void {
    // Get all blank tiles using the filtering system
    const blankTiles = actions.getBlankTiles();
    
    if (blankTiles.length === 0) {
      // No blank tiles, clear any existing ones
      if (this.blankTileSprites.size > 0) {
        this.clearBlankTileMarkers();
      }
      return;
    }
    
    const staticObjectsLayer = this.layerManager.getStaticObjectsLayer();
    if (!staticObjectsLayer) return;
    
    // Create a set of current blank tile position keys
    const currentBlankPositions = new Set<string>();
    let addedCount = 0;
    let removedCount = 0;
    
    // Process all current blank tiles
    blankTiles.forEach(({ x, y, tile }: TileResult) => {
      const posKey = `${x},${y}`;
      currentBlankPositions.add(posKey);
      
      // Check if we already have a sprite for this position
      if (!this.blankTileSprites.has(posKey)) {
        // Need to create a new sprite
        const worldPosition = CoordinateUtils.gridToWorld(
          x, y, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
        );
        
        const worldX = worldPosition.x;
        const worldY = worldPosition.y;
        
        // Create a sprite to indicate blank tile
        const blankSprite = this.scene.add.sprite(worldX, worldY, 'blank');
        
        // Apply consistent styling
        blankSprite.setScale(0.25);
        blankSprite.setDepth(5);
        blankSprite.setData('blankTileMarker', true);
        blankSprite.setData('gridX', x);
        blankSprite.setData('gridY', y);
        
        // Add to layer and to our tracking map
        this.layerManager.addToLayer('staticObjects', blankSprite);
        this.blankTileSprites.set(posKey, blankSprite);
        
        addedCount++;
      }
    });
    
    // Find and remove sprites for positions that are no longer blank
    const keysToRemove: string[] = [];
    this.blankTileSprites.forEach((sprite, posKey) => {
      if (!currentBlankPositions.has(posKey)) {
        // This position is no longer blank, remove the sprite
        sprite.destroy();
        keysToRemove.push(posKey);
        removedCount++;
      }
    });
    
    // Remove keys from our tracking map
    keysToRemove.forEach(key => {
      this.blankTileSprites.delete(key);
    });
    
    // Log changes only if something actually changed
    if (addedCount > 0 || removedCount > 0) {
      console.log(`Blank tiles update: Added ${addedCount}, Removed ${removedCount}, Total ${this.blankTileSprites.size}`);
    }
  }
  
  /**
   * Update specific blank tiles that have changed visibility
   * @param changedTiles Array of tile positions that have changed
   */
  updateBlankTilesVisibility(changedTiles: { x: number, y: number }[]): void {
    if (changedTiles.length === 0) return;
    
    const staticObjectsLayer = this.layerManager.getStaticObjectsLayer();
    if (!staticObjectsLayer) return;
    
    // Get current blank tiles from the action helper
    const blankTiles = actions.getBlankTiles();
    
    // Create a set of blank tile positions for quick lookup
    const blankPositionSet = new Set<string>();
    blankTiles.forEach(({ x, y }) => {
      blankPositionSet.add(`${x},${y}`);
    });
    
    let addedCount = 0;
    let removedCount = 0;
    
    // Process each changed tile
    changedTiles.forEach(({ x, y }) => {
      const posKey = `${x},${y}`;
      const isBlank = blankPositionSet.has(posKey);
      const hasSprite = this.blankTileSprites.has(posKey);
      
      if (isBlank && !hasSprite) {
        // Need to add a new blank tile marker
        const worldPosition = CoordinateUtils.gridToWorld(
          x, y, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
        );
        
        const blankSprite = this.scene.add.sprite(worldPosition.x, worldPosition.y, 'blank');
        blankSprite.setScale(0.25);
        blankSprite.setDepth(5);
        blankSprite.setData('blankTileMarker', true);
        blankSprite.setData('gridX', x);
        blankSprite.setData('gridY', y);
        
        this.layerManager.addToLayer('staticObjects', blankSprite);
        this.blankTileSprites.set(posKey, blankSprite);
        
        addedCount++;
      } else if (!isBlank && hasSprite) {
        // Need to remove a blank tile marker
        const sprite = this.blankTileSprites.get(posKey);
        if (sprite) {
          sprite.destroy();
          this.blankTileSprites.delete(posKey);
          removedCount++;
        }
      }
    });
    
    // Log changes only if something actually changed
    if (addedCount > 0 || removedCount > 0) {
      console.log(`Blank tiles visibility update: Added ${addedCount}, Removed ${removedCount}`);
    }
  }
  
  /**
   * Clear any inactive resource markers
   * @deprecated This method is kept for backward compatibility
   */
  clearInactiveResourceMarkers(): void {
    const staticObjectsLayer = this.layerManager.getStaticObjectsLayer();
    if (!staticObjectsLayer) return;
    
    staticObjectsLayer.getAll().forEach(child => {
      if (child instanceof Phaser.GameObjects.Graphics && 
          child.getData('inactiveResourceMarker')) {
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
    this.clearBlankTileMarkers();
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
} 