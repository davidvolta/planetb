import * as actions from '../store/actions';
import { RoundController } from '../controllers/RoundController';
import { GameController } from './GameController';
import { AIController } from '../controllers/AIController';
import { CommandExecutor } from './CommandExecutor';
import { GameMode } from '../env/GameEnvironment';
//import { PromptBuilder } from '../AI/PromptBuilder';
//import { LLMClient } from '../AI/LLMClient';
//import { canExecuteCommand } from '../utils/canExecuteCommand';


/**
 * Service to manage turn sequencing for human and AI players.
 */
export class TurnController {
  private skipInitialUpdate: boolean = true;
  private gameController: GameController;
  private mode: GameMode;

  constructor(gameController: GameController, mode: GameMode) {
    this.gameController = gameController;
    this.mode = mode;
  }

  /**
   * Advance to next player's move, or start a new round if all players have acted.
   */
  public async next(): Promise<void> {
    const prevPlayerId = actions.getActivePlayerId();

    await this.gameController.endCurrentPlayerTurn();
    actions.markPlayerUnitsMoved(prevPlayerId);

    const players = actions.getPlayers();
    const currentIndex = players.findIndex(p => p.id === prevPlayerId);
    if (currentIndex === -1) return;

    // Last player -> new round
    if (currentIndex === players.length - 1) {
      RoundController.startNewRound();
      const nextPlayerId = players[0].id;
      actions.setActivePlayer(nextPlayerId);
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
    } else {
      // Move to next player
      const nextPlayerId = players[currentIndex + 1].id;
      actions.setActivePlayer(nextPlayerId);
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

  private isHuman(playerId: number): boolean {
    switch (this.mode) {
      case 'pvp': return true;
      case 'pve': return playerId === 0;
      case 'sim': return false;
      default: return false;
    }
  }

  private async handleAITurn(playerId: number): Promise<void> {
    const board = actions.getBoard();
    const animals = actions.getAnimals();
    const biomes = actions.getBiomes();
    const eggs = actions.getEggs();
    const gameState = { board, animals, biomes, eggs } as any;

    // Log the prompt for debugging
    //console.log(PromptBuilder.buildPrompt(gameState, playerId));

    const ai = new AIController(gameState, playerId);
    const commands = ai.generateCommands();

    // TODO: Uncomment this to use the LLM to generate commands
    //const commands = await LLMClient.requestStrategy(gameState, playerId);
    //const legalCommands = commands.filter(c => canExecuteCommand(c, gameState, playerId));
    //console.log('🛡️ Legal AI Commands:', legalCommands);
    
    const executor = new CommandExecutor(this.gameController);
    //await executor.runAll(legalCommands); // TODO: Uncomment this to use the LLM to generate commands
    await executor.runAll(commands);

    await this.gameController.endCurrentPlayerTurn();
  }
}
