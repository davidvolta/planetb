import { useGameStore } from '../store/gameStore';
import { getActivePlayerView } from './getPlayerView';
import type { Animal, Biome, Egg, Resource, Board, Coordinate } from '../store/gameStore';
import * as CoordinateUtils from '../utils/CoordinateUtils';

/**
 * Player-view-aware action functions
 * These replace omniscient actions and only return data the player should see
 * 
 * Usage: Replace `import * as actions from '../store/actions'` with 
 *        `import * as playerActions from '../selectors/playerActions'`
 */

/**
 * Get visible animals for the active player
 * Replaces omniscient actions.getAnimals()
 */
export function getAnimals(): Animal[] {
  const state = useGameStore.getState();
  const playerView = getActivePlayerView(state);
  return playerView ? playerView.animals : [];
}

/**
 * Get visible biomes for the active player
 * Replaces omniscient actions.getBiomes()
 */
export function getBiomes(): Map<string, Biome> {
  const state = useGameStore.getState();
  const playerView = getActivePlayerView(state);
  return playerView ? playerView.biomes : new Map();
}

/**
 * Get visible eggs for the active player
 * Replaces omniscient actions.getEggs()
 */
export function getEggs(): Egg[] {
  const state = useGameStore.getState();
  const playerView = getActivePlayerView(state);
  return playerView ? playerView.eggs : [];
}

/**
 * Get visible resources for the active player
 * Replaces omniscient actions.getResources()
 */
export function getResources(): Resource[] {
  const state = useGameStore.getState();
  const playerView = getActivePlayerView(state);
  return playerView ? playerView.resources : [];
}

/**
 * Get visible board for the active player
 * Replaces omniscient actions.getBoard()
 */
export function getBoard(): Board | null {
  const state = useGameStore.getState();
  const playerView = getActivePlayerView(state);
  return playerView ? playerView.board : null;
}

/**
 * Get active player ID (safe to access omnisciently)
 */
export function getActivePlayerId(): number {
  return useGameStore.getState().activePlayerId;
}

/**
 * Get current turn (safe to access omnisciently)
 */
export function getTurn(): number {
  return useGameStore.getState().turn;
}

/**
 * Get visible animals at a specific position
 * Replaces omniscient actions.getAnimalsAt()
 */
export function getAnimalsAt(x: number, y: number): Animal[] {
  const state = useGameStore.getState();
  const playerView = getActivePlayerView(state);
  if (!playerView) return [];
  
  return playerView.animals.filter(animal =>
    animal.position.x === x && animal.position.y === y
  );
}

/**
 * Get visible eggs at a specific position
 * Replaces omniscient actions.getEggsAt()
 */
export function getEggsAt(x: number, y: number): Egg[] {
  const state = useGameStore.getState();
  const playerView = getActivePlayerView(state);
  if (!playerView) return [];
  
  return playerView.eggs.filter(egg =>
    egg.position.x === x && egg.position.y === y
  );
}

/**
 * Get resource at a specific position
 * Replaces omniscient actions.getResourceAt()
 */
export function getResourceAt(x: number, y: number): Resource | undefined {
  const state = useGameStore.getState();
  const playerView = getActivePlayerView(state);
  if (!playerView) return undefined;
  
  return playerView.resources.find(resource =>
    resource.position.x === x && resource.position.y === y
  );
}

/**
 * Check if a tile has an egg (only visible eggs)
 * Replaces omniscient actions.tileHasEgg()
 */
export function tileHasEgg(x: number, y: number): boolean {
  return getEggsAt(x, y).length > 0;
}

/**
 * Get biome by ID (only if visible)
 * Replaces omniscient actions.getBiomeById()
 */
export function getBiomeById(id: string): Biome | undefined {
  const visibleBiomes = getBiomes();
  return visibleBiomes.get(id);
}

/**
 * Get selection state (safe to access omnisciently since it's player-specific)
 */
export function getSelectedAnimalID(): string | null {
  return useGameStore.getState().selectedAnimalID;
}

export function getSelectedBiomeId(): string | null {
  return useGameStore.getState().selectedBiomeId;
}

export function getSelectedResource(): { x: number; y: number } | null {
  return useGameStore.getState().selectedResource;
}

export function getSelectedAnimalValidMoves(): { x: number; y: number }[] {
  return useGameStore.getState().validMoves;
}

