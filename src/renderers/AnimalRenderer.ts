import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { Animal, AnimalState, Egg } from '../store/gameStore';
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
  
  // Map from egg ID to sprite for eggs rendering
  private eggSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  
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
  const eggsLayer = this.layerManager.getEggsLayer();
  const unitsLayer = this.layerManager.getUnitsLayer();
  if (!eggsLayer || !unitsLayer) {
    console.warn("Cannot render animal sprites - eggs or units layer not available");
    return;
  }

  const usedIds = new Set<string>();

  animals.forEach(animal => {
    // ❌ TEMPORARY: Skip dormant animals (eggs)
    // TODO [egg-refactor]: Remove this check once DORMANT is fully removed
    if (animal.state === AnimalState.DORMANT) return;

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
    const isActive = animal.state === AnimalState.ACTIVE;

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
  
  /**
   * Clear all egg sprites.
   */
  public clearEggs(): void {
    this.eggSprites.forEach(sprite => sprite.destroy());
    this.eggSprites.clear();
  }
  
  renderEggs(
    eggs: Egg[],
    onEggClicked?: (eggId: string, gridX: number, gridY: number) => void
  ): void {
    this.clearEggs();
  
    const eggsLayer = this.layerManager.getEggsLayer();
    if (!eggsLayer) {
      console.warn("EggRenderer: missing eggs layer");
      return;
    }
  
    for (const egg of eggs) {
      const { id, position } = egg;
      const { x, y } = position;
      const world = CoordinateUtils.gridToWorld(
        x, y, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
      );
  
      const sprite = this.scene.add.sprite(world.x, world.y, 'egg');
      sprite.setOrigin(0.5, 1);
      sprite.setScale(0.3333);
      sprite.setDepth(world.y); // matches active unit logic
  
      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerdown', () => {
        if (onEggClicked) onEggClicked(id, x, y);
      });
  
      sprite.setData('eggId', id);
      sprite.setData('gridX', x);
      sprite.setData('gridY', y);
  
      this.layerManager.addToLayer('eggs', sprite);
      this.eggSprites.set(id, sprite);
    }
  }
  
} 