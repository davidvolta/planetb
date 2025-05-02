import { GameController } from '../../game/GameController';
import { VisibilityController } from '../../controllers/VisibilityController';
import type BoardScene from '../BoardScene';

export class SceneInitializer {
  constructor(private scene: BoardScene) {}

  public run(): GameController {
    const visibilityController = this.scene.getVisibilityController();
    const gameController = new GameController(this.scene, visibilityController);

    this.scene.getCameraManager().initialize();
    this.scene.getLayerManager().setupLayers();
    this.scene.getAnimationController().initialize(
      this.scene.getAnchorX(),
      this.scene.getAnchorY()
    );

    return gameController;
  }
} 