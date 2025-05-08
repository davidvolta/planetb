import { GameController } from './GameController';
import * as actions from '../store/actions';

/**
 * A generic game command that can be executed by both human UI and AI.
 */
export type GameCommand =
  | { type: 'move';    unitId: string; x: number; y: number }
  | { type: 'capture'; biomeId: string }
  | { type: 'spawn';   unitId: string }
  | { type: 'harvest'; x: number; y: number; amount?: number };

/**
 * Central executor for sequencing and running GameCommand objects.
 */
export class CommandExecutor {
  constructor(private gc: GameController) {}

  /**
   * Execute a single command via the GameController facade.
   */
  public async execute(cmd: GameCommand): Promise<void> {
    switch (cmd.type) {
      case 'move':
        await this.gc.moveUnit(cmd.unitId, cmd.x, cmd.y);
        break;
      case 'capture':
        this.gc.captureBiome(cmd.biomeId);
        actions.selectBiome(null); // clear selection afterward
        break;
      case 'spawn':
        this.gc.spawnAnimal(cmd.unitId);
        actions.deselectUnit();
        break;
      case 'harvest':
        const { x, y, amount = 3 } = cmd;
        this.gc.harvestTile({ x, y }, amount);
        break;
      default:
        throw new Error(`CommandExecutor: unknown command type '${(cmd as any).type}'`);
    }
  }

  /**
   * Execute an array of commands in sequence, waiting for each to complete.
   */
  public async runAll(cmds: GameCommand[]): Promise<void> {
    for (const cmd of cmds) {
      await this.execute(cmd);
      // Debug: pause between AI commands to visually confirm fog updates
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
} 