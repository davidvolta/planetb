import * as actions from '../store/actions';
import type BoardScene from '../scenes/BoardScene';
import { GameController } from './GameController';

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
   * Execute one full turn: commit current player's actions, then if in PVE run AI and commit again.
   */
  public async next(): Promise<void> {
    // Commit end of current player's turn
    await this.gameController.nextTurn();
    const playerId = actions.getCurrentPlayerId();

    // If in PVE mode and next player is AI, execute AI actions and commit again
    if (this.mode === 'pve' && !this.isHuman(playerId)) {
      await this.handleAITurn(playerId);
      await this.gameController.nextTurn();
    }
  }

  /**
   * Determine if the given player ID should be human-controlled.
   */
  private isHuman(playerId: number): boolean {
    switch (this.mode) {
      case 'pvp': return true;
      case 'pve': return playerId === 0;
      case 'sim': return false;
    }
  }

  /**
   * Compute and execute AI commands for the given player.
   */
  private async handleAITurn(playerId: number): Promise<void> {
    console.log(`AI turn logic not yet implemented for player ${playerId}`);
  }
} 