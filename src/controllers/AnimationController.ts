import Phaser from 'phaser';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import * as actions from '../store/actions';

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
  
  // Flag to track if animations are in progress
  private animationInProgress: boolean = false;
  
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
   * Check if any animation is currently in progress
   * @returns Whether an animation is running
   */
  isAnimating(): boolean {
    return this.animationInProgress;
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
      isDisplacement?: boolean;
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
        isDisplacement = false,
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
        targets: sprite,
        x: endPos.x,
        y: endWorldY,
        duration: duration,
        ease: 'Power2.out', // Quick acceleration, gentle stop
        onUpdate: () => {
          // Calculate current grid Y position based on the sprite's current position
          const currentWorldY = sprite.y - this.verticalOffset;
          const currentWorldX = sprite.x;
          
          // Reverse the isometric projection to get approximate grid coordinates
          const relY = (currentWorldY - this.anchorY) / this.tileHeight;
          const relX = (currentWorldX - this.anchorX) / this.tileSize;
          
          // Calculate approximate grid Y
          const currentGridY = (relY * 2 - relX) / 2;
          
          // Calculate approximate grid X
          const currentGridX = relY - currentGridY;
          
          // Update depth during movement with a little helper formula that calculates the
          // appropriate depth for isometric display based on grid position
          const baseDepth = 5;
          const positionOffset = (currentGridX + currentGridY) / 1000;
          const stateOffset = 0.0005; // Small offset to ensure active units appear above others
          sprite.setDepth(baseDepth + positionOffset + stateOffset);
        },
        onComplete: () => {
          // Update the sprite's stored grid coordinates
          sprite.setData('gridX', toX);
          sprite.setData('gridY', toY);
          
          // Set final depth at destination
          const baseDepth = 5;
          const positionOffset = (toX + toY) / 1000;
          const stateOffset = 0.0005;
          sprite.setDepth(baseDepth + positionOffset + stateOffset);
          
          // Apply light gray tint to indicate the unit has moved
          if (applyTint) {
            sprite.setTint(0xAAAAAA);
          }
          
          // Disable interactivity
          if (disableInteractive) {
            sprite.disableInteractive();
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
  moveUnit(
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
    return new Promise((resolve) => {
      // Call before move callback if provided
      if (options.onBeforeMove) {
        options.onBeforeMove();
      }
      
      // Animate the unit movement
      this.animateUnitMovement(sprite, fromX, fromY, toX, toY, {
        applyTint: true,
        disableInteractive: true,
        onComplete: () => {
          // Update the game state after animation completes
          actions.moveUnit(unitId, toX, toY);
          
          // Call after move callback if provided
          if (options.onAfterMove) {
            options.onAfterMove();
          }
          
          // Resolve the promise
          resolve();
        }
      });
    });
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
  displaceUnit(
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
    return new Promise((resolve) => {
      // Call before displacement callback if provided
      if (options.onBeforeDisplace) {
        options.onBeforeDisplace();
      }
      
      // Animate the unit displacement
      this.animateUnitMovement(sprite, fromX, fromY, toX, toY, {
        applyTint: false,           // Don't apply the "moved" tint
        disableInteractive: false,  // Don't disable interactivity
        isDisplacement: true,
        onComplete: () => {
          // Update the game state after animation completes
          actions.moveDisplacedUnit(unitId, toX, toY);
          
          // Call after displacement callback if provided
          if (options.onAfterDisplace) {
            options.onAfterDisplace();
          }
          
          // Resolve the promise
          resolve();
        }
      });
    });
  }
  
  /**
   * Create a brief pulse/bounce animation for a sprite
   * @param sprite The sprite to animate
   * @param scale Scale factor for the pulse (1.0 = no change)
   * @param duration Duration of the animation in ms
   * @returns Promise that resolves when animation completes
   */
  pulseSprite(
    sprite: Phaser.GameObjects.Sprite,
    scale: number = 1.2,
    duration: number = 200
  ): Promise<void> {
    return new Promise((resolve) => {
      // Save original scale
      const originalScale = sprite.scale;
      
      // Create scale up tween
      this.scene.tweens.add({
        targets: sprite,
        scaleX: originalScale * scale,
        scaleY: originalScale * scale,
        duration: duration / 2,
        ease: 'Sine.easeOut',
        yoyo: true,
        onComplete: () => {
          // Ensure sprite is back to original scale
          sprite.setScale(originalScale);
          resolve();
        }
      });
    });
  }
  
  /**
   * Fade in a sprite from transparent to fully visible
   * @param sprite The sprite to animate
   * @param duration Duration of the animation in ms
   * @returns Promise that resolves when animation completes
   */
  fadeInSprite(
    sprite: Phaser.GameObjects.Sprite,
    duration: number = 300
  ): Promise<void> {
    return new Promise((resolve) => {
      // Set initial alpha
      sprite.setAlpha(0);
      
      // Create fade in tween
      this.scene.tweens.add({
        targets: sprite,
        alpha: 1,
        duration: duration,
        ease: 'Sine.easeIn',
        onComplete: () => {
          resolve();
        }
      });
    });
  }
  
  /**
   * Fade out a sprite from fully visible to transparent
   * @param sprite The sprite to animate
   * @param duration Duration of the animation in ms
   * @param destroy Whether to destroy the sprite after fading
   * @returns Promise that resolves when animation completes
   */
  fadeOutSprite(
    sprite: Phaser.GameObjects.Sprite,
    duration: number = 300,
    destroy: boolean = false
  ): Promise<void> {
    return new Promise((resolve) => {
      // Create fade out tween
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0,
        duration: duration,
        ease: 'Sine.easeOut',
        onComplete: () => {
          if (destroy) {
            sprite.destroy();
          }
          resolve();
        }
      });
    });
  }
  
  /**
   * Clean up resources and cancel any running animations
   */
  destroy(): void {
    // Set animating flag to false
    this.animationInProgress = false;
    
    // Cancel any active tweens
    if (this.scene.tweens) {
      this.scene.tweens.killAll();
    }
  }
} 