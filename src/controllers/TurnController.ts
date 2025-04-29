import * as actions from '../store/actions';
import { RoundController } from './RoundController';
import { GameController } from './GameController';
import type BoardScene from '../scenes/BoardScene';

export type GameMode = 'pvp' | 'pve' | 'sim';

/**
 * Service to manage turn sequencing for human and AI players.
 */
export class TurnController {
  private skipInitialUpdate: boolean = true;
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
    // End current player's turn animations
    await this.gameController.endCurrentPlayerTurn();
    const players = actions.getPlayers();
    const currentPlayerId = actions.getActivePlayerId();
    const currentIndex = players.findIndex(p => p.id === currentPlayerId);

    if (currentIndex === -1) return;

    if (currentIndex === players.length - 1) {
      RoundController.startNewRound();
      // Determine nextPlayerId after round reset
      const nextPlayerId = actions.getPlayers()[0].id;
      actions.setActivePlayer(nextPlayerId);
      // Skip first update (already seeded in initializeBoard)
      if (this.skipInitialUpdate) {
        this.skipInitialUpdate = false;
      } else {
        await actions.updatePlayerBiomes(nextPlayerId);
      }
    } else {
      const nextPlayerId = players[currentIndex + 1].id;
      actions.setActivePlayer(nextPlayerId);
      if (this.skipInitialUpdate) {
        this.skipInitialUpdate = false;
      } else {
        await actions.updatePlayerBiomes(nextPlayerId);
      }

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