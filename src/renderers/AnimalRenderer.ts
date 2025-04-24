import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { Animal, AnimalState } from '../store/gameStore';
import { BaseRenderer } from './BaseRenderer';
import { computeDepth } from '../utils/DepthUtils';

/**
 * Responsible for rendering and managing animal sprites
 */
export class AnimalRenderer extends BaseRenderer {
  // Vertical offset to raise animals above tiles
  private verticalOffset: number = -12;
  
  // Map from unit ID to sprite for O(1) sprite lookup
  private unitSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  
  /**
   * Creates a new AnimalRenderer
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
   * Render all animals based on the provided animal data
   * @param animals Array of animal objects from the game state
   * @param onUnitClicked Callback function when a unit is clicked
   */
  renderAnimals(animals: Animal[], onUnitClicked?: (animalId: string, gridX: number, gridY: number) => void): void {
    const unitsLayer = this.layerManager.getUnitsLayer();
    if (!unitsLayer) {
      console.warn("Cannot render animal sprites - unitsLayer not available");
      return;
    }
    
    // Track which unit IDs are still present
    const usedIds = new Set<string>();
    
    // Process each animal - create new or update existing
    animals.forEach(animal => {
      // Calculate position using coordinate utility
      const gridX = animal.position.x;
      const gridY = animal.position.y;
      const worldPosition = CoordinateUtils.gridToWorld(
        gridX, gridY, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
      );
      
      // Apply vertical offset to raise the sprite above the tile
      const worldX = worldPosition.x;
      const worldY = worldPosition.y + this.verticalOffset;
      
      // Determine the texture based on animal state
      const textureKey = animal.state === AnimalState.DORMANT ? 'egg' : animal.species;
      
      // Determine if the unit is active (for depth calculation)
      const isActive = animal.state === AnimalState.ACTIVE;
      
      // Try to find existing sprite by ID
      const sprite = this.unitSprites.get(animal.id);
      if (sprite) {
        usedIds.add(animal.id);
        sprite.setPosition(worldX, worldY);
        sprite.setScale(0.3333);
        sprite.setDepth(computeDepth(gridX, gridY, isActive));
        if (sprite.texture.key !== textureKey) {
          sprite.setTexture(textureKey);
        }
        this.updateSpriteInteractivity(sprite, animal);
      } else {
        // Create a new sprite for this animal with the correct texture
        const animalSprite = this.scene.add.sprite(worldX, worldY, textureKey);
        
        // Set appropriate scale
        animalSprite.setScale(0.3333);
        
        // Set depth based on position and state
        animalSprite.setDepth(computeDepth(gridX, gridY, isActive));
        
        // Store the animal ID and type on the sprite
        animalSprite.setData('animalId', animal.id);
        animalSprite.setData('animalType', animal.species);
        animalSprite.setData('gridX', gridX);
        animalSprite.setData('gridY', gridY);
        
        // Handle interactivity based on state
        this.updateSpriteInteractivity(animalSprite, animal);
        
        // Add the new sprite to the units layer
        this.layerManager.addToLayer('units', animalSprite);
        
        // Cache sprite for future lookups
        this.unitSprites.set(animal.id, animalSprite);
        usedIds.add(animal.id);
      }
    });
    
    // Remove sprites for animals that no longer exist
    this.unitSprites.forEach((sprite, id) => {
      if (!usedIds.has(id)) {
        sprite.destroy();
        this.unitSprites.delete(id);
      }
    });
  }
  
  /**
   * Update sprite interactivity and appearance based on animal state
   * @param sprite The sprite to update
   * @param animal The animal data
   */
  private updateSpriteInteractivity(sprite: Phaser.GameObjects.Sprite, animal: Animal): void {
    // Always disable interactivity for all units, regardless of state
    sprite.disableInteractive();
    
    // Still apply visual indicators based on state
    if (animal.state === AnimalState.DORMANT) {
      sprite.clearTint(); // Make sure eggs are not tinted
    } else if (animal.state === AnimalState.ACTIVE) {
      if (animal.hasMoved) {
        // Make sure the tint is applied
        sprite.setTint(0xAAAAAA);
      } else {
        // Clear any tint
        sprite.clearTint();
      }
    }
  }
  
  /**
   * Clean up resources when destroying this renderer
   */
  override destroy(): void {
    super.destroy();
    // Destroy all tracked unit sprites and clear the map
    this.unitSprites.forEach(sprite => {
      sprite.destroy();
    });
    this.unitSprites.clear();
  }
  
  /**
   * Get the sprite associated with a given unit ID
   */
  public getSpriteById(id: string): Phaser.GameObjects.Sprite | undefined {
    return this.unitSprites.get(id);
  }
} 