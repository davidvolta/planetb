import * as actions from '../store/actions';
import { RoundController } from './RoundController';
import { GameController } from './GameController';
import type BoardScene from '../scenes/BoardScene';

export type GameMode = 'pvp' | 'pve' | 'sim';

/**
 * Service to manage turn sequencing for human and AI players.
 */
export class TurnController {
  private gameController: GameController;
  private mode: GameMode;

  constructor(boardScene: BoardScene, mode: GameMode = 'pvp') {
    this.gameController = new GameController(boardScene);
    this.mode = mode;
  }

  /**
   * Advance to next player's move, or start a new round if all players have acted.
   */
  public async next(): Promise<void> {
    const currentPlayerId = actions.getActivePlayerId();
    // At the very start of the game loop, update the current player's biomes
    await actions.updatePlayerBiomes(currentPlayerId);
    const players = actions.getPlayers();
    const currentIndex = players.findIndex(p => p.id === currentPlayerId);

    if (currentIndex === -1) {
      return;
    }

    // Now finalize current player's actions
    await this.gameController.endCurrentPlayerTurn();

    if (currentIndex === players.length - 1) {
      RoundController.startNewRound();
    } else {
      const nextPlayerId = players[currentIndex + 1].id;
      actions.setActivePlayer(nextPlayerId);

      // Regenerate resources and produce eggs for this player's owned biomes

      
      if (!this.isHuman(nextPlayerId)) {
        await this.handleAITurn(nextPlayerId);
        await this.next();
      }
    }
  }

  /**
   * Determine if a player is human-controlled.
   */
  private isHuman(playerId: number): boolean {
    switch (this.mode) {
      case 'pvp': return true;
      case 'pve': return playerId === 0;
      case 'sim': return false;
      default: return false;
    }
  }

  /**
   * Execute AI actions for a player.
   */
  private async handleAITurn(playerId: number): Promise<void> {
    // TODO: Implement AI turn logic
    await this.gameController.endCurrentPlayerTurn();
  }
} 