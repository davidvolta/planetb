import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { Animal } from '../store/gameStore';
import { BaseRenderer } from './BaseRenderer';
import { computeDepth } from '../utils/DepthUtils';
import { DisplacementEvent, BLANK_DISPLACEMENT_EVENT } from '../types/events';

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
  public renderAnimals(animals: Animal[], displacementEvent: DisplacementEvent = BLANK_DISPLACEMENT_EVENT): void {
    const eggsLayer = this.layerManager.getEggsLayer();
    const unitsLayer = this.layerManager.getUnitsLayer();
    if (!eggsLayer || !unitsLayer) {
      console.warn("Cannot render animal sprites - eggs or units layer not available");
      return;
    }

    const usedIds = new Set<string>();

    animals.forEach(animal => {
      // If this is the displaced animal and the event is active, start it at its previous position
      const gridX = (displacementEvent.occurred && displacementEvent.animalId === animal.id && displacementEvent.fromX !== null)
        ? displacementEvent.fromX : animal.position.x;
      const gridY = (displacementEvent.occurred && displacementEvent.animalId === animal.id && displacementEvent.fromY !== null)
        ? displacementEvent.fromY : animal.position.y;
      const worldPosition = CoordinateUtils.gridToWorld(
        gridX, gridY, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
      );

      const worldX = worldPosition.x;
      const worldY = worldPosition.y + this.verticalOffset;

      // Determine sprite key based on species, owner, and movement state
      let textureKey: string;
      if (animal.hasMoved) {
        // Use base sprite when animal has moved
        textureKey = animal.species;
      } else {
        // Use colored sprite when animal hasn't moved
        if (animal.ownerId === 0) {
          textureKey = `${animal.species}-pink`;
        } else if (animal.ownerId === 1) {
          textureKey = `${animal.species}-blue`;
        } else {
          textureKey = animal.species;
        }
      }

      if (!this.scene.textures.exists(textureKey)) {
        textureKey = animal.species;
      }

      const sprite = this.animalSprites.get(animal.id);
      const isActive = true;

      if (sprite) {
        usedIds.add(animal.id);
        sprite.setPosition(worldX, worldY);
        sprite.setScale(0.3333);
        sprite.setDepth(computeDepth(gridX, gridY, isActive));
        if (sprite.texture.key !== textureKey) {
          sprite.setTexture(textureKey);
        }
        // Corrected sprite flipX logic
        if (animal.facingDirection === 'right') {
          sprite.setFlipX(true); // Default sprite faces left, so flipX=true = face right
        } else {
          sprite.setFlipX(false);
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
        // Corrected sprite flipX logic
        if (animal.facingDirection === 'right') {
          animalSprite.setFlipX(true); // Default sprite faces left, so flipX=true = face right
        } else {
          animalSprite.setFlipX(false);
        }
        this.updateSpriteInteractivity(animalSprite, animal);
        this.layerManager.addToLayer('units', animalSprite);
        this.animalSprites.set(animal.id, animalSprite);
        usedIds.add(animal.id);
      }
    });

    this.animalSprites.forEach((sprite, id) => {
      if (!usedIds.has(id)) {
        sprite.destroy();
        this.animalSprites.delete(id);
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