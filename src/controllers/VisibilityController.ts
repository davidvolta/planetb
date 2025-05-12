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

  public revealBiomeTiles(biomeId: string): void {
    const tiles = actions.getTilesForBiome(biomeId);
    if (tiles.length === 0) return;
  
    actions.updateTilesVisibility(tiles.map(({ x, y }) => ({ x, y, visible: true })));
    this.fogOfWarRenderer.revealTiles(tiles);
  }

  
  /**
   * Update player visibility based on the current FOW state.
   */
  public updatePlayerVisibility(playerId: number): void {
    const board = actions.getBoard();
    if (!board) return;

    // Get visible tiles for the player
    const visibleCoords = actions.getVisibleTilesForPlayer(playerId);
    const uniqueTiles = CoordinateUtils.removeDuplicateTiles(visibleCoords);

    // Update fog-of-war state
    actions.updateTilesVisibility(uniqueTiles.map(t => ({ x: t.x, y: t.y, visible: true })));
    // Update fog-of-war rendering
    this.fogOfWarRenderer.revealTiles(uniqueTiles);
  }

  /**
   * Initialize visibility for starting units and habitats.
   */
  public initializeVisibility(): void {
    const board = actions.getBoard();
    if (!board) return;

    const activePlayerId = actions.getActivePlayerId();

    const eggsRecord = actions.getEggs();
    const unitAdjacents = actions.getAnimals()
      .filter(a => a.ownerId === activePlayerId && !(a.id in eggsRecord))
      .flatMap(a => CoordinateUtils.getAdjacentTiles(a.position.x, a.position.y, board.width, board.height));
    const uniqueUnitTiles = CoordinateUtils.removeDuplicateTiles(unitAdjacents);

    // All tiles of owned biomes
    const biomeTiles = Array.from(actions.getBiomes().entries())
      .filter(([_, b]) => b.ownerId === activePlayerId)
      .flatMap(([id]) => actions.getTilesForBiome(id).map(({ x, y }) => ({ x, y })));
    const uniqueBiomeTiles = CoordinateUtils.removeDuplicateTiles(biomeTiles);

    // Combine and batch update visibility
    const allTilesToReveal = [...uniqueUnitTiles, ...uniqueBiomeTiles];
    if (allTilesToReveal.length > 0) {
      const visibilityUpdates = allTilesToReveal.map(({ x, y }) => ({ x, y, visible: true }));
      actions.updateTilesVisibility(visibilityUpdates);
      this.fogOfWarRenderer.revealTiles(allTilesToReveal);
    }
  }

  public toggleFogOfWar(enabled: boolean): void {
    const board = actions.getBoard();
    if (!board) return;
  
    if (enabled) {
      this.fogOfWarRenderer.createFogOfWar(board);
  
      const activePlayerId = actions.getActivePlayerId();
      this.updatePlayerVisibility(activePlayerId);
    } else {
      this.fogOfWarRenderer.clearFogOfWar();
    }
  }
  /**
   * Updates the fog-of-war visuals when the active player changes.
   * This is called from BoardScene's setupVisibilitySubscriptions.
   */
  public updateFogForActivePlayer(playerId: number): void {
    const board = actions.getBoard();
    if (!board) return;
  
    this.fogOfWarRenderer.clearFogOfWar();
    this.fogOfWarRenderer.createFogOfWar(board);
  
    const coords = actions.getVisibleTilesForPlayer(playerId);
    if (coords.length > 0) {
      this.fogOfWarRenderer.revealTiles(coords);
    }
  }
  
  
} 