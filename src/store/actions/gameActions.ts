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
 * Uses PlayerView for visibility filtering while maintaining full state access for mutations.
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

  // Filter to only this player's biomes (always visible to owner)
  const playerBiomes = new Map();
  allBiomes.forEach((b, id) => {
    if (b.ownerId === playerId) {
      playerBiomes.set(id, b);
    }
  });

  // Regenerate resources for these biomes - use filtered resources for player's owned biomes
  const playerResources = Object.fromEntries(
    Object.entries(state.resources).filter(([_, resource]) => 
      resource.biomeId && playerBiomes.has(resource.biomeId)
    )
  );
  
  const newResources = EcosystemController.regenerateResources(playerResources, playerBiomes);
  
  // Merge regenerated resources back into full resources
  const fullResources = { ...state.resources };
  Object.entries(newResources).forEach(([key, resource]) => {
    fullResources[key] = resource;
  });

  // Update resources slice
  useGameStore.setState({ resources: fullResources });

  const newBoard = board;
   
  // Produce eggs via EggProducer
  const { EggProducer } = await import('../../controllers/EggProducer');
  const { eggs: newEggs, biomes: postEggBiomes } = EggProducer.produce(
    turn,
    playerId,
    newBoard,
    playerBiomes,
    fullResources
  );

  newEggs.forEach(addEgg);

  const postEggAnimals = animals;

  // Merge updated biomes back into full map
  const mergedBiomes = new Map(allBiomes);
  postEggBiomes.forEach((b, id) => mergedBiomes.set(id, b));

  // Recalculate lushness for all biomes
  const newBiomes = EcosystemController.recalcLushnessState(newBoard, fullResources, mergedBiomes);

  // Commit the partial update including regenerated resources
  useGameStore.setState({
    board: newBoard,
    animals: postEggAnimals,
    biomes: newBiomes,
    resources: fullResources
  });
}

/**
 * Get initial visible tiles for initialization for the active player
 * Uses PlayerView to ensure only visible tiles are returned
 */
export function getInitialVisibleTiles(): { x: number, y: number }[] {
  // Delegate to playerActions for consistent PlayerView usage
  const { getInitialVisibleTiles: getVisibleTilesFromPlayerView } = require('../../selectors/playerActions');
  return getVisibleTilesFromPlayerView();
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