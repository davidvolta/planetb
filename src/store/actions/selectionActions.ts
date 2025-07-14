import { useGameStore, Coordinate } from '../gameStore';
import { SelectionController } from '../../controllers/SelectionController';

/**
 * Select an egg by ID or clear the selection.
 */
export function selectEgg(id: string | null): void {
  const selectionState = SelectionController.selectEgg(id);
  useGameStore.getState().selectEgg(selectionState);
}

/**
 * Select an animal by ID
 */
export async function selectAnimal(unitId: string | null): Promise<void> {
  const state = useGameStore.getState();
  if (unitId !== null && !state.animals.some(a => a.id === unitId)) {
    throw new Error(`SelectAnimal failed: animal ${unitId} not found`);
  }
  
  const selectionState = SelectionController.selectAnimal(unitId, state.animals, state.board);
  useGameStore.getState().selectAnimal(selectionState);
}

/**
 * Deselect the current animal selection
 */
export async function deselectUnit(): Promise<void> {
  const selectionState = SelectionController.selectAnimal(null, [], null);
  useGameStore.getState().selectAnimal(selectionState);
}

/**
 * Select a biome by ID
 * @param biomeId ID of the biome to select, or null to deselect
 */
export async function selectBiome(biomeId: string | null): Promise<void> {
  const state = useGameStore.getState();
  if (biomeId !== null && !state.biomes.has(biomeId)) {
    throw new Error(`SelectBiome failed: biome ${biomeId} not found`);
  }
  
  const selectionState = SelectionController.selectBiome(biomeId, state.biomes);
  useGameStore.getState().selectBiome(selectionState);
}

/**
 * Select a resource tile for harvesting
 * @param coord Coordinates of the resource tile or null to clear selection
 */
export async function selectResourceTile(coord: Coordinate | null): Promise<void> {
  const state = useGameStore.getState();
  if (coord !== null) {
    const board = state.board;
    if (!board || coord.x < 0 || coord.x >= board.width || coord.y < 0 || coord.y >= board.height) {
      throw new Error(`SelectResourceTile failed: invalid coordinate (${coord.x},${coord.y})`);
    }
  }
  
  const selectionState = SelectionController.selectResource(coord);
  useGameStore.getState().selectResource(selectionState);
}

/**
 * Get the currently selected resource tile
 */
export function getSelectedResource(): Coordinate | null {
  return useGameStore.getState().selectedResource;
}

/**
 * Get the currently selected biome ID
 */
export function getSelectedBiomeId(): string | null {
  return useGameStore.getState().selectedBiomeId;
}

/**
 * Check if we are in move mode
 */
export function isMoveMode(): boolean {
  return useGameStore.getState().moveMode;
}