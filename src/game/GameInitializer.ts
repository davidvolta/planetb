import { Board, Tile, Animal, Biome } from '../store/gameStore';
import { TerrainType, BIOME_TERRAIN_ORDER } from '../types/gameTypes';
import { generateIslandTerrain } from '../utils/TerrainGenerator';
import { VoronoiNode, isNodeOverlapping, generateVoronoiBiomes } from '../utils/BiomeGenerator';
import { generateAnimalId } from '../utils/IdGenerator';

interface InitResult {
  board: Board;
  animals: Animal[];
  biomes: Map<string, Biome>;
}

/**
 * Initialize the game board including terrain, biomes, habitats, and initial animals.
 */
export function initializeBoard(
  width: number,
  height: number,
  numPlayers: number
): InitResult {
  const tiles: Tile[][] = [];
  const terrainData = generateIslandTerrain(width, height);
  
  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      tiles[y][x] = {
        coordinate: { x, y },
        terrain: terrainData[y][x],
        biomeId: null,
        isHabitat: false,
      };
    }
  }
  const board: Board = { width, height, tiles };

  const animals: Animal[] = [];
  const voronoiNodes: VoronoiNode[] = [];
  const terrainTypesWithNodes = new Set<TerrainType>();

  for (const terrainType of BIOME_TERRAIN_ORDER) {
    if (terrainTypesWithNodes.has(terrainType)) continue;
    const candidates: { x: number; y: number }[] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (terrainData[y][x] === terrainType) candidates.push({ x, y });
      }
    }
    if (candidates.length === 0) continue;
    const shuffled = candidates.sort(() => Math.random() - 0.5);
    let position = shuffled.find(p => !isNodeOverlapping(p, voronoiNodes));
    if (!position) position = shuffled[0];
    voronoiNodes.push({ id: `biome-${voronoiNodes.length}`, position });
    terrainTypesWithNodes.add(terrainType);
  }

  let placed = true;
  let iterations = 0;
  while (placed && iterations < 100) {
    placed = false;
    iterations++;
    for (const terrainType of BIOME_TERRAIN_ORDER) {
      const candidates: { x: number; y: number }[] = [];
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          if (terrainData[y][x] === terrainType &&
              !voronoiNodes.some(n => n.position.x === x && n.position.y === y)) {
            candidates.push({ x, y });
          }
        }
      }
      const shuffled = candidates.sort(() => Math.random() - 0.5);
      const pos = shuffled.find(p => !isNodeOverlapping(p, voronoiNodes));
      if (pos) {
        voronoiNodes.push({ id: `biome-${voronoiNodes.length}`, position: pos });
        placed = true;
      }
    }
  }

  const biomeResult = generateVoronoiBiomes(width, height, voronoiNodes);
  const biomeMap = biomeResult.biomeMap;
  const biomes = new Map<string, Biome>();

  voronoiNodes.forEach(node => {
    const id = node.id;
    const pos = node.position;
    biomes.set(id, {
      id,
      baseLushness: 0,
      lushnessBoost: 0,
      totalLushness: 0,
      initialResourceCount: 0,
      nonDepletedCount: 0,
      totalHarvested: 0,
      ownerId: null,
      productionRate: 1,
      lastProductionTurn: 0,
      habitat: { id: `habitat-${id.substring(6)}`, position: pos }
    });
  });

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      board.tiles[y][x].biomeId = biomeMap[y][x];
    }
  }
  biomes.forEach(b => {
    const { x, y } = b.habitat.position;
    board.tiles[y][x].isHabitat = true;
  });

  const beachBiomes = Array.from(biomes.values()).filter(b =>
    terrainData[b.habitat.position.y][b.habitat.position.x] === TerrainType.BEACH
  );
  for (let i = 0; i < numPlayers && i < beachBiomes.length; i++) {
    beachBiomes[i].ownerId = i;
  }

  for (let playerId = 0; playerId < numPlayers; playerId++) {
    const startingBiome = Array.from(biomes.values()).find(b => b.ownerId === playerId);
    if (!startingBiome) continue;
    const habitatPos = startingBiome.habitat.position;
    const dirs = [
      { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
      { dx: -1, dy:  0 },                { dx: 1, dy:  0 },
      { dx: -1, dy:  1 }, { dx: 0, dy:  1 }, { dx: 1, dy:  1 }
    ];
    const adjacent: { x: number; y: number }[] = [];
    for (const { dx, dy } of dirs) {
      const x = habitatPos.x + dx;
      const y = habitatPos.y + dy;
      if (x >= 0 && x < width && y >= 0 && y < height &&
          !animals.some(a => a.position.x === x && a.position.y === y)) {
        adjacent.push({ x, y });
      }
    }
    if (adjacent.length > 0) {
      const choice = adjacent[Math.floor(Math.random() * adjacent.length)];
      const species = 'turtle';
      const newAnimal: Animal = {
        id: generateAnimalId(species),
        species,
        position: choice,
        previousPosition: null,
        hasMoved: false,
        ownerId: playerId,
        facingDirection: 'right',
        health: 10 // All animals start with full health
      };
      animals.push(newAnimal);
    }
  }

  return { board, animals, biomes };
}