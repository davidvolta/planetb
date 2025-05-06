import { Coordinate, AnimalState, Board, Animal, Biome, Tile } from "../store/gameStore";
import { TerrainType, ResourceType } from "../types/gameTypes";
import { getEggPlacementTiles, getTilesForBiome, getEggCountForBiome } from "../store/actions";
import { MAX_LUSHNESS, EGG_PRODUCTION_THRESHOLD, MAX_LUSHNESS_BOOST, RESOURCE_GENERATION_PERCENTAGE } from "../constants/gameConfig";
import type { GameState } from "../store/gameStore";
import { MovementController } from "./MovementController";
import { useGameStore } from "../store/gameStore";

/**
 * Interface for egg placement validation
 */
interface ValidEggPlacementState {
  board: Board;
  animals: Animal[];
}

/**
 * Interface for the return type of biomeEggProduction
 */
interface BiomeProductionResult {
  animals: Animal[];
  biomes: Map<string, Biome>;
  eggs: Animal[];
}

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
    board: Board,
    biomes: Map<string, Biome>
  ): Board {
    const newBoard: Board = {
      ...board,
      tiles: board.tiles.map(row => row.map(tile => ({ ...tile })))
    };
    const maxValue = 10;
    biomes.forEach((biome, biomeId) => {
      if (biome.ownerId !== null) {
        const generationRate = this.calculateResourceGenerationRate(biome.totalLushness);
        for (let y = 0; y < newBoard.height; y++) {
          for (let x = 0; x < newBoard.width; x++) {
            const tile = newBoard.tiles[y][x];
            if (
              tile.biomeId === biomeId &&
              tile.active &&
              tile.resourceValue > 0 &&
              tile.resourceValue < maxValue
            ) {
              const regen = generationRate * (1 - tile.resourceValue / maxValue);
              tile.resourceValue = Math.min(maxValue, tile.resourceValue + regen);
            }
          }
        }
      }
    });
    return newBoard;
  }

  /**
   * Reset and regenerate resources for the game board
   * This clears all existing resources and creates new ones based on terrain type and resource density
   * 
   * @param width Board width
   * @param height Board height
   * @param terrainData Array of terrain types for each tile
   * @param board The current game board
   * @param biomes Map of all biomes
   * @param resourceChance Decimal 0–1 of resource density (defaults to constant)
   */
  public static resetResources(
    width: number,
    height: number,
    terrainData: TerrainType[][],
    board: Board,
    biomes: Map<string, Biome>,
    resourceChance: number = RESOURCE_GENERATION_PERCENTAGE
  ): void {
    if (!board) {
      console.warn("Board not initialized, cannot reset resources");
      return;
    }

    const updatedBiomes = new Map(biomes);

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
        const t = board.tiles[y][x];
        t.resourceType = type;
        t.resourceValue = 10;
        t.active = true;
      });
    });

    // Commit updated biomes map
    biomes.clear();
    updatedBiomes.forEach((b, id) => biomes.set(id, b));
  }

  /**
   * Gets all valid tiles for egg placement in a biome
   * Valid tiles are in the biome, don't have eggs, and don't have active resources
   * 
   * @param biomeId The ID of the biome to find valid egg placement tiles for
   * @param state Simplified game state containing board and animals
   * @param allBiomes Map of all biomes
   * @returns Array of valid tile coordinates for egg placement, prioritized by proximity to resources in owned biomes
   */
  public static getValidEggPlacementTiles(
    biomeId: string,
    state: ValidEggPlacementState,
    allBiomes: Map<string, Biome>
  ): Coordinate[] {
    const board = state.board;
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
   * Process egg production for all biomes.
   * 
   * @param turn Current turn number
   * @param animals Array of all animals
   * @param biomes Map of all biomes
   * @param board The game board
   * @returns Updated animals and biomes
   */
  public static biomeEggProduction(
    turn: number,
    animals: Animal[],
    biomes: Map<string, Biome>,
    board: Board
  ): BiomeProductionResult {

    // Only produce eggs on even turns
    if (turn % 2 !== 0) {
      // Just update lastProductionTurn for all biomes and return
      const updatedBiomes: Map<string, Biome> = new Map(biomes);
      biomes.forEach((biome, biomeId) => {
        updatedBiomes.set(biomeId, { ...biome, lastProductionTurn: turn });
      });
      return { animals: [...animals], biomes: updatedBiomes, eggs: [] };
    }

    const newAnimals: Animal[] = [...animals];
    const updatedBiomes: Map<string, Biome> = new Map(biomes);
    const allNewEggs: Animal[] = [];

    biomes.forEach((biome, biomeId) => {
      // Skip biomes without owner or already processed
      if (biome.ownerId === null || biome.lastProductionTurn === turn) {
        return;
      }

      // Prepare base update for lastProductionTurn
      const baseUpdatedBiome: Biome = { ...biome, lastProductionTurn: turn };

      // If not enough lushness or nothing to produce, update turn and skip
      if (biome.totalLushness < EGG_PRODUCTION_THRESHOLD || biome.productionRate <= 0) {
        updatedBiomes.set(biomeId, baseUpdatedBiome);
        return;
      }

      // Determine valid egg placement tiles
      const validTiles = this.getValidEggPlacementTiles(
        biomeId,
        { board, animals: newAnimals },
        biomes
      );
      const eggsToPlace = Math.min(biome.productionRate, validTiles.length);
      const startIndex = newAnimals.length;

      // Create new egg animals
      const newEggs = validTiles.slice(0, eggsToPlace).map((tile, idx) => {
        board.tiles[tile.y][tile.x].hasEgg = true;
        return {
          id: `animal-${startIndex + idx}`,
          species: this.getSpeciesForTerrain(board.tiles[tile.y][tile.x].terrain),
          state: AnimalState.DORMANT,
          position: tile,
          previousPosition: null,
          hasMoved: false,
          ownerId: biome.ownerId!,
        } as Animal;
      });

      // Append new eggs to animals list and tracking
      newAnimals.push(...newEggs);
      allNewEggs.push(...newEggs);

      // Only update lastProductionTurn for this biome
      updatedBiomes.set(biomeId, baseUpdatedBiome);
    });

    return { animals: newAnimals, biomes: updatedBiomes, eggs: allNewEggs };
  }

  /**
   * Helper method to determine the appropriate species based on terrain type
   * (Moved from TERRAIN_ANIMAL_MAP in gameStore to maintain encapsulation)
   * 
   * @param terrain The terrain type to get a species for
   * @returns The appropriate species for the terrain
   */
  private static getSpeciesForTerrain(terrain: TerrainType): string {
    const terrainSpeciesMap: Record<TerrainType, string> = {
      [TerrainType.GRASS]: 'buffalo',
      [TerrainType.MOUNTAIN]: 'bird',
      [TerrainType.WATER]: 'turtle',
      [TerrainType.UNDERWATER]: 'octopus',
      [TerrainType.BEACH]: 'snake',
    };
    
    return terrainSpeciesMap[terrain] || 'snake'; // Default to snake if unknown terrain
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
  private static calculateEggPercentage(biomeId: string, board: Board, biome: Biome): number {
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
   * @param biomes Map of all biomes
   * @returns Object containing baseLushness, lushnessBoost, and totalLushness
   */
  public static calculateBiomeLushness(
    biomeId: string,
    board: Board,
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
    // Get active resource tiles in this biome
    const activeTiles = this.getBoardTilesForBiome(board, biomeId)
      .filter(({ tile }) => tile.active && tile.resourceType !== null)
      .map(({ tile }) => tile);
    // Calculate base lushness relative to initial resource count
    const currentTotal = activeTiles.reduce((sum, t) => sum + t.resourceValue, 0);
    const initialTotal = biome.initialResourceCount * 10;
    let baseLushness = 0;
    if (initialTotal > 0) {
      baseLushness = (currentTotal / initialTotal) * MAX_LUSHNESS;
    }
    const eggPercentage = this.calculateEggPercentage(biomeId, board, biome);
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
    players: any[],
    currentPlayerId: number,
    biomes: Map<string, Biome>,
    amount: number
  ): { board: Board; players: any[]; biomes: Map<string, Biome> } {
    // Deep copy of board
    const newBoard: Board = {
      ...board,
      tiles: board.tiles.map(row => row.map(tile => ({ ...tile })))
    };
    const { x, y } = coord;
    const tile = newBoard.tiles[y][x];
    if (!tile.active || tile.resourceType === null) {
      return { board: newBoard, players: [...players], biomes: new Map(biomes) };
    }
    // Determine harvest amount
    const harvestAmount = Math.min(amount, tile.resourceValue);
    // Update tile
    tile.resourceValue -= harvestAmount;
    if (tile.resourceValue <= 0) tile.active = false;

    // Update players
    const newPlayers = players.map(player =>
      player.id === currentPlayerId
        ? { ...player, energy: player.energy + harvestAmount }
        : player
    );

    // Update biome stats
    const biomeId = tile.biomeId!;
    const newBiomes = new Map(biomes);
    const biome = biomes.get(biomeId)!;
    const newNonDepleted = tile.resourceValue <= 0
      ? Math.max(0, biome.nonDepletedCount - 1)
      : biome.nonDepletedCount;
    newBiomes.set(biomeId, {
      ...biome,
      totalHarvested: biome.totalHarvested + harvestAmount,
      nonDepletedCount: newNonDepleted
    });

    return { board: newBoard, players: newPlayers, biomes: newBiomes };
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

    // Find an active unit on the habitat that hasn't moved
    const unitsOnHabitat = animals.filter(a => {
      const tile = board.tiles[a.position.y]?.[a.position.x];
      return (
        tile &&
        tile.isHabitat &&
        tile.biomeId === biomeId &&
        a.state === AnimalState.ACTIVE &&
        !a.hasMoved &&
        a.ownerId === currentPlayerId
      );
    });
    let newAnimals: Animal[] = [...animals];
    if (unitsOnHabitat.length > 0) {
      const unitId = unitsOnHabitat[0].id;
      newAnimals = animals.map(a =>
        a.id === unitId ? { ...a, hasMoved: true } : a
      );
    }
    // Transfer ownership of all dormant units (eggs) in this biome to the new owner
    newAnimals = newAnimals.map(a => {
      const tile = board.tiles[a.position.y]?.[a.position.x];
      if (
        tile &&
        tile.biomeId === biomeId &&
        a.state === AnimalState.DORMANT &&
        a.ownerId !== currentPlayerId
      ) {
        return { ...a, ownerId: currentPlayerId };
      }
      return a;
    });
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
    // Is there an alive, active unit of the current player on that habitat?
    return animals.some(a => {
      const tile = board.tiles[a.position.y]?.[a.position.x];
      return (
        tile != null &&
        tile.isHabitat &&
        tile.biomeId === biomeId &&
        a.state === AnimalState.ACTIVE &&
        !a.hasMoved &&
        a.ownerId === currentPlayerId
      );
    });
  }

  /**
   * Regenerate resources for the entire game state
   */
  public static regenerateResourcesState(state: GameState): Board {
    return this.regenerateResources(state.board!, state.biomes);
  }

  /**
   * Produce eggs for the entire game state using the given board snapshot
   */
  public static produceEggsState(
    state: GameState,
    board: Board
  ): { animals: Animal[]; biomes: Map<string, Biome> } {
    // Destructure only animals and biomes, ignore eggs
    const { animals, biomes } = this.biomeEggProduction(
      state.turn,
      state.animals,
      state.biomes,
      board
    );
    return { animals, biomes };
  }

  /**
   * Recalculate lushness across owned biomes using the provided board snapshot
   */
  public static recalcLushnessState(
    board: Board,
    biomes: Map<string, Biome>
  ): Map<string, Biome> {
    const newBiomes = new Map(biomes);
    newBiomes.forEach((biome, biomeId) => {
      if (biome.ownerId !== null) {
        const { baseLushness, lushnessBoost, totalLushness } =
          this.calculateBiomeLushness(biomeId, board, newBiomes);
        newBiomes.set(biomeId, { ...biome, baseLushness, lushnessBoost, totalLushness });
      }
    });
    return newBiomes;
  }

  /**
   * Get a dormant egg by ID from game state
   */
  public static getEggById(state: GameState, id: string): Animal | undefined {
    return state.animals.find(a => a.id === id && a.state === AnimalState.DORMANT);
  }

  /**
   * Remove egg flag from the board at a coordinate
   */
  public static removeEggFromPosition(board: Board, coord: Coordinate): Board {
    return {
      ...board,
      tiles: board.tiles.map((row, y) =>
        row.map((tile, x) => (
          x === coord.x && y === coord.y
            ? { ...tile, hasEgg: false }
            : tile
        ))
      )
    };
  }

  /**
   * Recalculate lushness for a specific biome (single-biome update)
   */
  public static recalcBiomeLushness(
    biomes: Map<string, Biome>,
    biomeId: string,
    board: Board
  ): Map<string, Biome> {
    const newBiomes = new Map(biomes);
    const biome = newBiomes.get(biomeId);
    if (!biome) return newBiomes;
    // Recalculate lushness only; egg count is maintained in the eggs store
    if (biome.ownerId !== null) {
      const { baseLushness, lushnessBoost, totalLushness } =
        this.calculateBiomeLushness(biomeId, board, newBiomes);
      newBiomes.set(biomeId, { ...biome, baseLushness, lushnessBoost, totalLushness });
    }
    return newBiomes;
  }

  /**
   * Evolve an egg into an active animal, handling displacement, board updates, and lushness.
   */
  public static evolveAnimalState(
    state: GameState,
    id: string
  ): {
    animals: Animal[];
    board: Board;
    biomes: Map<string, Biome>;
    displacementEvent: GameState['displacementEvent'];
  } {
    // Find the egg
    const egg = this.getEggById(state, id);
    if (!egg) {
      console.warn(`Cannot evolve animal ${id}: not found or not a dormant egg`);
      return {
        animals: state.animals,
        board: state.board!,
        biomes: state.biomes,
        displacementEvent: { occurred: false, unitId: null, fromX: null, fromY: null, toX: null, toY: null, timestamp: null } as GameState['displacementEvent']
      };
    }
    // Prepare initial state
    const board = state.board!;
    let animals = state.animals;
    let displacementEvent: GameState['displacementEvent'] = { occurred: false, unitId: null, fromX: null, fromY: null, toX: null, toY: null, timestamp: null };
    const eggPos = egg.position;
    // Handle displacement
    const collider = animals.find(a =>
      a.id !== id && a.state === AnimalState.ACTIVE && a.position.x === eggPos.x && a.position.y === eggPos.y
    );
    if (collider) {
      animals = MovementController.handleDisplacement(
        eggPos.x,
        eggPos.y,
        collider,
        animals,
        board
      );
      const displaced = animals.find(a => a.id === collider.id)!;
      displacementEvent = {
        occurred: true,
        unitId: collider.id,
        fromX: collider.position.x,
        fromY: collider.position.y,
        toX: displaced.position.x,
        toY: displaced.position.y,
        timestamp: Date.now()
      };
    }
    // Remove egg from board
    const newBoard = this.removeEggFromPosition(board, eggPos);
    // Update biomes
    const tile = board.tiles[eggPos.y][eggPos.x];
    const biomeId = tile.biomeId;
    const newBiomes = biomeId
      ? this.recalcBiomeLushness(state.biomes, biomeId, newBoard)
      : state.biomes;
    // Activate the egg
    const finalAnimals = animals.map(a =>
      a.id === id ? { ...a, state: AnimalState.ACTIVE, hasMoved: true } : a
    );
    return { animals: finalAnimals, board: newBoard, biomes: newBiomes, displacementEvent };
  }
}
