import { useGameStore, Resource, Tile } from '../gameStore';
import { TerrainType } from '../../types/gameTypes';
import { tileHasEgg } from './eggActions';

export interface TileResult {
  x: number;
  y: number;
  tile: Tile;
}

export type TileFilterFn = (tile: Tile, x: number, y: number) => boolean;

/**
 * Get tiles that match a specified filter condition
 */
export function getTilesByFilter(filterFn: TileFilterFn): TileResult[] {
  const state = useGameStore.getState();
  if (!state.board) return [];
  
  const filteredTiles: TileResult[] = [];
  
  for (let y = 0; y < state.board.height; y++) {
    for (let x = 0; x < state.board.width; x++) {
      const tile = state.board.tiles[y][x];
      if (filterFn(tile, x, y)) {
        filteredTiles.push({
          tile,
          x,
          y
        });
      }
    }
  }
  
  return filteredTiles;
}

/**
 * Get all tiles for a specific biome
 */
export function getTilesForBiome(biomeId: string): TileResult[] {
  return getTilesByFilter((tile) => tile.biomeId === biomeId);
}

/**
 * Get all tiles with a specific terrain type
 */
export function getTilesByTerrain(terrainType: TerrainType): TileResult[] {
  return getTilesByFilter((tile) => tile.terrain === terrainType);
}

/**
 * Get all habitat tiles
 */
export function getHabitatTiles(): TileResult[] {
  return getTilesByFilter((tile) => tile.isHabitat);
}

/**
 * Get blank tiles suitable for egg placement in a specific biome
 */
export function getEggPlacementTiles(biomeId: string): TileResult[] {
  const resources = useGameStore.getState().resources;
  return getTilesByFilter((tile, x, y) =>
    tile.biomeId === biomeId &&
    !resourceExists(x, y, resources) &&
    !tile.isHabitat &&
    !tileHasEgg(x, y)
  );
}

/**
 * Get all tiles from the game board
 */
export function getTiles(): TileResult[] {
  const state = useGameStore.getState();
  if (!state.board) return [];
  
  const tiles: TileResult[] = [];
  
  for (let y = 0; y < state.board.height; y++) {
    for (let x = 0; x < state.board.width; x++) {
      const tile = state.board.tiles[y][x];
      tiles.push({
        tile,
        x,
        y
      });
    }
  }
  
  return tiles;
}

/**
 * Get all blank tiles (no resources, not habitats, no eggs)
 */
export function getBlankTiles(): TileResult[] {
  const resources = useGameStore.getState().resources;
  return getTilesByFilter((tile, x, y) =>
    !resourceExists(x, y, resources) && !tile.isHabitat && !tileHasEgg(x, y)
  );
}

/**
 * Get all tiles containing eggs
 */
export function getEggTiles(): TileResult[] {
  return getTilesByFilter((tile, x, y) => tileHasEgg(x, y));
}

// Helper function for resource existence check
function resourceExists(x: number, y: number, resources: Record<string, Resource>): boolean {
  return !!resources[`${x},${y}`];
}