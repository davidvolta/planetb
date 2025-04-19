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
    
    // Find all sprites with the blankTileMarker data tag
    staticObjectsLayer.getAll().forEach(child => {
      if (child instanceof Phaser.GameObjects.Sprite && child.getData('blankTileMarker')) {
        child.destroy(); // Remove from scene immediately
        removedCount++;
      }
    });
    
    if (removedCount > 0) {
      console.log(`Removed ${removedCount} blank tile markers`);
    }
  }
  
  /**
   * Visualize blank tiles (tiles with hasEgg=false and no resources or habitats)
   */
  visualizeBlankTiles(): void {
    // Clear any existing blank tile markers first to prevent duplication
    this.clearBlankTileMarkers();
    
    // Get all blank tiles using the filtering system
    const blankTiles = actions.getBlankTiles();
    
    if (blankTiles.length === 0) {
      return; // Nothing to visualize
    }
    
    const staticObjectsLayer = this.layerManager.getStaticObjectsLayer();
    if (!staticObjectsLayer) return;
    
    // Create all blank tile markers at once
    let markersAdded = 0;
    
    blankTiles.forEach(({ x, y, tile }: TileResult) => {
      // Calculate world position
      const worldPosition = CoordinateUtils.gridToWorld(
        x, y, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
      );
      
      const worldX = worldPosition.x;
      const worldY = worldPosition.y;
      
      // Create a sprite to indicate blank tile with consistent properties
      const blankSprite = this.scene.add.sprite(worldX, worldY, 'blank');
      
      // Apply consistent scaling and visual properties
      blankSprite.setScale(0.25);
      blankSprite.setDepth(5); // Make sure it renders on top of terrain
      blankSprite.setData('blankTileMarker', true);
      blankSprite.setData('gridX', x);
      blankSprite.setData('gridY', y);
      
      // Add to static objects layer
      this.layerManager.addToLayer('staticObjects', blankSprite);
      markersAdded++;
    });
    
    console.log(`Visualized ${markersAdded} blank tiles`);
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