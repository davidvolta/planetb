import { StateObserver } from '../utils/stateObserver';
import * as actions from '../store/actions';
import type BoardScene from '../scenes/BoardScene';
import { GameController } from './GameController';

export type GameMode = 'pvp' | 'pve' | 'sim';

/**
 * Service to manage turn sequencing for human and AI (or network) players.
 */
export class TurnController {
  private gameController: GameController;
  private running = false;
  private mode: GameMode;

  constructor(boardScene: BoardScene, mode: GameMode = 'pve') {
    // Initialize facade for game commands
    this.gameController = new GameController(boardScene);
    this.mode = mode;
  }

  /**
   * Start the turn loop. Each iteration handles one player's turn then advances.
   */
  public async start(): Promise<void> {
    this.running = true;
    while (this.running) {
      const playerId = actions.getCurrentPlayerId();
      console.log(`Starting turn for player ${playerId}`);

      if (this.isHuman(playerId)) {
        await this.handleHumanTurn();
      } else {
        await this.handleAITurn(playerId);
      }

      // Advance state and UI to next turn
      await this.gameController.nextTurn();
    }
  }

  /**
   * Stop the turn loop (e.g. when game ends).
   */
  public stop(): void {
    this.running = false;
  }

  /**
   * Determine if the given player ID represents a human-controlled player based on mode.
   */
  private isHuman(playerId: number): boolean {
    switch (this.mode) {
      case 'pvp':
        return true;
      case 'pve':
        return playerId === 0;
      case 'sim':
        return false;
    }
  }

  /**
   * Wait for UI or network to signal end of human turn.
   * Current implementation resolves once nextTurn() is called by UI.
   */
  private async handleHumanTurn(): Promise<void> {
    return new Promise(resolve => {
      const off = StateObserver.subscribe(
        'ui-turn',
        (_state) => ({}),
        () => {
          off();
          resolve();
        }
      );
    });
  }

  /**
   * Compute and execute AI commands for the given player.
   * TODO: integrate AI agent to emit and execute game commands via gameController.
   */
  private async handleAITurn(playerId: number): Promise<void> {
    // Placeholder for AI logic
    console.log(`AI turn logic not yet implemented for player ${playerId}`);
  }
} 