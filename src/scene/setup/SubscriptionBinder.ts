import type BoardScene from '../BoardScene';
import { StateObserver } from '../../utils/stateObserver';
import * as actions from "../../store/actions";

export class SubscriptionBinder {
  constructor(private scene: BoardScene) {}

  public bind(): void {
    const subscriptionManager = this.scene.getSubscriptionManager();

    subscriptionManager.initialize({
      animalRenderer: this.scene.getAnimalRenderer(),
      eggRenderer: this.scene.getEggRenderer(),
      biomeRenderer: this.scene.getBiomeRenderer(),
      moveRangeRenderer: this.scene.getMoveRangeRenderer(),
      tileRenderer: this.scene.getTileRenderer(),
      resourceRenderer: this.scene.getResourceRenderer(),
      selectionRenderer: this.scene.getSelectionRenderer(),
    });

    // No explicit callbacks needed for selection; handled by TileInteractionController and subscription manager
    subscriptionManager.setupSubscriptions();

    StateObserver.subscribe(
      'BoardScene.activePlayerFOW',
  state => state.activePlayerId,
  playerId => {
    this.scene.updateFogForPlayer(playerId);

    const board = actions.getBoard();
    const biomes = actions.getBiomes();
    const players = actions.getPlayers();
    if (board && players.length > 0) {
      this.scene.getBiomeOutlineRenderer().renderOutlines(board, biomes, players, playerId);
    }
  },
  { immediate: true }
    );
  }
} 