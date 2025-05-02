import * as actions from '../store/actions';
import * as CoordinateUtils from '../utils/CoordinateUtils';
import type { FogOfWarRenderer } from '../renderers/FogOfWarRenderer';

/**
 * Handles fog-of-war visibility updates.
 */
export class VisibilityController {
  constructor(private fogOfWarRenderer: FogOfWarRenderer) {}

  /**
   * Reveal tiles around a given coordinate by updating game state and renderer.
   */
  public revealAround(x: number, y: number): void {
    const board = actions.getBoard();
    if (!board) return;
    // Compute adjacent tiles including the current tile
    const tiles = CoordinateUtils.getAdjacentTiles(x, y, board.width, board.height);
    const uniqueTiles = CoordinateUtils.removeDuplicateTiles(tiles);

    // Update fog-of-war state
    actions.updateTilesVisibility(uniqueTiles.map(t => ({ x: t.x, y: t.y, visible: true })));
    // Update fog-of-war rendering
    this.fogOfWarRenderer.revealTiles(uniqueTiles);
  }
} 