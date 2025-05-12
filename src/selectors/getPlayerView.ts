import type { GameState, Biome, Board, Tile, Resource } from '../store/gameStore';

export interface ResourceView {
  resource: Resource;
  tile: Tile;
}

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
    visibleTiles: player.visibleTiles,
    board,
    animals,
    eggs,
    biomes: visibleBiomes,
    selectedAnimalID: state.selectedAnimalID,
    validMoves: state.validMoves,
    moveMode: state.moveMode,
    resourceView,
    blankTiles,
    resources: filteredResources
  };
}
