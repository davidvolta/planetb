import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import * as actions from '../store/actions';
import { computeDepth } from '../utils/DepthUtils';
import { AnimalRenderer } from '../renderers/AnimalRenderer';

/**
 * Controls and manages all animations in the board scene, including:
 * - Unit movement and displacement animations
 * - State tracking for ongoing animations
 * - Animation completion callbacks
 */
export class AnimationController {
  // Reference to the scene for accessing tweens
  private scene: Phaser.Scene;
  private animalRenderer: AnimalRenderer;

  
  // Board properties needed for coordinate conversion
  private tileSize: number;
  private tileHeight: number;
  private anchorX: number;
  private anchorY: number;
  
  // Vertical offset to raise units above tiles
  private verticalOffset: number = -12;
  
  // Track active tweens created by this controller to avoid killing unrelated tweens
  private activeTweens: Phaser.Tweens.Tween[] = [];
  
  /**
   * Creates a new AnimationController
   * @param scene The parent scene
   * @param tileSize Width of a tile in pixels
   * @param tileHeight Height of a tile in pixels
   * @param anchorX Grid anchor X coordinate
   * @param anchorY Grid anchor Y coordinate
   */
  constructor(
    scene: Phaser.Scene,
    tileSize: number = 64,
    tileHeight: number = 32,
    animalRenderer: AnimalRenderer,
    anchorX: number = 0,
    anchorY: number = 0
  ) 
  {
    this.scene = scene;
    this.tileSize = tileSize;
    this.tileHeight = tileHeight;
    this.anchorX = anchorX;
    this.anchorY = anchorY;
    this.animalRenderer = animalRenderer;
  }
  
  /**
   * Initialize the controller with current anchor position
   * @param anchorX The X coordinate of the grid anchor point
   * @param anchorY The Y coordinate of the grid anchor point
   */
  initialize(anchorX: number, anchorY: number): void {
    this.anchorX = anchorX;
    this.anchorY = anchorY;
  }
  
  /**
   * Animate a unit sprite moving from one position to another with optional interactivity settings.
   * @param sprite The sprite to animate
   * @param fromX Starting X grid coordinate
   * @param fromY Starting Y grid coordinate
   * @param toX Destination X grid coordinate
   * @param toY Destination Y grid coordinate
   * @param options Animation options (disableInteractive, duration, ease)
   * @returns Promise that resolves when animation completes
   */
  animateUnitMovement(
    sprite: Phaser.GameObjects.Sprite,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    options: {
      duration?: number | null;
      ease?: string;
    } = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!sprite) {
        console.error('Cannot animate movement: sprite is missing');
        resolve();
        return;
      }

      const {
        duration: fixedDuration = null,
        ease = 'Power2.out'
      } = options;

      // Convert grid coordinates to world positions
      const startPos = CoordinateUtils.gridToWorld(
        fromX, fromY, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
      );
      const endPos = CoordinateUtils.gridToWorld(
        toX, toY, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
      );
      const endWorldY = endPos.y + this.verticalOffset;

      // Facing: flip based on actual world horizontal movement, ignore pure vertical moves
      const dx = endPos.x - startPos.x;
      if (dx > 0) {
        sprite.setFlipX(true);
      } else if (dx < 0) {
        sprite.setFlipX(false);
      }

      // Compute duration
      let duration = fixedDuration ?? Math.sqrt(
        (endPos.x - startPos.x) ** 2 +
        (endPos.y - startPos.y) ** 2
      ) * (75 / this.tileSize);
      // DEBUG: slow down animation for timing introspection
      duration *= 1;

      // Create and track tween
      const tween = this.scene.tweens.add({
        targets: sprite,
        x: endPos.x,
        y: endWorldY,
        duration,
        ease,
        onUpdate: () => {
          // Update depth throughout movement
          const relY = ((sprite.y - this.verticalOffset) - this.anchorY) / this.tileHeight;
          const relX = (sprite.x - this.anchorX) / this.tileSize;
          const currentGridY = (relY * 2 - relX) / 2;
          const currentGridX = relY - currentGridY;
          sprite.setDepth(computeDepth(currentGridX, currentGridY, true));
        },
        onComplete: () => {
          // Finalize sprite data
          sprite.setData('gridX', toX);
          sprite.setData('gridY', toY);
          sprite.setDepth(computeDepth(toX, toY, true));

          // Remove and resolve
          this.activeTweens = this.activeTweens.filter(t => t !== tween);
          resolve();
        }
      });
      this.activeTweens.push(tween);
    });
  }
  
  /**
   * Handle unit movement from one position to another, including game state updates
   * @param animalId ID of the animal to move
   * @param fromX Starting X grid coordinate
   * @param fromY Starting Y grid coordinate
   * @param toX Destination X grid coordinate
   * @param toY Destination Y grid coordinate
   * @returns Promise that resolves when movement is complete
   */
  public async moveUnit(
    animalId: string,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): Promise<void> {
    const sprite = this.animalRenderer.getSpriteById(animalId);
  
    if (!sprite) {
      console.error(`[AnimationController] Could not find sprite for animalId ${animalId}`);
      return;
    }
  
    await this.animateUnitMovement(sprite, fromX, fromY, toX, toY);
  }
  
  /**
   * Handle unit displacement (being pushed) from one position to another
   * @param animalId ID of the animal being displaced
   * @param sprite The sprite to animate
   * @param fromX Starting X grid coordinate
   * @param fromY Starting Y grid coordinate
   * @param toX Destination X grid coordinate
   * @param toY Destination Y grid coordinate
   * @returns Promise that resolves when displacement is complete
   */
  public async displaceUnit(
    animalId: string,
    sprite: Phaser.GameObjects.Sprite,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): Promise<void> {
    // Animate displacement
    await this.animateUnitMovement(sprite, fromX, fromY, toX, toY);
    // Update game state after displacement completes
    actions.moveDisplacedAnimal(animalId, toX, toY);
  }
  
  /**
   * Clean up resources and cancel any running animations
   */
  destroy(): void {
    // Stop only tweens created by this controller
    this.activeTweens.forEach(t => t.stop());
    this.activeTweens = [];
  }
  
  /**
   * Waits for all active animations to complete using requestAnimationFrame to align with frame draws.
   * @returns Promise that resolves when no animations are active
   */
  public waitForAllAnimationsComplete(): Promise<void> {
    return new Promise(resolve => {
      const step = () => {
        if (this.activeTweens.length === 0) {
          resolve();
        } else {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
    });
  }
  
  /**
   * Returns whether any animations are currently active
   */
  public hasActiveAnimations(): boolean {
    return this.activeTweens.length > 0;
  }
} 