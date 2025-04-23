import { ResourceType, Coordinate, TerrainType, Habitat, Resource, GameConfig, AnimalState, Board, Animal, Biome, GameState } from "../store/gameStore";
import { getEggPlacementTiles, TileResult, updateBiomeLushness, getTilesForBiome, updateTileProperty } from "../store/actions";
import { MAX_LUSHNESS, EGG_PRODUCTION_THRESHOLD, MAX_LUSHNESS_BOOST } from "../constants/gameConfig";

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
}

/**
 * EcosystemController handles ecosystem-related functionality:
 * - Resource generation and management
 * - Biome health and lushness
 * - Harvesting mechanics
 * - Ecological balance simulation
 */
export class EcosystemController {
  /**
   * Reset and regenerate resources for the game board
   * This clears all existing resources and creates new ones based on terrain type and resource density
   * 
   * @param width Board width
   * @param height Board height
   * @param terrainData Array of terrain types for each tile
   * @param board The current game board
   * @param biomes Map of all biomes
   */
  public static resetResources(
    width: number, 
    height: number, 
    terrainData: TerrainType[][],
    board: Board,
    biomes: Map<string, Biome>
  ): void {
    if (!board) {
      console.warn("Board not initialized, cannot reset resources");
      return;
    }
    
    // Define resource chance (percentage of eligible tiles that should have resources)
    const resourceChance = GameConfig.resourceGenerationPercentage;
    console.log(`Resetting resources with ${resourceChance * 100}% density per biome`);
    
    // Track total resources generated
    let totalResourcesGenerated = 0;
    let totalEligibleTiles = 0;
    
    // Create a copy of the biomes map to update
    const updatedBiomes = new Map(biomes);
    
    // Process each biome separately for better distribution
    biomes.forEach((biome, biomeId) => {
      // Collect all tiles belonging to this biome
      const biomeTiles: {x: number, y: number, terrain: TerrainType}[] = [];
      
      // Scan board to find tiles in this biome
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          // Skip if this position has a habitat
          if (board.tiles[y][x].isHabitat) {
            continue;
          }
          
          // Check if tile belongs to this biome
          const tile = board.tiles[y][x];
          if (tile.biomeId === biomeId) {
            biomeTiles.push({
              x, 
              y, 
              terrain: terrainData[y][x]
            });
          }
        }
      }
      
      // Filter for tiles that can have resources
      const eligibleTiles = biomeTiles.filter(tile => {
        // Only certain terrain types can have resources
        return tile.terrain === TerrainType.GRASS ||
               tile.terrain === TerrainType.WATER ||
               tile.terrain === TerrainType.MOUNTAIN ||
               tile.terrain === TerrainType.UNDERWATER;
      });
      
      totalEligibleTiles += eligibleTiles.length;
      
      // Calculate how many tiles should have resources in this biome
      const resourceCount = Math.round(eligibleTiles.length * resourceChance);
      
      // Randomly shuffle eligible tiles and select the first resourceCount tiles
      const shuffledTiles = [...eligibleTiles].sort(() => Math.random() - 0.5);
      const selectedTiles = shuffledTiles.slice(0, resourceCount);
      
      totalResourcesGenerated += selectedTiles.length;
      
      // Update the biome's resource counts
      const updatedBiome = {
        ...biome,
        initialResourceCount: selectedTiles.length,
        nonDepletedCount: selectedTiles.length,
        totalHarvested: 0
      };
      
      // Update the biome in our copy
      updatedBiomes.set(biomeId, updatedBiome);
      
      // Set resource properties on the selected tiles
      selectedTiles.forEach(tile => {
        // Determine resource type based on terrain
        let resourceType: ResourceType | null = null;
        
        if (tile.terrain === TerrainType.GRASS) {
          resourceType = ResourceType.FOREST;
        } else if (tile.terrain === TerrainType.WATER) {
          resourceType = ResourceType.KELP;
        } else if (tile.terrain === TerrainType.MOUNTAIN) {
          resourceType = ResourceType.INSECTS;
        } else if (tile.terrain === TerrainType.UNDERWATER) {
          resourceType = ResourceType.PLANKTON;
        }
        
        // Set the tile properties directly
        if (resourceType) {
          // Update the tile with resource properties
          board.tiles[tile.y][tile.x].resourceType = resourceType;
          board.tiles[tile.y][tile.x].resourceValue = 10; // Initial value is 10
          board.tiles[tile.y][tile.x].active = true;      // Mark as active
        }
      });
    });
    
    // Update the biomes map
    biomes.clear();
    updatedBiomes.forEach((biome, biomeId) => {
      biomes.set(biomeId, biome);
    });
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
    // Get the biome to check ownership
    const biome = allBiomes.get(biomeId);
    if (!biome) {
      console.warn(`Biome ${biomeId} not found`);
      return [];
    }
    
    // Get the owner of this biome
    const biomeOwnerId = biome.ownerId;
    if (biomeOwnerId === null) {
      console.warn(`Biome ${biomeId} has no owner, cannot place eggs`);
      return [];
    }
    
    // Get all biomes owned by this player
    const playerBiomeIds = new Set<string>();
    playerBiomeIds.add(biomeId); // Always include current biome
    
    // Find all biomes owned by this player directly using biome ownership
    allBiomes.forEach((b, id) => {
      if (b.ownerId === biomeOwnerId) {
        playerBiomeIds.add(id);
      }
    });

    // Use the actions function to get the base tiles
    const eligibleTiles = getEggPlacementTiles(biomeId);
    
    // Create Coordinate[] array from TileResult[] and track adjacency scores
    const validTiles: Coordinate[] = [];
    const resourceAdjacencyMap = new Map<string, number>();
    const board = state.board;
    
    // Process each eligible tile to calculate resource adjacency
    eligibleTiles.forEach(({ x, y, tile }: TileResult) => {
      // Calculate resource adjacency score (resources in owned biomes = higher score)
      let adjacencyScore = 0;
      
      // Check adjacent tiles for resources
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          
          const nx = x + dx;
          const ny = y + dy;
          
          // Skip if out of bounds
          if (nx < 0 || ny < 0 || nx >= board.width || ny >= board.height) continue;
          
          const neighborTile = board.tiles[ny][nx];
          
          // Check if neighbor has an active resource
          if (neighborTile.active && neighborTile.resourceType) {
            // Resources in owned biomes are worth more when considering placement
            if (neighborTile.biomeId && playerBiomeIds.has(neighborTile.biomeId)) {
              adjacencyScore += 3;
            } else {
              adjacencyScore += 1;
            }
          }
        }
      }
      
      const posKey = `${x},${y}`;
      validTiles.push({ x, y });
      resourceAdjacencyMap.set(posKey, adjacencyScore);
    });
    
    // Sort valid tiles by prioritizing tiles closer to resources in owned biomes
    return validTiles.sort((a, b) => {
      const aKey = `${a.x},${a.y}`;
      const bKey = `${b.x},${b.y}`;
      
      const aAdjacency = resourceAdjacencyMap.get(aKey) || 0;
      const bAdjacency = resourceAdjacencyMap.get(bKey) || 0;
      
      // Compare adjacency scores (higher first)
      return bAdjacency - aAdjacency;
    });
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
    // Early exit on non-egg turns
    if (turn % 2 !== 0) {
      return { animals: [...animals], biomes: new Map(biomes) };
    }

    const newAnimals: Animal[] = [...animals];
    const updatedBiomes: Map<string, Biome> = new Map(biomes);

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

      newAnimals.push(...newEggs);

      // Update eggCount and lastProductionTurn
      updatedBiomes.set(biomeId, {
        ...baseUpdatedBiome,
        eggCount: biome.eggCount + newEggs.length,
      });
    });

    return { animals: newAnimals, biomes: updatedBiomes };
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
   * Calculate the percentage of blank tiles in a biome that have eggs
   * @param biomeId ID of the biome to calculate for
   * @param board The game board
   * @param biome The biome object with up-to-date eggCount
   * @returns Percentage (0-1) of blank tiles that have eggs
   */
  private static calculateEggPercentage(biomeId: string, board: Board, biome: Biome): number {
    // Get all tiles in this biome and filter for blank tiles (not active, not habitat)
    const biomeTiles = getTilesForBiome(biomeId);
    const blankTiles = biomeTiles.filter(tileResult => 
      !tileResult.tile.active && !tileResult.tile.isHabitat
    );
    
    // If no blank tiles, return 0
    if (blankTiles.length === 0) {
      return 0;
    }
    
    // Use the biome's eggCount which is kept in sync with state changes
    const eggCount = biome.eggCount;
    
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
    const activeTiles = getTilesForBiome(biomeId)
      .filter(({ tile }) => tile.active && tile.resourceType !== null)
      .map(({ tile }) => tile);
    const nonDepleted = activeTiles.length;
    let baseLushness = 0;
    if (nonDepleted > 0) {
      const currentTotal = activeTiles.reduce((sum, t) => sum + t.resourceValue, 0);
      const initialTotal = activeTiles.length * 10;
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
    if (!biome || biome.ownerId !== null) {
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
    // Can't capture if nonexistent or already owned
    const biome = biomes.get(biomeId);
    if (!biome || biome.ownerId !== null) {
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
}
