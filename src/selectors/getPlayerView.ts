import type { GameState, Biome, Board, Tile, Resource, Animal, Egg } from '../store/gameStore';

export interface ResourceView {
  resource: Resource;
  tile: Tile;
}

/**
 * Comprehensive player view that replaces omniscient state access
 * This function filters all game data based on what a player should see
 */
export function getPlayerView(state: GameState, playerId: number) {
  const player = state.players.find(p => p.id === playerId);
  if (!player || !state.board) return null;

  const visibleTiles = new Set(player.visibleTiles);
  const isVisible = (x: number, y: number) => visibleTiles.has(`${x},${y}`);
  const coordKey = (x: number, y: number) => `${x},${y}`;

  // Cache biome ownership
  const ownedBiomeIds = new Set<string>();
  for (const [id, biome] of state.biomes.entries()) {
    if (biome.ownerId === playerId) {
      ownedBiomeIds.add(id);
    }
  }

  const isOwnedBiome = (biomeId: string | null) =>
    biomeId != null && ownedBiomeIds.has(biomeId);

  // Mask board tiles
  const maskedTiles: Tile[][] = state.board.tiles.map((row, y) =>
    row.map((tile, x) => {
      return isVisible(x, y)
        ? tile
        : {
            coordinate: tile.coordinate,
            terrain: tile.terrain, // Optionally: use TerrainType.BLANK
            biomeId: null,
            isHabitat: false
          };
    })
  );

  const board: Board = {
    width: state.board.width,
    height: state.board.height,
    tiles: maskedTiles
  };

  // Filter animals
  const animals = state.animals.filter(a =>
    a.ownerId === playerId || isVisible(a.position.x, a.position.y)
  );

  // Filter eggs
  const eggs = Object.values(state.eggs).filter(e =>
    e.ownerId === playerId || isVisible(e.position.x, e.position.y)
  );

  // Filter biomes
  const visibleBiomes = new Map<string, Biome>();
  for (const [id, biome] of state.biomes.entries()) {
    if (ownedBiomeIds.has(id)) {
      visibleBiomes.set(id, biome);
      continue;
    }

    const biomeIsVisible = state.board.tiles.some(row =>
      row.some(tile => tile.biomeId === id && isVisible(tile.coordinate.x, tile.coordinate.y))
    );

    if (biomeIsVisible) {
      visibleBiomes.set(id, biome);
    }
  }

  // Filter visible/owned resources
  const filteredResources = Object.values(state.resources).filter(r =>
    isVisible(r.position.x, r.position.y) || isOwnedBiome(r.biomeId)
  );

  // Build resource view
  const resourceView: ResourceView[] = filteredResources.map(r => ({
    resource: r,
    tile: maskedTiles[r.position.y][r.position.x]
  }));

  // Precompute resource locations
  const resourceCoordSet = new Set(filteredResources.map(r => coordKey(r.position.x, r.position.y)));

  // Derive blank tiles
  const blankTiles = maskedTiles.flat().filter(tile => {
    const key = coordKey(tile.coordinate.x, tile.coordinate.y);
    return !resourceCoordSet.has(key) && !tile.isHabitat;
  });

  return {
    playerId,
    player,
    visibleTiles: player.visibleTiles,
    board,
    animals,
    eggs,
    biomes: visibleBiomes,

    // UI-local fields for the active player.
    // These are safe to include because getPlayerView is only ever called for state.activePlayerId.
    // One day when we do replays, we'll need to be more careful and filter these based on the active player.
    selectedAnimalID: state.selectedAnimalID,
    validMoves: state.validMoves,
    moveMode: state.moveMode,
    selectedBiomeId: state.selectedBiomeId,
    selectedResource: state.selectedResource,
    
    resourceView,
    blankTiles,
    resources: filteredResources
  };
}

/**
 * Convenience function to get the active player's view
 * Replaces omniscient state access in most common use cases
 */
export function getActivePlayerView(state: GameState) {
  return getPlayerView(state, state.activePlayerId);
}

/**
 * Check if a player can see a specific tile
 */
export function canPlayerSeeTile(state: GameState, playerId: number, x: number, y: number): boolean {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return false;
  
  const tileKey = `${x},${y}`;
  return player.visibleTiles.has(tileKey);
}

/**
 * Get only the animals owned by a player (always visible)
 */
export function getOwnedAnimals(state: GameState, playerId: number): Animal[] {
  return state.animals.filter(animal => animal.ownerId === playerId);
}

/**
 * Get only the biomes owned by a player (always visible)
 */
export function getOwnedBiomes(state: GameState, playerId: number): Map<string, Biome> {
  const ownedBiomes = new Map<string, Biome>();
  state.biomes.forEach((biome, id) => {
    if (biome.ownerId === playerId) {
      ownedBiomes.set(id, biome);
    }
  });
  return ownedBiomes;
}

/**
 * Get only the eggs owned by a player (always visible)
 */
export function getOwnedEggs(state: GameState, playerId: number): Egg[] {
  return Object.values(state.eggs).filter(egg => egg.ownerId === playerId);
}

/**
 * Check if a player owns a specific animal
 */
export function doesPlayerOwnAnimal(state: GameState, playerId: number, animalId: string): boolean {
  const animal = state.animals.find(a => a.id === animalId);
  return animal ? animal.ownerId === playerId : false;
}

/**
 * Check if a player owns a specific biome
 */
export function doesPlayerOwnBiome(state: GameState, playerId: number, biomeId: string): boolean {
  const biome = state.biomes.get(biomeId);
  return biome ? biome.ownerId === playerId : false;
}

/**
 * ADMIN/DEBUG FUNCTIONS - Only for debugging/admin interfaces
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AdminView {
  /**
   * Get full omniscient state - ONLY for debugging/admin use
   * @deprecated Use getPlayerView() instead for all gameplay code
   */
  export function getFullGameState(state: GameState) {
    console.warn('AdminView.getFullGameState() called - this should only be used for debugging');
    return state;
  }
}
