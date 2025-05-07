import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { Animal } from '../store/gameStore';
import { getEggs } from '../store/actions';
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
   */
  public renderAnimals(animals: Animal[]): void {
    const eggsLayer = this.layerManager.getEggsLayer();
    const unitsLayer = this.layerManager.getUnitsLayer();
    if (!eggsLayer || !unitsLayer) {
      console.warn("Cannot render animal sprites - eggs or units layer not available");
      return;
    }

    const usedIds = new Set<string>();

    animals.forEach(animal => {
      // Skip if this animal ID corresponds to an egg (should not happen)
      const eggsRecord = getEggs();
      if (animal.id in eggsRecord) return;

      const gridX = animal.position.x;
      const gridY = animal.position.y;
      const worldPosition = CoordinateUtils.gridToWorld(
        gridX, gridY, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
      );

      const worldX = worldPosition.x;
      const worldY = worldPosition.y + this.verticalOffset;

      // Determine sprite key based on species and owner
      let textureKey: string;
      if (animal.ownerId === 0) {
        textureKey = `${animal.species}-red`;
      } else if (animal.ownerId === 1) {
        textureKey = `${animal.species}-blue`;
      } else {
        textureKey = animal.species;
      }

      if (!this.scene.textures.exists(textureKey)) {
        textureKey = animal.species;
      }

      const sprite = this.unitSprites.get(animal.id);
      const isActive = true;

      if (sprite) {
        usedIds.add(animal.id);
        sprite.setPosition(worldX, worldY);
        sprite.setScale(0.3333);
        sprite.setDepth(computeDepth(gridX, gridY, isActive));
        if (sprite.texture.key !== textureKey) {
          sprite.setTexture(textureKey);
        }
        this.updateSpriteInteractivity(sprite, animal);
        this.layerManager.removeFromLayer('units', sprite);
        this.layerManager.addToLayer('units', sprite);
      } else {
        const animalSprite = this.scene.add.sprite(worldX, worldY, textureKey);
        animalSprite.setScale(0.3333);
        animalSprite.setDepth(computeDepth(gridX, gridY, isActive));
        animalSprite.setData('animalId', animal.id);
        animalSprite.setData('animalType', animal.species);
        animalSprite.setData('gridX', gridX);
        animalSprite.setData('gridY', gridY);
        this.updateSpriteInteractivity(animalSprite, animal);
        this.layerManager.addToLayer('units', animalSprite);
        this.unitSprites.set(animal.id, animalSprite);
        usedIds.add(animal.id);
      }
    });

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
    if (animal.hasMoved) {
      sprite.setTint(0xAAAAAA);
    } else {
      sprite.clearTint();
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