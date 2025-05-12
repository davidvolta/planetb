import { Coordinate, Board, Animal, Biome, Tile } from "../store/gameStore";
import { TerrainType, ResourceType } from "../types/gameTypes";
import { getEggPlacementTiles, getTilesForBiome, getEggCountForBiome } from "../store/actions";
import { MAX_LUSHNESS, RESOURCE_GENERATION_PERCENTAGE } from "../constants/gameConfig";
import type { GameState } from "../store/gameStore";

/**
 * EcosystemController handles ecosystem-related functionality:
 * - Resource generation and management
 * - Biome health and lushness
 * - Harvesting mechanics
 * - Ecological balance simulation
 */
export class EcosystemController {
  // Resource generation polynomial parameters
  private static resourceGenParams = { a: -0.0015, b: 0.043, c: 0.04, d: 0.1 };

  /**
   * Calculate resource generation rate based on total lushness using polynomial f(l)=a*l^3+b*l^2+c*l+d
   */
  public static calculateResourceGenerationRate(lushness: number): number {
    const p = this.resourceGenParams;
    return Math.max(0,
      p.a * Math.pow(lushness, 3) +
      p.b * Math.pow(lushness, 2) +
      p.c * lushness +
      p.d
    );
  }

  /**
   * Regenerate resources on all player-owned biomes according to generation rate
   */
  public static regenerateResources(
    resources: Record<string, import('../store/gameStore').Resource>,
    biomes: Map<string, Biome>
  ): Record<string, import('../store/gameStore').Resource> {
    const newResources: Record<string, import('../store/gameStore').Resource> = { ...resources };

    const maxValue = 10;

    // Iterate through each biome we are regenerating for
    biomes.forEach((biome, biomeId) => {
      // Only regenerate resources for owned biomes
      if (biome.ownerId === null) return;

      // Determine generation rate from lushness
      const generationRate = this.calculateResourceGenerationRate(biome.totalLushness);

      // Update each resource that belongs to this biome
      Object.entries(resources).forEach(([key, res]) => {
        if (res.biomeId !== biomeId || !res.active || res.value <= 0 || res.value >= maxValue) {
          return;
        }

        const regen = generationRate * (1 - res.value / maxValue);
        const newVal = Math.min(maxValue, res.value + regen);

        newResources[key] = { ...res, value: newVal };
      });
    });

    return newResources;
  }

  /**
   * Reset and regenerate resources for the game board
   * This clears all existing resources and creates new ones based on terrain type and resource density
   * 
   * @param board The current game board
   * @param biomes Map of all biomes
   * @param resourceChance Decimal 0–1 of resource density (defaults to constant)
   */
  public static resetResources(
    board: Board,
    biomes: Map<string, Biome>,
    resourceChance: number = RESOURCE_GENERATION_PERCENTAGE
  ): Record<string, import('../store/gameStore').Resource> {
    if (!board) {
      console.warn("Board not initialized, cannot reset resources");
      return {};
    }

    const updatedBiomes = new Map(biomes);

    const resourcesRecord: Record<string, import('../store/gameStore').Resource> = {};

    biomes.forEach((biome, biomeId) => {
      // Gather and shuffle eligible tiles for this biome
      const eligibleTiles = getTilesForBiome(biomeId)
        .filter(({ tile }) => !tile.isHabitat)
        .filter(({ tile }) =>
          [
            TerrainType.GRASS,
            TerrainType.WATER,
            TerrainType.MOUNTAIN,
            TerrainType.UNDERWATER
          ].includes(tile.terrain)
        );

      const selectedTiles = [...eligibleTiles]
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.round(eligibleTiles.length * resourceChance));

      // Update biome resource metrics
      updatedBiomes.set(biomeId, {
        ...biome,
        initialResourceCount: selectedTiles.length,
        nonDepletedCount: selectedTiles.length,
        totalHarvested: 0
      });

      // Apply resources on board tiles
      const terrainToResource: Record<TerrainType, ResourceType> = {
        [TerrainType.GRASS]: ResourceType.FOREST,
        [TerrainType.WATER]: ResourceType.KELP,
        [TerrainType.MOUNTAIN]: ResourceType.INSECTS,
        [TerrainType.UNDERWATER]: ResourceType.PLANKTON,
        [TerrainType.BEACH]: ResourceType.NONE
      };

      selectedTiles.forEach(({ x, y, tile }) => {
        const terrain = tile.terrain as TerrainType;
        const type = terrainToResource[terrain];
        if (!type) return;

        // Mutate tile for legacy paths (will be removed in Phase 6)
        const t = board.tiles[y][x];
        t.resourceType = type;
        t.resourceValue = 10;
        t.active = true;

        // Build resource object
        const key = `${x},${y}`;
        resourcesRecord[key] = {
          id: key,
          type,
          position: { x, y },
          biomeId,
          value: 10,
          active: true
        } as import('../store/gameStore').Resource;
      });
    });

