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
    // Commit the current player's turn
    await this.gameController.endCurrentPlayerTurn();

    const players = actions.getPlayers();
    const currentPlayerId = actions.getActivePlayerId();
    const currentIndex = players.findIndex(p => p.id === currentPlayerId);

    if (currentIndex === players.length - 1) {
      // End of round: all players have moved
      RoundController.startNewRound();
    } else {
      // Move to next player
      const nextPlayerId = players[currentIndex + 1].id;
      actions.setActivePlayer(nextPlayerId);

      // Handle AI player if necessary
      if (!this.isHuman(nextPlayerId)) {
        await this.handleAITurn(nextPlayerId);
        // After AI acts, immediately move on
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
    console.log(`AI is thinking hard for player ${playerId}... or at least pretending to.`);
    // TODO: Implement AI turn logic
    await this.gameController.endCurrentPlayerTurn();
  }
} 