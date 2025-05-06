import type BoardScene from '../BoardScene';
import { StateObserver } from '../../utils/stateObserver';

export class SubscriptionBinder {
  constructor(private scene: BoardScene) {}

  public bind(): void {
    const subscriptionManager = this.scene.getSubscriptionManager();

    subscriptionManager.initialize({
      animalRenderer: this.scene.getAnimalRenderer(),
      biomeRenderer: this.scene.getBiomeRenderer(),
      moveRangeRenderer: this.scene.getMoveRangeRenderer(),
      tileRenderer: this.scene.getTileRenderer(),
      resourceRenderer: this.scene.getResourceRenderer(),
      selectionRenderer: this.scene.getSelectionRenderer(),
    });

    subscriptionManager.setupSubscriptions(
      (animalId, x, y) => {
        this.scene.handleUnitSelection(animalId);
      },
      (eggId, x, y) => {
        // Handle egg selection
        this.scene.handleEggSelection(eggId);
      }
    );

    StateObserver.subscribe(
      'BoardScene.activePlayerFOW',
      state => state.activePlayerId,
      playerId => this.scene.updateFogForPlayer(playerId),
      { immediate: true }
    );
  }
} 