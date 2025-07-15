import { useGameStore, Biome, Egg } from '../gameStore';
import { EcosystemController } from '../../controllers/EcosystemController';

/**
 * Check if the selected biome is available for capture
 * Returns true if the biome can be captured
 */
export function isSelectedBiomeAvailableForCapture(): boolean {
  const state = useGameStore.getState();
  const biomeId = state.selectedBiomeId;
  if (!biomeId || !state.board) return false;
  
  // Filter animals to only those visible/owned by active player
  const activePlayerId = state.activePlayerId;
  const relevantAnimals = state.animals.filter(a => 
    a.ownerId === activePlayerId || 
    // Include animals on the biome's habitat tiles
    (state.board!.tiles[a.position.y]?.[a.position.x]?.biomeId === biomeId)
  );
  
  return EcosystemController.computeCanCapture(
    biomeId,
    state.board,
    relevantAnimals,
    state.biomes,
    activePlayerId
  );
}

/**
 * Checks if a biome can be captured based on animal position
 * Returns true if there's an active animal on the habitat that hasn't moved yet
 * @param biomeId The ID of the biome to check (pure wrapper)
 * @returns boolean indicating if biome can be captured
 */
export function canCaptureBiome(biomeId: string): boolean {
  const state = useGameStore.getState();
  
  // Filter animals to only those relevant for capture check
  const activePlayerId = state.activePlayerId;
  const relevantAnimals = state.animals.filter(a => 
    a.ownerId === activePlayerId || 
    // Include animals on the biome's habitat tiles
    (state.board!.tiles[a.position.y]?.[a.position.x]?.biomeId === biomeId)
  );
  
  return EcosystemController.computeCanCapture(
    biomeId,
    state.board!,
    relevantAnimals,
    state.biomes,
    activePlayerId
  );
}

/**
 * Capture a biome by ID
 * @param biomeId ID of the biome to capture
 */
export async function captureBiome(biomeId: string): Promise<void> {
  if (!canCaptureBiome(biomeId)) {
    throw new Error(`CaptureBiome failed: cannot capture biome ${biomeId}`);
  }
  const state = useGameStore.getState();
  
  // Filter animals to relevant ones for capture computation
  const activePlayerId = state.activePlayerId;
  const relevantAnimals = state.animals.filter(a => 
    a.ownerId === activePlayerId || 
    // Include animals on the biome's habitat tiles
    (state.board!.tiles[a.position.y]?.[a.position.x]?.biomeId === biomeId)
  );
  
  // Compute capture effects purely
  const { animals: newAnimals, biomes: newBiomes } =
    EcosystemController.computeCapture(
      biomeId,
      relevantAnimals,
      state.biomes,
      state.board!,
      activePlayerId,
      state.turn
    );

  // Transfer ownership of eggs in captured biome
  const updatedEggsRecord: Record<string, Egg> = { ...state.eggs };
  Object.values(updatedEggsRecord).forEach(e => {
    if (e.biomeId === biomeId) {
      e.ownerId = state.activePlayerId;
    }
  });

  // Commit updated state
  useGameStore.setState({ board: state.board!, players: state.players, biomes: newBiomes, animals: newAnimals, eggs: updatedEggsRecord });
  
  // Always reveal all tiles in a newly captured biome (defined below)
  revealBiomeTiles(biomeId);
  
  // Recalculate lushness for this biome
  await updateBiomeLushness(biomeId);
}

/**
 * Get all biomes from the game state
 */
export function getBiomes(): Map<string, Biome> {
  return useGameStore.getState().biomes;
}

/**
 * Get a specific biome by ID
 * @param id The ID of the biome to retrieve
 */
export function getBiomeById(id: string): Biome | undefined {
  return useGameStore.getState().biomes.get(id);
}

/**
 * Calculate lushness for a biome, returning all lushness values
 * @param biomeId The ID of the biome to calculate lushness for
 * @returns Object containing baseLushness, lushnessBoost, and totalLushness
 */
export function calculateBiomeLushness(biomeId: string): {
  baseLushness: number;
  lushnessBoost: number;
  totalLushness: number;
} {
  const state = useGameStore.getState();
  // Pass board and biomes into the controller
  return EcosystemController.calculateBiomeLushness(
    biomeId,
    state.board!,
    state.resources,
    state.biomes
  );
}

/**
 * Delegate lushness update to the EcosystemController.
 */
export async function updateBiomeLushness(biomeId: string): Promise<void> {
  const state = useGameStore.getState();
  const biome = state.biomes.get(biomeId);
  if (!biome) {
    throw new Error(`UpdateBiomeLushness failed: biome ${biomeId} not found`);
  }
  // Commit updated biomes map in one state update
  const updatedBiomes = EcosystemController.recalcBiomeLushness(state.biomes, biomeId, state.board!, state.resources);
  useGameStore.setState({ biomes: updatedBiomes });
}

/**
 * Reveal all tiles in a biome
 */
export function revealBiomeTiles(biomeId: string): void {
  const state = useGameStore.getState();
  if (!state.board) return;
  
  const board = state.board;
  const coordsToReveal = new Set<string>();
  
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      if (board.tiles[y][x].biomeId === biomeId) {
        coordsToReveal.add(`${x},${y}`);
      }
    }
  }
  
  const updatedPlayers = state.players.map(player => ({
    ...player,
    visibleTiles: new Set([...player.visibleTiles, ...coordsToReveal])
  }));
  
  useGameStore.setState({ players: updatedPlayers });
}