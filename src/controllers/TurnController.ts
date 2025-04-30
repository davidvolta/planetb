import * as actions from '../store/actions';
import { RoundController } from './RoundController';
import { GameController } from './GameController';
import type BoardScene from '../scenes/BoardScene';
import { AIController } from './AIController';
import { CommandExecutor } from './CommandExecutor';

export type GameMode = 'pvp' | 'pve' | 'sim';

/**
 * Service to manage turn sequencing for human and AI players.
 */
export class TurnController {
  private skipInitialUpdate: boolean = true;
  private gameController: GameController;
  private mode: GameMode;

  constructor(boardScene: BoardScene, mode: GameMode = 'pve') {
    this.gameController = new GameController(boardScene);
    this.mode = mode;
  }

  /**
   * Advance to next player's move, or start a new round if all players have acted.
   */
  public async next(): Promise<void> {
    // End current player's turn animations
    const prevPlayerId = actions.getActivePlayerId();
    await this.gameController.endCurrentPlayerTurn();
    // Mark outgoing player's units as moved
    actions.markPlayerUnitsMoved(prevPlayerId);

    const players = actions.getPlayers();
    const currentIndex = players.findIndex(p => p.id === prevPlayerId);

    if (currentIndex === -1) return;

     //  If it's the last player, start a new round
    if (currentIndex === players.length - 1) {
      RoundController.startNewRound();
      // Determine nextPlayerId after round reset
      const nextPlayerId = actions.getPlayers()[0].id;
      actions.setActivePlayer(nextPlayerId);
      // Reset movement flags and clear events for the new player
      actions.resetPlayerMovementAndEvents(nextPlayerId);
      // Skip first update (already seeded in initializeBoard)
      if (this.skipInitialUpdate) {
        this.skipInitialUpdate = false;
      } else {
        await actions.updatePlayerBiomes(nextPlayerId);
      }
      // In sim mode, trigger AI for the new player as well
      if (!this.isHuman(nextPlayerId)) {
        await this.handleAITurn(nextPlayerId);
        await this.next();
      }
    } else {
      //  If there are more players, move to the next
      const nextPlayerId = players[currentIndex + 1].id;
      actions.setActivePlayer(nextPlayerId);
      // Reset movement flags and clear events for the new player
      actions.resetPlayerMovementAndEvents(nextPlayerId);
      if (this.skipInitialUpdate) {
        this.skipInitialUpdate = false;
      } else {
        await actions.updatePlayerBiomes(nextPlayerId);
      }
      
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
    console.log(`Starting AI turn for player ${playerId}`);
    const board = actions.getBoard();
    const animals = actions.getAnimals();
    const biomes = actions.getBiomes();
    const gameState = { board, animals, biomes } as any;
    const ai = new AIController(gameState, playerId);
    const commands = ai.generateCommands();
    console.log('AI generated commands:', commands);
    const executor = new CommandExecutor(this.gameController);
    await executor.runAll(commands);
    await this.gameController.endCurrentPlayerTurn();
    console.log(`Ended AI turn for player ${playerId}`);
  }
} 