export function isMoveMode(): boolean {
  return useGameStore.getState().moveMode;
}

/**
 * Get tiles for a specific biome (only visible tiles)
 * Replaces omniscient actions.getTilesForBiome()
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTilesForBiome(biomeId: string): Array<{ x: number; y: number; tile: any }> {
  const state = useGameStore.getState();
  const playerView = getActivePlayerView(state);
  if (!playerView || !playerView.board) return [];
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tiles: Array<{ x: number; y: number; tile: any }> = [];
  
  for (let y = 0; y < playerView.board.height; y++) {
    for (let x = 0; x < playerView.board.width; x++) {
      const tile = playerView.board.tiles[y][x];
      if (tile.biomeId === biomeId) {
        tiles.push({ x, y, tile });
      }
    }
  }
  
  return tiles;
}

/**
 * Get player's own animals (always visible)
 */
export function getOwnedAnimals(): Animal[] {
  const state = useGameStore.getState();
  const activePlayerId = state.activePlayerId;
  return state.animals.filter(animal => animal.ownerId === activePlayerId);
}

/**
 * Get player's owned biomes (always visible)
 */
export function getOwnedBiomes(): Map<string, Biome> {
  const state = useGameStore.getState();
  const activePlayerId = state.activePlayerId;
  const ownedBiomes = new Map<string, Biome>();
  
  state.biomes.forEach((biome, id) => {
    if (biome.ownerId === activePlayerId) {
      ownedBiomes.set(id, biome);
    }
  });
  
  return ownedBiomes;
}

/**
 * Check if the active player owns a specific animal
 */
export function doesPlayerOwnAnimal(animalId: string): boolean {
  const state = useGameStore.getState();
  const animal = state.animals.find(a => a.id === animalId);
  return animal ? animal.ownerId === state.activePlayerId : false;
}

/**
 * Check if the active player owns a specific biome
 */
export function doesPlayerOwnBiome(biomeId: string): boolean {
  const state = useGameStore.getState();
  const biome = state.biomes.get(biomeId);
  return biome ? biome.ownerId === state.activePlayerId : false;
}

/**
 * Get visible habitat tiles for the active player
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getHabitatTiles(): Array<{ x: number; y: number; tile: any }> {
  const state = useGameStore.getState();
  const playerView = getActivePlayerView(state);
  if (!playerView || !playerView.board) return [];
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tiles: Array<{ x: number; y: number; tile: any }> = [];
  
  for (let y = 0; y < playerView.board.height; y++) {
    for (let x = 0; x < playerView.board.width; x++) {
      const tile = playerView.board.tiles[y][x];
      if (tile.isHabitat) {
        tiles.push({ x, y, tile });
      }
    }
  }
  
  return tiles;
}

/**
 * Get visible tiles for a player
 */
export function getVisibleTilesForPlayer(playerId: number): { x: number; y: number }[] {
  const state = useGameStore.getState();
  const player = state.players.find(p => p.id === playerId);
  if (!player) return [];
  
  return Array.from(player.visibleTiles).map(tileKey => {
    const [x, y] = tileKey.split(',').map(Number);
    return { x, y };
  });
}

/**
 * Get the player's current view data
 * This is the main function that should be used for comprehensive player state
 */
export function getPlayerViewData() {
  const state = useGameStore.getState();
  return getActivePlayerView(state);
}

/**
 * Migration helper: log when omniscient functions are called
 */
export function logOmniscientUsage(functionName: string) {
  console.warn(`[OMNISCIENT] ${functionName} called - should be replaced with player view`);
}

/**
 * Get all players (safe to access omnisciently for UI display)
 */
export function getPlayers() {
  return useGameStore.getState().players;
}

/**
 * Check if the selected biome is available for capture
 */
export function isSelectedBiomeAvailableForCapture(): boolean {
  const state = useGameStore.getState();
  const biomeId = state.selectedBiomeId;
  if (!biomeId) return false;
  
  const biome = state.biomes.get(biomeId);
  if (!biome) return false;
  
  // Check if player can see this biome
  const playerView = getActivePlayerView(state);
  if (!playerView) return false;
  
  const visibleBiome = playerView.biomes.get(biomeId);
  return visibleBiome ? visibleBiome.ownerId !== state.activePlayerId : false;
}

