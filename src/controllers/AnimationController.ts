import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import * as actions from '../store/actions';
import { computeDepth } from '../utils/DepthUtils';

/**
 * Controls and manages all animations in the board scene, including:
 * - Unit movement and displacement animations
 * - State tracking for ongoing animations
 * - Animation completion callbacks
 */
export class AnimationController {
  // Reference to the scene for accessing tweens
  private scene: Phaser.Scene;
  
  // Board properties needed for coordinate conversion
  private tileSize: number;
  private tileHeight: number;
  private anchorX: number;
  private anchorY: number;
  
  // Vertical offset to raise units above tiles
  private verticalOffset: number = -12;
  
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
    anchorX: number = 0,
    anchorY: number = 0
  ) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.tileHeight = tileHeight;
    this.anchorX = anchorX;
    this.anchorY = anchorY;
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
   * Animate a unit moving from one position to another
   * @param sprite The sprite to animate
   * @param fromX Starting X grid coordinate
   * @param fromY Starting Y grid coordinate
   * @param toX Destination X grid coordinate
   * @param toY Destination Y grid coordinate
   * @param options Animation options
   * @returns Promise that resolves when animation completes
   */
  animateUnitMovement(
    sprite: Phaser.GameObjects.Sprite,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    options: {
      applyTint?: boolean;
      disableInteractive?: boolean;
      duration?: number | null;
      onComplete?: () => void;
    } = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      // If there's no sprite, resolve immediately
      if (!sprite) {
        console.error('Cannot animate movement: sprite is missing');
        resolve();
        return;
      }
      
      // Set default options
      const {
        applyTint = false,
        disableInteractive = false,
        duration: fixedDuration = null,
        onComplete = () => {}
      } = options;
      
      // Convert grid coordinates to world coordinates
      const startPos = CoordinateUtils.gridToWorld(
        fromX, fromY, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
      );
      const endPos = CoordinateUtils.gridToWorld(
        toX, toY, this.tileSize, this.tileHeight, this.anchorX, this.anchorY
      );
      
      // Apply vertical offset
      const endWorldY = endPos.y + this.verticalOffset;
      
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
        targets: sprite,
        x: endPos.x,
        y: endWorldY,
        duration: duration,
        ease: 'Power2.out', // Quick acceleration, gentle stop
        onUpdate: () => {
          // Calculate current grid coordinates during movement
          const currentWorldY = sprite.y - this.verticalOffset;
          const currentWorldX = sprite.x;
          const relY = (currentWorldY - this.anchorY) / this.tileHeight;
          const relX = (currentWorldX - this.anchorX) / this.tileSize;
          const currentGridY = (relY * 2 - relX) / 2;
          const currentGridX = relY - currentGridY;

          // Update depth during movement
          sprite.setDepth(computeDepth(currentGridX, currentGridY, true));
        },
        onComplete: () => {
          // Update the sprite's stored grid coordinates
          sprite.setData('gridX', toX);
          sprite.setData('gridY', toY);
          
          // Set final depth at destination
          sprite.setDepth(computeDepth(toX, toY, true));
          
          // Apply light gray tint to indicate the unit has moved
          if (applyTint) {
            sprite.setTint(0xAAAAAA);
          }
          
          // Disable interactivity
          if (disableInteractive) {
            sprite.disableInteractive();
          }
          
          // Call the completion callback
          onComplete();
          
          // Resolve the promise
          resolve();
        }
      });
    });
  }
  
  /**
   * Handle unit movement from one position to another, including game state updates
   * @param unitId ID of the unit to move
   * @param sprite The sprite to animate
   * @param fromX Starting X grid coordinate
   * @param fromY Starting Y grid coordinate
   * @param toX Destination X grid coordinate
   * @param toY Destination Y grid coordinate
   * @param options Additional options
   * @returns Promise that resolves when movement is complete
   */
  async moveUnit(
    unitId: string,
    sprite: Phaser.GameObjects.Sprite,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    options: {
      onBeforeMove?: () => void;
      onAfterMove?: () => void;
    } = {}
  ): Promise<void> {
    // Call before-move callback if provided
    options.onBeforeMove?.();

    // Await the tween-based animation
    await this.animateUnitMovement(sprite, fromX, fromY, toX, toY, {
      applyTint: true,
      disableInteractive: true
    });

    // Update game state and call after-move callback
    actions.moveUnit(unitId, toX, toY);
    options.onAfterMove?.();
  }
  
  /**
   * Handle unit displacement (being pushed) from one position to another
   * @param unitId ID of the unit being displaced
   * @param sprite The sprite to animate
   * @param fromX Starting X grid coordinate
   * @param fromY Starting Y grid coordinate
   * @param toX Destination X grid coordinate
   * @param toY Destination Y grid coordinate
   * @param options Additional options
   * @returns Promise that resolves when displacement is complete
   */
  async displaceUnit(
    unitId: string,
    sprite: Phaser.GameObjects.Sprite,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    options: {
      onBeforeDisplace?: () => void;
      onAfterDisplace?: () => void;
    } = {}
  ): Promise<void> {
    // Call before-displace callback if provided
    options.onBeforeDisplace?.();

    // Await the tween-based displacement animation
    await this.animateUnitMovement(sprite, fromX, fromY, toX, toY, {
      applyTint: false,          // Don't apply the "moved" tint
      disableInteractive: false  // Don't disable interactivity
    });

    // Update game state after displacement completes
    actions.moveDisplacedUnit(unitId, toX, toY);
    options.onAfterDisplace?.();
  }
  
  /**
   * Clean up resources and cancel any running animations
   */
  destroy(): void {
    // Cancel any active tweens
    if (this.scene.tweens) {
      this.scene.tweens.killAll();
    }
  }
} 