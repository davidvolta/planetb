import { Board, Tile, Animal, Biome, Habitat, TerrainType, AnimalState } from '../store/gameStore';
import { generateIslandTerrain } from '../utils/TerrainGenerator';
import { VoronoiNode, isNodeOverlapping, generateVoronoiBiomes } from '../utils/BiomeGenerator';
import { BIOME_TERRAIN_ORDER, TERRAIN_ANIMAL_MAP } from '../store/gameStore';

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
  currentPlayerId: number
): InitResult {
  // Generate terrain data
  const terrainData = generateIslandTerrain(width, height);

  // Initialize tiles
  const tiles: Tile[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) {
      row.push({
        coordinate: { x, y },
        terrain: terrainData[y][x],
        explored: false,
        visible: false,
        biomeId: null,
        resourceType: null,
        resourceValue: 0,
        active: false,
        isHabitat: false,
        hasEgg: false
      });
    }
    tiles.push(row);
  }
  const board: Board = { width, height, tiles };

  // Prepare for biome generation
  let animals: Animal[] = [];
  const voronoiNodes: VoronoiNode[] = [];
  const terrainTypesWithNodes = new Set<TerrainType>();

  // Place one node for each biome type
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

  // Place additional nodes until no more can fit
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

  // Generate biomes
  const biomeResult = generateVoronoiBiomes(width, height, voronoiNodes, terrainData);
  const biomeMap = biomeResult.biomeMap;
  const biomes = new Map<string, Biome>();

  let playerBeachAssigned = false;
  voronoiNodes.forEach(node => {
    const id = node.id;
    const pos = node.position;
    const color = biomeResult.biomeColors.get(id) || 0x000000;
    const isBeach = terrainData[pos.y][pos.x] === TerrainType.BEACH;
    const ownerId = isBeach && !playerBeachAssigned ? currentPlayerId : null;
    if (ownerId === currentPlayerId) playerBeachAssigned = true;
    biomes.set(id, {
      id,
      color,
      baseLushness: 0,
      lushnessBoost: 0,
      totalLushness: 0,
      initialResourceCount: 0,
      nonDepletedCount: 0,
      totalHarvested: 0,
      eggCount: 0,
      ownerId,
      productionRate: 1,
      lastProductionTurn: 0,
      habitat: { id: `habitat-${id.substring(6)}`, position: pos }
    });
  });

  // Assign biomes to tiles and mark habitats
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      board.tiles[y][x].biomeId = biomeMap[y][x];
    }
  }
  biomes.forEach(b => {
    const { x, y } = b.habitat.position;
    board.tiles[y][x].isHabitat = true;
  });

  // Place initial player unit adjacent to the starting habitat
  const startingBiome = Array.from(biomes.values()).find(b => b.ownerId === currentPlayerId);
  if (startingBiome) {
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
        id: `animal-${animals.length}`,
        species,
        state: AnimalState.ACTIVE,
        position: choice,
        previousPosition: null,
        hasMoved: false,
        ownerId: currentPlayerId
      };
      animals.push(newAnimal);
    }
  }

  return { board, animals, biomes };
} 