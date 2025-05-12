import type BoardScene from '../BoardScene';
import { StateObserver } from '../../utils/stateObserver';
import * as actions from "../../store/actions";

export class SubscriptionBinder {
  constructor(private scene: BoardScene) {}

  public bind(): void {
    const subscriptionManager = this.scene.getSubscriptionManager();

    subscriptionManager.initialize({
      tileRenderer: this.scene.getTileRenderer(),
    });

    // No explicit callbacks needed for selection; handled by TileInteractionController and subscription manager
    subscriptionManager.setupSubscriptions();

    StateObserver.subscribe(
      'BoardScene.activePlayerFOW',
      state => state.activePlayerId,
      playerId => {
        this.scene.getVisibilityController().updateFogForActivePlayer(playerId);

        const board = actions.getBoard();
        const biomes = actions.getBiomes();
        const players = actions.getPlayers();
        if (board && players.length > 0) {
          this.scene.getBiomeRenderer().renderOutlines(board, biomes, players, playerId);
          this.scene.getBiomeRenderer().renderBiomes(Array.from(biomes.values()));
        }
      },
      { immediate: true }
    );
  }
} 