import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import { LayerManager } from '../managers/LayerManager';
import { Animal, AnimalState } from '../store/gameStore';
import { BaseRenderer } from './BaseRenderer';

/**
 * Responsible for rendering and managing animal sprites
 */
export class AnimalRenderer extends BaseRenderer {
  // Animation status flag
  private animationInProgress: boolean = false;
  
  // Vertical offset to raise animals above tiles
  private verticalOffset: number = -12;
  
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
   * Initialize the renderer with board anchor position
   * @param anchorX The X coordinate of the grid anchor point
   * @param anchorY The Y coordinate of the grid anchor point
   */
  initialize(anchorX: number, anchorY: number): void {
    this.setAnchor(anchorX, anchorY);
  }
  
  /**
   * Render all animals based on the provided animal data
   * @param animals Array of animal objects from the game state
   * @param onUnitClicked Callback function when a unit is clicked
   */
  renderAnimals(animals: Animal[], onUnitClicked?: (animalId: string, gridX: number, gridY: number) => void): void {
    // Check if unitsLayer exists before proceeding
    const unitsLayer = this.layerManager.getUnitsLayer();
    if (!unitsLayer) {
      console.warn("Cannot render animal sprites - unitsLayer not available");
      return;
    }
    
    // If an animation is in progress, defer updating sprites
    if (this.animationInProgress) {
      return;
    }
    
    // Get a map of current animal sprites by ID
    const existingSprites = new Map();
    unitsLayer.getAll().forEach(child => {
      if (child instanceof Phaser.GameObjects.Sprite) {
        const animalId = child.getData('animalId');
        if (animalId) {
          existingSprites.set(animalId, {
            sprite: child,
            used: false
          });
        }
      }
    });
    
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
      
      // Check if we have an existing sprite
      const existing = existingSprites.get(animal.id);
      
      if (existing) {
        // Mark as used so we don't delete it later
        existing.used = true;
        
        // Update position with vertical offset
        existing.sprite.setPosition(worldX, worldY);
        
        // Set scale to 1/3 size
        existing.sprite.setScale(0.3333);
        
        // Set depth based on position and state
        existing.sprite.setDepth(this.calculateUnitDepth(gridX, gridY, isActive));
        
        // Update texture if animal state changed
        if (existing.sprite.texture.key !== textureKey) {
          existing.sprite.setTexture(textureKey);
        }
        
        // Handle interactivity and visual feedback based on state and movement
        this.updateSpriteInteractivity(existing.sprite, animal);
      } else {
        // Create a new sprite for this animal with the correct texture
        const animalSprite = this.scene.add.sprite(worldX, worldY, textureKey);
        
        // Set appropriate scale
        animalSprite.setScale(0.3333);
        
        // Set depth based on position and state
        animalSprite.setDepth(this.calculateUnitDepth(gridX, gridY, isActive));
        
        // Store the animal ID and type on the sprite
        animalSprite.setData('animalId', animal.id);
        animalSprite.setData('animalType', animal.species);
        animalSprite.setData('gridX', gridX);
        animalSprite.setData('gridY', gridY);
        
        // Handle interactivity based on state
        this.updateSpriteInteractivity(animalSprite, animal);
        
        // Add the new sprite to the units layer
        this.layerManager.addToLayer('units', animalSprite);
      }
    });
    
    // Remove sprites for animals that no longer exist
    existingSprites.forEach((data, id) => {
      if (!data.used) {
        data.sprite.destroy();
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
   * Calculate the depth value for a unit sprite based on its grid position and state
   * @param gridX X coordinate in the grid
   * @param gridY Y coordinate in the grid
   * @param isActive Whether the unit is active or dormant
   * @returns Depth value for proper isometric perspective
   */
  private calculateUnitDepth(gridX: number, gridY: number, isActive: boolean): number {
    // Base depth of the units layer
    const baseDepth = 5;
    
    // Combined X+Y coordinates for isometric perspective (higher X+Y = further back = higher depth)
    const positionOffset = (gridX + gridY) / 1000;
    
    // Small offset to ensure active units appear above eggs at the same position
    const stateOffset = isActive ? 0.0005 : 0;
    
    // Calculate final depth value
    return baseDepth + positionOffset + stateOffset;
  }
  
  /**
   * Animate a unit moving from one position to another
   * @param unitId ID of the unit to move
   * @param fromX Starting X coordinate
   * @param fromY Starting Y coordinate
   * @param toX Destination X coordinate
   * @param toY Destination Y coordinate
   * @param options Additional animation options
   * @returns Promise that resolves when animation completes
   */
  animateUnit(
    unitId: string,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    options: {
      applyTint?: boolean;
      disableInteractive?: boolean;
      duration?: number | null;
      isDisplacement?: boolean;
      onComplete?: () => void;
    } = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      // Set default options
      const {
        applyTint = false,
        disableInteractive = false,
        duration: fixedDuration = null,
        isDisplacement = false,
        onComplete = () => {}
      } = options;
      
      // Find the unit sprite
      let unitSprite: Phaser.GameObjects.Sprite | null = null;
      if (this.layerManager.getUnitsLayer()) {
        this.layerManager.getUnitsLayer()!.getAll().forEach(child => {
          if (child instanceof Phaser.GameObjects.Sprite && child.getData('animalId') === unitId) {
            unitSprite = child;
          }
        });
      }
      
      if (!unitSprite) {
        console.error(`Could not find sprite for unit ${unitId}`);
        resolve();
        return;
      }
      
      // Convert grid coordinates to world coordinates
      const startPos = CoordinateUtils.gridToWorld(
        fromX, fromY, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
      );
      const endPos = CoordinateUtils.gridToWorld(
        toX, toY, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
      );
      
      // Apply vertical offset
      const startWorldY = startPos.y + this.verticalOffset;
      const endWorldY = endPos.y + this.verticalOffset;
      
      // Mark animation as in progress
      this.animationInProgress = true;
      
      // Calculate movement duration based on distance (unless fixed duration is provided)
      let duration;
      if (fixedDuration) {
        duration = fixedDuration;
      } else {
        const distance = Math.sqrt(
          Math.pow(endPos.x - startPos.x, 2) + 
          Math.pow(endPos.y - startPos.y, 2)
        );
        const baseDuration = 75; // Moderate duration for smooth movement
        duration = baseDuration * (distance / this.tileSize);
      }
      
      // Create the animation tween
      this.scene.tweens.add({
        targets: unitSprite,
        x: endPos.x,
        y: endWorldY,
        duration: duration,
        ease: 'Power2.out', // Quick acceleration, gentle stop
        onUpdate: () => {
          // Calculate current grid Y position based on the sprite's current position
          const currentWorldY = unitSprite!.y - this.verticalOffset;
          const currentWorldX = unitSprite!.x;
          
          // Reverse the isometric projection to get approximate grid coordinates
          const relY = (currentWorldY - this.anchorY) / this.tileHeight;
          const relX = (currentWorldX - this.anchorX) / this.tileSize;
          
          // Calculate approximate grid Y
          const currentGridY = (relY * 2 - relX) / 2;
          
          // Calculate approximate grid X
          const currentGridX = relY - currentGridY;
          
          // Update depth during movement
          unitSprite!.setDepth(this.calculateUnitDepth(currentGridX, currentGridY, true));
        },
        onComplete: () => {
          // Update the sprite's stored grid coordinates
          unitSprite!.setData('gridX', toX);
          unitSprite!.setData('gridY', toY);
          
          // Set final depth at destination
          unitSprite!.setDepth(this.calculateUnitDepth(toX, toY, true));
          
          // Apply light gray tint to indicate the unit has moved
          if (applyTint) {
            unitSprite!.setTint(0xAAAAAA);
          }
          
          // Disable interactivity
          if (disableInteractive) {
            unitSprite!.disableInteractive();
          }
          
          // Mark animation as complete
          this.animationInProgress = false;
          
          // Call the completion callback
          onComplete();
          
          // Resolve the promise
          resolve();
        }
      });
    });
  }
  
  /**
   * Check if animation is currently in progress
   * @returns Whether an animation is currently playing
   */
  isAnimating(): boolean {
    return this.animationInProgress;
  }
  
  /**
   * Clean up resources when destroying this renderer
   */
  override destroy(): void {
    super.destroy();
    
    // Get all animal sprites and destroy them
    const unitsLayer = this.layerManager.getUnitsLayer();
    if (unitsLayer) {
      unitsLayer.getAll().forEach(child => {
        if (child instanceof Phaser.GameObjects.Sprite) {
          const animalId = child.getData('animalId');
          if (animalId) {
            child.destroy();
          }
        }
      });
    }
  }
} 