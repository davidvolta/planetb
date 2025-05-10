import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { Animal } from '../store/gameStore';
import { BaseRenderer } from './BaseRenderer';
import { computeDepth } from '../utils/DepthUtils';

/**
 * Responsible for rendering and managing animal sprites
 */
export class AnimalRenderer extends BaseRenderer {
  // Vertical offset to raise animals above tiles
  private verticalOffset: number = -12;
  
  // Map from animal ID to sprite for O(1) sprite lookup
  private animalSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  
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
   */
  public renderAnimals(animals: Animal[]): void {
    const usedIds = new Set<string>();

    animals.forEach(animal => {
      const gridX = animal.position.x;
      const gridY = animal.position.y;
      const worldPosition = CoordinateUtils.gridToWorld(
        gridX, gridY, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
      );
      const worldX = worldPosition.x;
      const worldY = worldPosition.y + this.verticalOffset;

      let textureKey = animal.species;
      if (!animal.hasMoved) {
        // Only apply color suffix when the animal is still active
        if (animal.ownerId === 0) textureKey += '-pink';
        else if (animal.ownerId === 1) textureKey += '-blue';
      }
      if (!this.scene.textures.exists(textureKey)) textureKey = animal.species;

      const existing = this.animalSprites.get(animal.id);
      const isActive = true;

      if (existing) {
        // Update position only if it changed
        const prevX = existing.getData('gridX');
        const prevY = existing.getData('gridY');
        if (prevX !== gridX || prevY !== gridY) {
          existing.setPosition(worldX, worldY);
          existing.setDepth(computeDepth(gridX, gridY, isActive));
          existing.setData('gridX', gridX);
          existing.setData('gridY', gridY);
        }

        // Update flip direction
        existing.setFlipX(animal.facingDirection === 'right');

        // Update tint
        if (animal.hasMoved) {
          existing.setTint(0xAAAAAA);
        } else {
          existing.clearTint();
        }

        // Texture swap if species/ownership changed
        if (existing.texture.key !== textureKey) {
          existing.setTexture(textureKey);
        }

        this.layerManager.removeFromLayer('units', existing);
        this.layerManager.addToLayer('units', existing);

        usedIds.add(animal.id);
      } else {
        const sprite = this.scene.add.sprite(worldX, worldY, textureKey);
        sprite.setScale(0.3333);
        sprite.setDepth(computeDepth(gridX, gridY, isActive));
        sprite.setData('animalId', animal.id);
        sprite.setData('animalType', animal.species);
        sprite.setData('gridX', gridX);
        sprite.setData('gridY', gridY);

        sprite.setFlipX(animal.facingDirection === 'right');

        this.layerManager.addToLayer('units', sprite);
        this.animalSprites.set(animal.id, sprite);
        usedIds.add(animal.id);
      }
    });

    // Cleanup sprites for animals that were removed
    this.animalSprites.forEach((sprite, id) => {
      if (!usedIds.has(id)) {
        sprite.destroy();
        this.animalSprites.delete(id);
      }
    });
  }
  
  /**
   * Clean up resources when destroying this renderer
   */
  override destroy(): void {
    super.destroy();
    // Destroy all tracked animal sprites and clear the map
    this.animalSprites.forEach(sprite => {
      sprite.destroy();
    });
    this.animalSprites.clear();
  }
  
  /**
   * Get the sprite associated with a given animal ID
   */
  public getSpriteById(id: string): Phaser.GameObjects.Sprite | undefined {
    return this.animalSprites.get(id);
  }
} 