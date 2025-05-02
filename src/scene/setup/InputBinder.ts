import Phaser from "phaser";
import type BoardScene from '../BoardScene';

export class InputBinder {
  constructor(private scene: BoardScene) {}

  public bind(): void {
    const tileInteraction = this.scene.getTileInteractionController();
    const animationController = this.scene.getAnimationController();

    this.scene.input.on(
      'gameobjectdown',
      (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        // Prevent interaction while animations are playing
        if (animationController.hasActiveAnimations()) return;

        const gridX = gameObject.getData('gridX');
        const gridY = gameObject.getData('gridY');

        if (gridX !== undefined && gridY !== undefined) {
          tileInteraction.handleClick(gridX, gridY);
        }
      }
    );
  }
} 