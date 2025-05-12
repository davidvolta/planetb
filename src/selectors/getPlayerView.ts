import type { GameState, Biome, Board, Tile, Resource } from '../store/gameStore';

export function getPlayerView(state: GameState, playerId: number) {
  const player = state.players.find(p => p.id === playerId);
  if (!player || !state.board) return null;

  const visibleTiles = new Set(player.visibleTiles);

  // Filter animals: own units or enemy units in visible tiles
  const animals = state.animals.filter(a =>
    a.ownerId === playerId || visibleTiles.has(`${a.position.x},${a.position.y}`)
  );

  // Filter eggs: own eggs or visible ones
  const eggs = Object.values(state.eggs).filter(e =>
    e.ownerId === playerId || visibleTiles.has(`${e.position.x},${e.position.y}`)
  );

  // Filter biomes: show only owned or partially visible biomes
  const visibleBiomes = new Map<string, Biome>();
  for (const [id, biome] of state.biomes.entries()) {
    if (biome.ownerId === playerId) {
      visibleBiomes.set(id, biome);
      continue;
    }
    const biomeIsVisible = state.board.tiles.some(row =>
      row.some(tile =>
        tile.biomeId === id && visibleTiles.has(`${tile.coordinate.x},${tile.coordinate.y}`)
      )
    );
    if (biomeIsVisible) visibleBiomes.set(id, biome);
  }

  // Mask board tiles based on visibility
  const maskedTiles: Tile[][] = state.board.tiles.map(row =>
    row.map(tile => {
      const key = `${tile.coordinate.x},${tile.coordinate.y}`;
      const isVisible = visibleTiles.has(key);

      if (!isVisible) {
        return {
          coordinate: tile.coordinate,
          terrain: tile.terrain, // You may choose a default like 'blank' here if needed
          biomeId: null,
          isHabitat: false
        };
      }

      return tile;
    })
  );

  const board: Board = {
    width: state.board.width,
    height: state.board.height,
    tiles: maskedTiles
  };

  // Build resource sets based on resources slice
  const resourcesArr: Resource[] = Object.values(state.resources);

  // Visible / owned filters
  const filteredResources = resourcesArr.filter(r => {
    const coordKey = `${r.position.x},${r.position.y}`;
    const ownedBiome = r.biomeId ? state.biomes.get(r.biomeId)?.ownerId === playerId : false;
    return ownedBiome || visibleTiles.has(coordKey);
  });

  const resourceCoordSet = new Set(filteredResources.map(r => `${r.position.x},${r.position.y}`));

  // Derive resourceTiles and blankTiles for UI helpers
  const resourceTiles = filteredResources.map(r => {
    const tile = state.board!.tiles[r.position.y][r.position.x];
    return tile;
  });

  const blankTiles = maskedTiles.flat().filter(tile => {
    const key = `${tile.coordinate.x},${tile.coordinate.y}`;
    return !resourceCoordSet.has(key) && !tile.isHabitat;
  });

  const resources = filteredResources;

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
    resourceTiles,
    blankTiles,
    resources,
  };
} 