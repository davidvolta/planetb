import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import * as actions from '../store/actions';
import { computeDepth } from '../utils/DepthUtils';
import { AnimalRenderer } from '../renderers/AnimalRenderer';

/**
 * Controls and manages all animations in the board scene.
 * 
 * KEY PRINCIPLE: Animations are purely visual - they don't affect game state.
 * State is updated immediately, animations show the transition visually.
 */
export class AnimationController {
  private scene: Phaser.Scene;
  private animalRenderer: AnimalRenderer;
  private tileSize: number;
  private tileHeight: number;
  private anchorX: number;
  private anchorY: number;
  private verticalOffset: number = -12;
  private activeTweens: Phaser.Tweens.Tween[] = [];
  
  constructor(
    scene: Phaser.Scene,
    tileSize: number = 64,
    tileHeight: number = 32,
    animalRenderer: AnimalRenderer,
    anchorX: number = 0,
    anchorY: number = 0
  ) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.tileHeight = tileHeight;
    this.anchorX = anchorX;
    this.anchorY = anchorY;
    this.animalRenderer = animalRenderer;
  }
  
  initialize(anchorX: number, anchorY: number): void {
    this.anchorX = anchorX;
    this.anchorY = anchorY;
  }

  /**
   * Animates a sprite moving from current position to target grid coordinates.
   * This is purely visual - the sprite position in state is already updated.
   * 
   * @param sprite The sprite to animate
   * @param fromX Starting X grid coordinate (where sprite currently is visually)
   * @param fromY Starting Y grid coordinate (where sprite currently is visually)
   * @param toX Destination X grid coordinate (where sprite should end up)
   * @param toY Destination Y grid coordinate (where sprite should end up)
   * @param options Animation options
   * @returns Promise that resolves when animation completes
   */
  private animateSprite(
    sprite: Phaser.GameObjects.Sprite,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    options: {
      duration?: number;
      ease?: string;
    } = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!sprite) {
        console.warn('Cannot animate: sprite is missing');
        resolve();
        return;
      }

      const { duration, ease = 'Power2.out' } = options;

      // Calculate world positions
      const startPos = CoordinateUtils.gridToWorld(
        fromX, fromY, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
      );
      const endPos = CoordinateUtils.gridToWorld(
        toX, toY, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
      );

      // Set sprite to start position (in case it's not already there)
      sprite.setPosition(startPos.x, startPos.y + this.verticalOffset);

      // Calculate animation duration based on distance if not provided
      const animDuration = duration ?? Math.sqrt(
        (endPos.x - startPos.x) ** 2 + 
        (endPos.y - startPos.y) ** 2
      ) * (75 / this.tileSize);

      // Create tween
      const tween = this.scene.tweens.add({
        targets: sprite,
        x: endPos.x,
        y: endPos.y + this.verticalOffset,
        duration: animDuration,
        ease,
        onUpdate: () => {
          // Update depth during movement for proper layering
          const relY = ((sprite.y - this.verticalOffset) - this.anchorY) / this.tileHeight;
          const relX = (sprite.x - this.anchorX) / this.tileSize;
          const currentGridY = (relY * 2 - relX) / 2;
          const currentGridX = relY - currentGridY;
          sprite.setDepth(computeDepth(currentGridX, currentGridY, true));
        },
        onComplete: () => {
          // Ensure sprite is at exact final position
          sprite.setPosition(endPos.x, endPos.y + this.verticalOffset);
          sprite.setDepth(computeDepth(toX, toY, true));
          sprite.setData('gridX', toX);
          sprite.setData('gridY', toY);

          // Clean up
          this.activeTweens = this.activeTweens.filter(t => t !== tween);
          resolve();
        }
      });
      
      this.activeTweens.push(tween);
    });
  }
  
  /**
   * Moves a unit with coordinated state update and animation.
   * This method handles both updating the game state and animating the visual transition.
   * 
   * @param animalId ID of the animal to move
   * @param fromX Starting X grid coordinate (current position)
   * @param fromY Starting Y grid coordinate (current position)
   * @param toX Destination X grid coordinate
   * @param toY Destination Y grid coordinate
   * @returns Promise that resolves when both state update and animation complete
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
      console.warn(`[AnimationController] Could not find sprite for animalId ${animalId}`);
      // Still update state even if sprite is missing
      await actions.moveAnimal(animalId, toX, toY);
      return;
    }

    // Mark sprite as being animated to prevent renderer interference
    sprite.setData('isAnimating', true);

    // Update sprite facing direction
    const direction = toX > fromX ? 'right' : 'left';
    sprite.setFlipX(direction === 'right');

    // Start animation
    const animationPromise = this.animateSprite(sprite, fromX, fromY, toX, toY);
    
    // Update state immediately (AnimalRenderer won't interfere due to isAnimating flag)
    await actions.moveAnimal(animalId, toX, toY);
    
    // Wait for animation to complete
    await animationPromise;
    
    // Clear animation flag
    sprite.setData('isAnimating', false);
  }
  
  /**
   * Animates a unit being displaced (pushed) from one position to another.
   * NOTE: This is for displacement animations - state updates should be handled separately.
   * 
   * @param animalId ID of the animal being displaced
   * @param fromX Starting X grid coordinate
   * @param fromY Starting Y grid coordinate
   * @param toX Destination X grid coordinate
   * @param toY Destination Y grid coordinate
   * @returns Promise that resolves when displacement animation is complete
   */
  public async animateUnitDisplacement(
    animalId: string,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): Promise<void> {
    const sprite = this.animalRenderer.getSpriteById(animalId);
    
    if (!sprite) {
      console.warn(`[AnimationController] Could not find sprite for displaced animal ${animalId}`);
      return;
    }

    // Animate the displacement
    await this.animateSprite(sprite, fromX, fromY, toX, toY);
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