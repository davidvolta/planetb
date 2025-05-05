import * as actions from '../store/actions';
import type { Coordinate } from '../store/gameStore';
import { AnimationController } from '../controllers/AnimationController';

/**
 * Facade for executing game commands (player actions) with animation and state updates.
 */
export class GameController {
  constructor(private animationController: AnimationController) {}

  /**
   * Move a unit with full animation and update game state.
   * @param unitId ID of the unit to move
   * @param x Destination X coordinate
   * @param y Destination Y coordinate
   */
  async moveUnit(unitId: string, x: number, y: number): Promise<void> {
    const unit = actions.getAnimals().find(a => a.id === unitId)!;
    const fromX = unit.position.x;
    const fromY = unit.position.y;
    await this.animationController.moveUnit(unitId, fromX, fromY, x, y);
    actions.moveUnit(unitId, x, y);
  }

  /**
   * Evolve a dormant unit (egg) into an active animal.
   * @param unitId ID of the unit to evolve
   */
  evolveAnimal(unitId: string): void {
    actions.evolveAnimal(unitId);
  }

  /**
   * Harvest resources at the specified tile.
   * @param coord Coordinates to harvest
   * @param amount Amount to harvest (default 3)
   */
  harvestTile(coord: Coordinate, amount: number = 3): void {
    actions.harvestTileResource(amount);
  }

  /**
   * Capture a biome by its ID.
   * @param biomeId ID of the biome to capture
   */
  captureBiome(biomeId: string): void {
    actions.captureBiome(biomeId);
  }

  /**
   * Finalize the current player's turn: wait for animations and commit end-of-turn.
   */
  public async endCurrentPlayerTurn(): Promise<void> {
    // Wait for all animations to complete before ending turn
    await this.animationController.waitForAllAnimationsComplete();
  }
} 