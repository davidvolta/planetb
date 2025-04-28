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
  const players = actions.getPlayers();
  const currentPlayerId = actions.getActivePlayerId(); // ✅ Grab the ID BEFORE finalizing
  const currentIndex = players.findIndex(p => p.id === currentPlayerId);

  if (currentIndex === -1) {
    console.error('[TurnController] Current player ID not found in players list.');
    return;
  }

  // Now finalize current player's actions
  await this.gameController.endCurrentPlayerTurn();
  console.log('[TurnController] Finished player:', currentPlayerId);

  if (currentIndex === players.length - 1) {
    console.log('[TurnController] All players finished. Starting new round...');
    RoundController.startNewRound();
  } else {
    const nextPlayerId = players[currentIndex + 1].id;
    actions.setActivePlayer(nextPlayerId);
    console.log('[TurnController] Now active player:', nextPlayerId);

    if (!this.isHuman(nextPlayerId)) {
      console.log('[TurnController] AI moving for Player', nextPlayerId);
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
    console.log(`AI is thinking hard for player ${playerId}... or at least pretending to.`);
    // TODO: Implement AI turn logic
    await this.gameController.endCurrentPlayerTurn();
  }
} 