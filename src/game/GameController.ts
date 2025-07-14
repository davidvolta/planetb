import * as actions from '../store/actions';
import * as playerActions from '../selectors/playerActions';
import type { Coordinate } from '../store/gameStore';
import { AnimationController } from '../controllers/AnimationController';

/**
 * Facade for executing game commands (player actions) with animation and state updates.
 */
export class GameController {
  constructor(private animationController: AnimationController) {}

  /**
   * Move a unit with coordinated state update and animation.
   * @param animalId ID of the animal to move
   * @param x Destination X coordinate
   * @param y Destination Y coordinate
   */
  async moveAnimal(animalId: string, x: number, y: number): Promise<void> {
    // Get current position before movement
    const unit = playerActions.getAnimals().find(a => a.id === animalId);
    if (!unit) {
      console.error(`[GameController] Cannot move animal ${animalId}: not found`);
      return;
    }
    
    const { x: fromX, y: fromY } = unit.position;
    
    // Let AnimationController handle both state and animation coordination
    await this.animationController.moveUnit(animalId, fromX, fromY, x, y);
  }

  /**
   * Spawn (hatch) a dormant unit (egg) into an active animal.
   * @param animalId ID of the egg to hatch
   */
  spawnAnimal(animalId: string): void {
    actions.spawnAnimal(animalId);
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