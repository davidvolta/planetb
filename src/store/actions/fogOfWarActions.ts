import { useGameStore } from '../gameStore';
import { FogOfWarController } from '../../controllers/FogOfWarController';
import * as CoordinateUtils from '../../utils/CoordinateUtils';

/**
 * Set the global fog of war enabled/disabled state
 */
export function setFogOfWarEnabled(enabled: boolean): void {
  const state = useGameStore.getState();
  const result = FogOfWarController.toggleFogOfWar(enabled, state);
  useGameStore.getState().toggleFogOfWar(result.fogOfWarEnabled, result.players);
}

/**
 * Get the current fog of war enabled/disabled state
 */
export function getFogOfWarEnabled(): boolean {
  return useGameStore.getState().fogOfWarEnabled;
}

/**
 * Get all tiles currently visible to the given player
 */
export function getVisibleTilesForPlayer(playerId: number): { x: number; y: number }[] {
  const state = useGameStore.getState();
  if (!state.board) return [];
  if (!state.fogOfWarEnabled) {
    // FOW disabled: all tiles are visible
    const tiles: { x: number; y: number }[] = [];
    for (let y = 0; y < state.board.height; y++) {
      for (let x = 0; x < state.board.width; x++) {
        tiles.push({ x, y });
      }
    }
    return tiles;
  }
  const player = state.players.find(p => p.id === playerId);
  if (!player) return [];
  return Array.from(player.visibleTiles).map(str => {
    const [x, y] = str.split(',').map(Number);
    return { x, y };
  });
}

/**
 * Reveal tiles around a given coordinate for the active player
 */
export function revealTilesAround(x: number, y: number): void {
  const state = useGameStore.getState();
  const board = state.board;
  if (!board) return;
  
  // Compute adjacent tiles including the current tile
  const tiles = CoordinateUtils.getAdjacentTiles(x, y, board.width, board.height);
  const uniqueTiles = CoordinateUtils.removeDuplicateTiles(tiles);

  // Update fog-of-war state for active player
  updateTilesVisibility(uniqueTiles.map(t => ({ x: t.x, y: t.y, visible: true })));
}


/**
 * Update tiles visibility for the active player
 */
export async function updateTilesVisibility(tiles: { x: number; y: number; visible: boolean }[]): Promise<void> {
  if (tiles.length === 0) return;
  useGameStore.setState(state => {
    const activePlayerId = state.activePlayerId;
    const updatedPlayers = state.players.map(player => {
      if (player.id !== activePlayerId) return player;
      const newVisible = new Set(player.visibleTiles);
      for (const { x, y, visible } of tiles) {
        const key = `${x},${y}`;
        if (visible) newVisible.add(key);
        else newVisible.delete(key);
      }
      return { ...player, visibleTiles: newVisible };
    });
    return { players: updatedPlayers };
  });
}