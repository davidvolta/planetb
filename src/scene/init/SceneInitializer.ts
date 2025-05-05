import { GameController } from '../../game/GameController';
import type BoardScene from '../BoardScene';

export class SceneInitializer {
  constructor(private scene: BoardScene) {}

  public run(): GameController {
    const animationController = this.scene.getAnimationController(); 
  
    const gameController = new GameController(animationController);
  
    this.scene.getCameraManager().initialize();
    this.scene.getLayerManager().setupLayers();
    animationController.initialize(
      this.scene.getAnchorX(),
      this.scene.getAnchorY()
    );
  
    return gameController;
  }
  
} 