    // Commit updated biomes map
    biomes.clear();
    updatedBiomes.forEach((b, id) => biomes.set(id, b));

    return resourcesRecord;
  }

  /**
   * Gets all valid tiles for egg placement in a biome
   * Valid tiles are in the biome, don't have eggs, and don't have active resources
   * 
   * @param biomeId The ID of the biome to find valid egg placement tiles for
   * @param board The game board
   * @param allBiomes Map of all biomes
   * @returns Array of valid tile coordinates for egg placement, prioritized by proximity to resources in owned biomes
   */
  public static getValidEggPlacementTiles(
    biomeId: string,
    board: Board,
    allBiomes: Map<string, Biome>
  ): Coordinate[] {
    if (!board) return [];

    const biome = allBiomes.get(biomeId);
    if (!biome || biome.ownerId === null) {
      console.warn(`Cannot place eggs for biome ${biomeId}`);
      return [];
    }

    // Build set of player-owned biome IDs
    const playerBiomeIds = new Set(
      Array.from(allBiomes.entries())
        .filter(([, b]) => b.ownerId === biome.ownerId)
        .map(([id]) => id)
    );

    // Get base eligible tiles for eggs
    const eligible = getEggPlacementTiles(biomeId);
    if (eligible.length === 0) return [];

    // Neighboring coordinate deltas for adjacency
    const neighborDeltas = [
      { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
      { dx: -1, dy: 0 },                    { dx: 1, dy: 0 },
      { dx: -1, dy: 1 },  { dx: 0, dy: 1 },  { dx: 1, dy: 1 }
    ];

    // Score each tile by resource adjacency
    const scored = eligible.map(({ x, y }) => {
      let score = 0;
      neighborDeltas.forEach(({ dx, dy }) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= board.width || ny >= board.height) return;
        const t = board.tiles[ny][nx];
        if (t.active && t.resourceType) {
          score += (t.biomeId && playerBiomeIds.has(t.biomeId)) ? 3 : 1;
        }
      });
      return { x, y, score };
    });

    // Sort descending by score and return coordinates
    return scored
      .sort((a, b) => b.score - a.score)
      .map(({ x, y }) => ({ x, y }));
  }

  /**
   * Get all tiles (with coordinates) for a biome from the passed-in board
   */
  private static getBoardTilesForBiome(board: Board, biomeId: string): { tile: Tile; x: number; y: number }[] {
    const results: { tile: Tile; x: number; y: number }[] = [];
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const tile = board.tiles[y][x];
        if (tile.biomeId === biomeId) {
          results.push({ tile, x, y });
        }
      }
    }
    return results;
  }

  /**
   * Calculate the percentage of blank tiles in a biome that have eggs
   * @param biomeId ID of the biome to calculate for
   * @param board The game board
   * @param biome The biome object with up-to-date eggCount
   * @returns Percentage (0-1) of blank tiles that have eggs
   */
  private static calculateEggPercentage(biomeId: string, board: Board,): number {
    const biomeTiles = this.getBoardTilesForBiome(board, biomeId);
    const blankTiles = biomeTiles.filter(({ tile }) =>
      !tile.active && !tile.isHabitat
    );
    
    // If no blank tiles, return 0
    if (blankTiles.length === 0) {
      return 0;
    }
    
    // Derive current egg count using the action helper
    const eggCount = getEggCountForBiome(biomeId);
    
    // Calculate and return percentage
    return eggCount / blankTiles.length;
  }

  /**
   * Compute lushness for a biome, returning all lushness values
   * @param biomeId ID of the biome to calculate lushness for
   * @param board Current game board
   * @param resources Record of all resources in the game
   * @param biomes Map of all biomes
   * @returns Object containing baseLushness, lushnessBoost, and totalLushness
   */
  public static calculateBiomeLushness(
    biomeId: string,
    board: Board,
    resources: Record<string, import('../store/gameStore').Resource>,
    biomes: Map<string, Biome>
  ): {
    baseLushness: number;
    lushnessBoost: number;
    totalLushness: number;
  } {
    const biome = biomes.get(biomeId);
    if (!biome) {
      console.warn(`Biome ${biomeId} not found`);
      return { baseLushness: 0, lushnessBoost: 0, totalLushness: 0 };
    }
    // Get active resources in this biome
    const activeResources = Object.values(resources).filter(r => r.biomeId === biomeId && r.active);
    // Calculate base lushness relative to initial resource count
    const currentTotal = activeResources.reduce((sum, r) => sum + r.value, 0);
    const initialTotal = biome.initialResourceCount * 10;
    let baseLushness = 0;
    if (initialTotal > 0) {
      baseLushness = (currentTotal / initialTotal) * MAX_LUSHNESS;
    }
    const eggPercentage = this.calculateEggPercentage(biomeId, board);
    const lushnessBoost = this.calculateLushnessBoost(eggPercentage);
    return {
      baseLushness,
      lushnessBoost,
      totalLushness: baseLushness + lushnessBoost
    };
  }

  /**
   * Calculate lushness boost based on egg percentage
   * @param eggPercentage Percentage (0-1) of blank tiles with eggs
   * @returns Lushness boost value (0-MAX_LUSHNESS_BOOST)
   */
  private static calculateLushnessBoost(eggPercentage: number): number {
    // Linear boost formula: percentage * 2, capped at MAX_LUSHNESS_BOOST
    return Math.min(2.0, eggPercentage * 2.0);
  }

  /**
   * Pure computation of harvest effects without side-effects.
   * Returns new board, player list, and biome map reflecting the harvest.
   */
  public static computeHarvest(
    coord: Coordinate,
    board: Board,
    resources: Record<string, import('../store/gameStore').Resource>,
    players: any[],
    currentPlayerId: number,
    biomes: Map<string, Biome>,
    amount: number
  ): { board: Board; resources: Record<string, import('../store/gameStore').Resource>; players: any[]; biomes: Map<string, Biome> } {
    // Deep copy of board
    const newBoard: Board = {
      ...board,
      tiles: board.tiles.map(row => row.map(tile => ({ ...tile })))
    };
    const key = `${coord.x},${coord.y}`;
    const resource = resources[key];
    if (!resource || !resource.active) {
      return { board: newBoard, resources: { ...resources }, players: [...players], biomes: new Map(biomes) };
    }

    const harvestAmount = Math.min(amount, resource.value);

    const newResources = { ...resources };
    const updatedRes = { ...resource, value: resource.value - harvestAmount };
    if (updatedRes.value <= 0) {
      updatedRes.value = 0;
      updatedRes.active = false;
    }
    newResources[key] = updatedRes;

    // Update players
    const newPlayers = players.map(player =>
      player.id === currentPlayerId
        ? { ...player, energy: player.energy + harvestAmount }
        : player
    );

    // Update biome stats
    const biomeId = resource.biomeId!;
    const newBiomes = new Map(biomes);
    const biome = biomes.get(biomeId)!;
    const newNonDepleted = updatedRes.active ? biome.nonDepletedCount : Math.max(0, biome.nonDepletedCount - 1);
    newBiomes.set(biomeId, {
      ...biome,
      totalHarvested: biome.totalHarvested + harvestAmount,
      nonDepletedCount: newNonDepleted
    });

    return { board: newBoard, resources: newResources, players: newPlayers, biomes: newBiomes };
  }

  /**
   * Pure computation of capturing a biome without side-effects.
   * Returns updated animals and biomes.
   */
  public static computeCapture(
    biomeId: string,
    animals: Animal[],
    biomes: Map<string, Biome>,
    board: Board,
    currentPlayerId: number,
    turn: number
  ): { animals: Animal[]; biomes: Map<string, Biome> } {
    // Check existence and ownership
    const biome = biomes.get(biomeId);
    if (!biome || biome.ownerId === currentPlayerId) {
      return { animals: [...animals], biomes: new Map(biomes) };
    }
    // Update biome ownership and timing
    const updatedBiome: Biome = {
      ...biome,
      ownerId: currentPlayerId,
      lastProductionTurn: turn - 1
    };
    const newBiomes = new Map(biomes);
    newBiomes.set(biomeId, updatedBiome);

    // Find an active animal on the habitat that hasn't moved
    const animalsOnHabitat = animals.filter(a => {
      const tile = board.tiles[a.position.y]?.[a.position.x];
      return (
        tile &&
        tile.isHabitat &&
        tile.biomeId === biomeId &&
        !a.hasMoved &&
        a.ownerId === currentPlayerId
      );
    });
    let newAnimals: Animal[] = [...animals];
    if (animalsOnHabitat.length > 0) {
      const animalId = animalsOnHabitat[0].id;
      newAnimals = animals.map(a =>
        a.id === animalId ? { ...a, hasMoved: true } : a
      );
    }
    return { animals: newAnimals, biomes: newBiomes };
  }

  /**
   * Pure check whether a biome can be captured (no side-effects).
   * @param biomeId ID of the biome to test
   * @param board Current game board
   * @param animals List of all animals in state
   * @param biomes Map of all biomes
   * @param currentPlayerId ID of the current player
   */
  public static computeCanCapture(
    biomeId: string,
    board: Board,
    animals: Animal[],
    biomes: Map<string, Biome>,
    currentPlayerId: number
  ): boolean {
    // Can't capture if nonexistent or already owned by this player
    const biome = biomes.get(biomeId);
    if (!biome || biome.ownerId === currentPlayerId) {
      return false;
    }
    // Is there an alive, active animal of the current player on that habitat?
    return animals.some(a => {
      const tile = board.tiles[a.position.y]?.[a.position.x];
      return (
        tile != null &&
        tile.isHabitat &&
        tile.biomeId === biomeId &&
        !a.hasMoved &&
        a.ownerId === currentPlayerId
      );
    });
  }

  /**
   * Regenerate resources for the entire game state
   */
  public static regenerateResourcesState(state: GameState): Record<string, import('../store/gameStore').Resource> {
    return this.regenerateResources(state.resources, state.biomes);
  }

  /**
   * Recalculate lushness across owned biomes using the provided board snapshot
   */
  public static recalcLushnessState(
    board: Board,
    resources: Record<string, import('../store/gameStore').Resource> = {},
    biomes: Map<string, Biome>
  ): Map<string, Biome> {
    const newBiomes = new Map(biomes);
    newBiomes.forEach((biome, biomeId) => {
      if (biome.ownerId !== null) {
        const { baseLushness, lushnessBoost, totalLushness } =
          this.calculateBiomeLushness(biomeId, board, resources, newBiomes);
        newBiomes.set(biomeId, { ...biome, baseLushness, lushnessBoost, totalLushness });
      }
    });
    return newBiomes;
  }

  /**
   * Recalculate lushness for a specific biome (single-biome update)
   */
  public static recalcBiomeLushness(
    biomes: Map<string, Biome>,
    biomeId: string,
    board: Board,
    resources: Record<string, import('../store/gameStore').Resource> = {}
  ): Map<string, Biome> {
    const newBiomes = new Map(biomes);
    const biome = newBiomes.get(biomeId);
    if (!biome) return newBiomes;
    // Recalculate lushness only; egg count is maintained in the eggs store
    if (biome.ownerId !== null) {
      const { baseLushness, lushnessBoost, totalLushness } =
        this.calculateBiomeLushness(biomeId, board, resources, newBiomes);
      newBiomes.set(biomeId, { ...biome, baseLushness, lushnessBoost, totalLushness });
    }
    return newBiomes;
  }
}
