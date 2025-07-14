import { useGameStore, Resource } from '../gameStore';
import { EcosystemController } from '../../controllers/EcosystemController';
import { RESOURCE_GENERATION_PERCENTAGE } from '../../constants/gameConfig';
import { updateBiomeLushness } from './biomeActions';

/**
 * Reset all resources on the board with specified generation chance
 */
export function resetResources(
  resourceChance: number = RESOURCE_GENERATION_PERCENTAGE
): void {
  const state = useGameStore.getState();
  const board = state.board;
  if (!board) {
    console.warn("Board not initialized, cannot reset resources");
    return;
  }

  const clonedTiles = board.tiles.map(row =>
    row.map(tile => ({ ...tile }))
  );
  const newBoard = { ...board, tiles: clonedTiles };

  // Create a copy of biomes so EcosystemController can mutate it
  const updatedBiomes = new Map(state.biomes);
  
  // EcosystemController.resetResources will set the correct biome resource counts
  const resourcesRecord = EcosystemController.resetResources(
    newBoard,
    updatedBiomes,
    resourceChance
  );

  useGameStore.setState({ board: newBoard, biomes: updatedBiomes, resources: resourcesRecord });

  updatedBiomes.forEach((_b, biomeId) => updateBiomeLushness(biomeId));
}

/**
 * Harvest resources from the currently selected tile
 */
export async function harvestTileResource(amount: number): Promise<void> {
  const state = useGameStore.getState();
  const coord = state.selectedResource;
  if (!coord) {
    throw new Error('HarvestTileResource failed: no resource tile selected');
  }
  if (!state.board) {
    throw new Error('HarvestTileResource failed: board not initialized');
  }

  const tile = state.board.tiles[coord.y][coord.x];
  if (!tile.biomeId) {
    throw new Error('HarvestTileResource failed: tile has no biome');
  }

  const { resources, biomes } = EcosystemController.harvestResource(
    coord,
    amount,
    state.resources,
    state.biomes,
    state.activePlayerId
  );

  useGameStore.setState({ resources, biomes });
  await updateBiomeLushness(tile.biomeId);
}

/**
 * Get all resources from the game state
 */
export function getResources(): Record<string, Resource> {
  return useGameStore.getState().resources;
}

/**
 * Get resource at specific coordinates
 */
export function getResourceAt(x: number, y: number): Resource | undefined {
  const resources = useGameStore.getState().resources;
  return resources[`${x},${y}`];
}