/**
 * Check if a biome can be captured
 */
export function canCaptureBiome(biomeId: string): boolean {
  const state = useGameStore.getState();
  const biome = state.biomes.get(biomeId);
  if (!biome) return false;
  
  // Check if player can see this biome
  const playerView = getActivePlayerView(state);
  if (!playerView) return false;
  
  const visibleBiome = playerView.biomes.get(biomeId);
  return visibleBiome ? visibleBiome.ownerId !== state.activePlayerId : false;
}

/**
 * Get egg count for a biome (only if visible)
 */
export function getEggCountForBiome(biomeId: string): number {
  const state = useGameStore.getState();
  const playerView = getActivePlayerView(state);
  if (!playerView) return 0;
  
  // Only count eggs that are visible to the player
  return playerView.eggs.filter(egg => egg.biomeId === biomeId).length;
}

/**
 * Get fog of war enabled status (global setting)
 */
export function getFogOfWarEnabled(): boolean {
  const state = useGameStore.getState();
  return state.fogOfWarEnabled;
}

/**
 * Get initial visible tiles for the active player
 * Replaces omniscient actions.getInitialVisibleTiles()
 */
export function getInitialVisibleTiles(): Coordinate[] {
  console.log("getInitialVisibleTiles() called");
  const state = useGameStore.getState();
  const playerView = getActivePlayerView(state);
  console.log("getInitialVisibleTiles() - playerView:", !!playerView);
  console.log("getInitialVisibleTiles() - playerView.board:", !!playerView?.board);
  if (!playerView || !playerView.board) {
    console.warn("getInitialVisibleTiles() - early return, no playerView or board");
    return [];
  }

  // Get activePlayerId from state, not playerView (it's not included in playerView)
  const activePlayerId = state.activePlayerId;
  console.log("getInitialVisibleTiles() - activePlayerId from state:", activePlayerId);
  console.log("getInitialVisibleTiles() - animals count:", playerView.animals.length);
  console.log("getInitialVisibleTiles() - biomes count:", playerView.biomes.size);
  
  // Collect tiles around non-egg animals
  const eggsRecord = playerView.eggs.reduce((acc, egg) => {
    acc[egg.id] = egg;
    return acc;
  }, {} as Record<string, Egg>);
  
  const unitAdjacents = playerView.animals
    .filter(a => a.ownerId === activePlayerId && !(a.id in eggsRecord))
    .flatMap(a => CoordinateUtils.getAdjacentTiles(a.position.x, a.position.y, playerView.board!.width, playerView.board!.height));
  const uniqueUnitTiles = CoordinateUtils.removeDuplicateTiles(unitAdjacents);

  // Collect tiles of owned biomes  
  const biomeTiles = Array.from(playerView.biomes.entries())
    .filter(([, b]) => b.ownerId === activePlayerId)
    .flatMap(([id]) => {
      // Get tiles for biome
      const tiles = [];
      for (let y = 0; y < playerView.board!.height; y++) {
        for (let x = 0; x < playerView.board!.width; x++) {
          const tile = playerView.board!.tiles[y][x];
          if (tile.biomeId === id) {
            tiles.push({ x, y });
          }
        }
      }
      return tiles;
    });
  const uniqueBiomeTiles = CoordinateUtils.removeDuplicateTiles(biomeTiles);

  // Combine all tiles
  const combinedTiles = [...uniqueUnitTiles, ...uniqueBiomeTiles];
  console.log("getInitialVisibleTiles() - uniqueUnitTiles count:", uniqueUnitTiles.length);
  console.log("getInitialVisibleTiles() - uniqueBiomeTiles count:", uniqueBiomeTiles.length);
  console.log("getInitialVisibleTiles() - total combined tiles:", combinedTiles.length);
  return combinedTiles;
}

// Re-export all the state-mutating actions that don't need filtering
// These are safe because they operate on the player's own data or are validated
export { 
  addAnimal, 
  removeAnimal, 
  addEgg, 
  removeEgg, 
  selectAnimal, 
  selectBiome, 
  selectEgg,
  selectResourceTile,
  moveAnimal,
  spawnAnimal,
  captureBiome,
  harvestTileResource,
  resetResources,
  getNextTurn,
  addPlayer,
  setActivePlayer,
  // ... other mutation actions
} from '../store/actions';