import type BoardScene from '../scenes/BoardScene';
import * as actions from '../store/actions';
import type { Coordinate } from '../store/gameStore';

/**
 * Facade for executing game commands (player actions) with animation and state updates.
 */
export class GameController {
  private boardScene: BoardScene;

  constructor(boardScene: BoardScene) {
    this.boardScene = boardScene;
  }

  /**
   * Move a unit with full animation and update game state.
   * @param unitId ID of the unit to move
   * @param x Destination X coordinate
   * @param y Destination Y coordinate
   */
  async moveUnit(unitId: string, x: number, y: number): Promise<void> {
    const sprite = this.boardScene.getAnimalRenderer().getSpriteById(unitId)!;
    const unit = actions.getAnimals().find(a => a.id === unitId)!;
    const fromX = unit.position.x;
    const fromY = unit.position.y;
    const anim = this.boardScene.getAnimationController();

    await anim.moveUnit(unitId, sprite, fromX, fromY, x, y);

    // Update unit position in game state after moving
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
    actions.selectResourceTile(coord);
    actions.harvestTileResource(amount);
    actions.selectResourceTile(null); // Clear selection after harvesting
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
    await this.boardScene.getAnimationController().waitForAllAnimationsComplete();
  }
} 