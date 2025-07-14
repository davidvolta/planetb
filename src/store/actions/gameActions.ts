import { useGameStore } from '../gameStore';
import { EcosystemController } from '../../controllers/EcosystemController';
import { HealthController } from '../../controllers/HealthController';
import { BLANK_DISPLACEMENT_EVENT, BLANK_SPAWN_EVENT, BLANK_BIOME_CAPTURE_EVENT } from '../../types/events';
import { addEgg } from './eggActions';
import * as CoordinateUtils from '../../utils/CoordinateUtils';

/**
 * Get the complete game state (for debugging/serialization)
 */
export function getFullGameState() {
  return useGameStore.getState();
}

/**
 * Reset movement flags and clear events for a single player's turn
 */
export function resetPlayerMovementAndEvents(playerId: number): void {
  useGameStore.setState((state) => ({
    animals: state.animals.map(a =>
      a.ownerId === playerId ? { ...a, hasMoved: false } : a
    ),
    displacementEvent: { ...BLANK_DISPLACEMENT_EVENT },
    spawnEvent: { ...BLANK_SPAWN_EVENT },
    biomeCaptureEvent: { ...BLANK_BIOME_CAPTURE_EVENT }
  }));
}

/**
 * Mark all units of the given player as moved
 */
export function markPlayerUnitsMoved(playerId: number): void {
  useGameStore.setState((state) => ({
    animals: state.animals.map(a =>
      a.ownerId === playerId ? { ...a, hasMoved: true } : a
    )
  }));
}

/**
 * Update resources and egg production for a single player's owned biomes at the start of their turn.
 */
export async function updatePlayerBiomes(playerId: number): Promise<void> {
  const state = useGameStore.getState();
  const turn = state.turn;
  const board = state.board!;
  const allBiomes = state.biomes;
  let animals = state.animals;

  // Update health for this player's animals only
  console.log(`🏥 [updatePlayerBiomes] Updating health for player ${playerId}'s animals`);
  const playerAnimals = animals.filter(a => a.ownerId === playerId);
  const otherAnimals = animals.filter(a => a.ownerId !== playerId);
  
  const healthUpdatedPlayerAnimals = HealthController.updateHealthForTurn(playerAnimals, allBiomes, board);
  animals = [...otherAnimals, ...healthUpdatedPlayerAnimals];
  
  // Update the game state with health-updated animals
  useGameStore.setState({ animals });

  // Filter to only this player's biomes
  const playerBiomes = new Map();
  allBiomes.forEach((b, id) => {
    if (b.ownerId === playerId) {
      playerBiomes.set(id, b);
    }
  });

  // Regenerate resources for these biomes
  const newResources = EcosystemController.regenerateResources(state.resources, playerBiomes);

  // Update resources slice
  useGameStore.setState({ resources: newResources });

  const newBoard = board;
   
  // Produce eggs via EggProducer
  const { EggProducer } = await import('../../controllers/EggProducer');
  const { eggs: newEggs, biomes: postEggBiomes } = EggProducer.produce(
    turn,
    playerId,
    newBoard,
    playerBiomes,
    newResources
  );

  newEggs.forEach(addEgg);

  const postEggAnimals = animals;

  // Merge updated biomes back into full map
  const mergedBiomes = new Map(allBiomes);
  postEggBiomes.forEach((b, id) => mergedBiomes.set(id, b));

  // Recalculate lushness for all biomes
  const newBiomes = EcosystemController.recalcLushnessState(newBoard, newResources, mergedBiomes);

  // Commit the partial update including regenerated resources
  useGameStore.setState({
    board: newBoard,
    animals: postEggAnimals,
    biomes: newBiomes,
    resources: newResources
  });
}

/**
 * Get initial visible tiles for initialization for the active player
 */
export function getInitialVisibleTiles(): { x: number, y: number }[] {
  const state = useGameStore.getState();
  const board = state.board;
  if (!board) return [];

  const activePlayerId = state.activePlayerId;
  
  // Collect tiles around non-egg animals
  const eggsRecord = state.eggs;
  const unitAdjacents = state.animals
    .filter(a => a.ownerId === activePlayerId && !(a.id in eggsRecord))
    .flatMap(a => CoordinateUtils.getAdjacentTiles(a.position.x, a.position.y, board.width, board.height));
  const uniqueUnitTiles = CoordinateUtils.removeDuplicateTiles(unitAdjacents);

  // Collect tiles of owned biomes  
  const biomeTiles = Array.from(state.biomes.entries())
    .filter(([, b]) => b.ownerId === activePlayerId)
    .flatMap(([id]) => {
      // We need to get tiles for biome - this requires importing from tileActions
      const tiles = [];
      for (let y = 0; y < board.height; y++) {
        for (let x = 0; x < board.width; x++) {
          const tile = board.tiles[y][x];
          if (tile.biomeId === id) {
            tiles.push({ x, y });
          }
        }
      }
      return tiles;
    });
  const uniqueBiomeTiles = CoordinateUtils.removeDuplicateTiles(biomeTiles);

  // Combine all tiles
  return [...uniqueUnitTiles, ...uniqueBiomeTiles];
}

/**
 * Clear the current displacement event
 */
export async function clearDisplacementEvent(): Promise<void> {
  useGameStore.setState({
    displacementEvent: { ...BLANK_DISPLACEMENT_EVENT }
  });
}

/**
 * Record a spawn event in the state
 */
export async function recordSpawnEvent(animalId: string): Promise<void> {
  const state = useGameStore.getState();
  if (!state.animals.some(a => a.id === animalId)) {
    throw new Error(`RecordSpawnEvent failed: animal ${animalId} not found`);
  }
  useGameStore.setState({
    spawnEvent: {
      occurred: true,
      animalId: animalId,
      timestamp: Date.now(),
    }
  });
}

/**
 * Clear the current spawn event
 */
export async function clearSpawnEvent(): Promise<void> {
  useGameStore.setState({
    spawnEvent: { ...BLANK_SPAWN_EVENT }
  });
}