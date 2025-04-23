import { ResourceType, Coordinate, TerrainType, Habitat, Resource, GameConfig, AnimalState, Board, Animal, Biome, GameState } from "../store/gameStore";
import { getEggPlacementTiles, TileResult, updateBiomeLushness, getTilesForBiome, updateTileProperty } from "../store/actions";
import { MAX_LUSHNESS, EGG_PRODUCTION_THRESHOLD, MAX_LUSHNESS_BOOST } from "../constants/gameConfig";
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
    // Only produce eggs on even-numbered turns
    const shouldProduceEggs = turn % 2 === 0;
    const newAnimals = [...animals];
    const updatedBiomes = new Map(biomes);
    
    // If it's not a turn to produce eggs, just return
    if (!shouldProduceEggs) {
      return {
        animals: newAnimals,
        biomes: updatedBiomes
      };
    }
    
    biomes.forEach((biome, biomeId) => {
      // Skip biomes that don't have an owner
      if (biome.ownerId === null) {
        return;
      }
      
      // Skip biomes that have already produced in this turn
      if (biome.lastProductionTurn === turn) {
        return;
      }
      
      // Check if biome's total lushness is high enough to produce eggs (≥ 7.0)
      if (biome.totalLushness < EGG_PRODUCTION_THRESHOLD) {
        // Update the biome's last production turn even if no eggs are produced
        const updatedBiome: Biome = {
          ...biome,
          lastProductionTurn: turn
        };
        updatedBiomes.set(biomeId, updatedBiome);
        return;
      }
      
      // Proceed with egg production if lushness is sufficient
      const eggsToCreate = biome.productionRate;
      
      if (eggsToCreate <= 0) {
        return;
      }

      // Find valid tiles for egg placement
      const validTiles = this.getValidEggPlacementTiles(
        biomeId, 
        {
          board: board,
          animals: newAnimals
        },
        biomes
      );

      // Place eggs on valid tiles - use best tiles first (highest resource adjacency)
      const eggsPlaced = Math.min(eggsToCreate, validTiles.length);
      for (let i = 0; i < eggsPlaced; i++) {
        // Take from the start of the array (highest resource adjacency first)
        const tile = validTiles[i];

        // Get appropriate species based on terrain
        const terrain = board.tiles[tile.y][tile.x].terrain;
        const species = this.getSpeciesForTerrain(terrain);

        // Create new egg (owned by the biome owner)
        const newAnimal: Animal = {
          id: `animal-${newAnimals.length}`,
          species,
          state: AnimalState.DORMANT,
          position: tile,
          previousPosition: null,
          hasMoved: false,
          ownerId: biome.ownerId,
        };
        
        // Mark the tile as having an egg
        board.tiles[tile.y][tile.x].hasEgg = true;
        
        newAnimals.push(newAnimal);
      }

      // Update biome's last production turn and increment eggCount
      const newEggCount = biome.eggCount + eggsPlaced;
      const updatedBiome: Biome = {
        ...biome,
        lastProductionTurn: turn,
        eggCount: newEggCount
      };
      
      updatedBiomes.set(biomeId, updatedBiome);
      
      // Update the state with the new egg count before calling updateBiomeLushness
      const tempBiomes = new Map(useGameStore.getState().biomes);
      tempBiomes.set(biomeId, updatedBiome);
      useGameStore.setState({ biomes: tempBiomes });
      
      // Update the lushness boost for this biome based on new egg percentage
      // Only if we actually added eggs
      if (eggsPlaced > 0) {
        // Use the new updateBiomeLushness action instead of directly calculating
        // Import and call from the actions module to ensure consistent lushness updates
        updateBiomeLushness(biomeId);
        
        // The biome should now be updated in the store, but we need to get the new values
        // for our local updatedBiomes map to return the correct data
        const state = useGameStore.getState();
        const refreshedBiome = state.biomes.get(biomeId);
        
        if (refreshedBiome) {
          updatedBiomes.set(biomeId, refreshedBiome);
        }
      }
    });
    
    return {
      animals: newAnimals,
      biomes: updatedBiomes
    };
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
   * Calculate lushness for a biome, returning all lushness values
   * @param biomeId ID of the biome to calculate lushness for
   * @param biomes Map of all biomes
   * @returns Object containing baseLushness, lushnessBoost, and totalLushness
   */
  public static calculateBiomeLushness(biomeId: string, biomes: Map<string, Biome>): {
    baseLushness: number;
    lushnessBoost: number;
    totalLushness: number;
  } {
    const biome = biomes.get(biomeId);
    
    if (!biome) {
      console.warn(`Biome ${biomeId} not found`);
      return {
        baseLushness: 0,
        lushnessBoost: 0,
        totalLushness: 0
      };
    }
    
    // Get the board from the store to access tile data
    const state = useGameStore.getState();
    if (!state.board) {
      console.warn("Board not available, cannot calculate lushness");
      return {
        baseLushness: 0,
        lushnessBoost: 0,
        totalLushness: 0
      };
    }
    
    // Get all active resource tiles in this biome
    const activeTiles = [];
    for (let y = 0; y < state.board.height; y++) {
      for (let x = 0; x < state.board.width; x++) {
        const tile = state.board.tiles[y][x];
        if (tile.biomeId === biomeId && tile.active && tile.resourceType !== null) {
          activeTiles.push(tile);
        }
      }
    }
    
    // Count tiles with non-depleted resources (resourceValue > 0)
    const nonDepletedTiles = activeTiles.filter(tile => tile.resourceValue > 0).length;
    
    // If all active tiles are depleted or there are no active tiles, lushness is 0
    let baseLushness = 0;
    if (nonDepletedTiles > 0) {
      // Calculate total current resource value
      const currentTotal = activeTiles.reduce((sum, tile) => sum + tile.resourceValue, 0);
      
      // Calculate initial total (all resources start with value 10)
      const initialTotal = activeTiles.length * 10;
      
      // Resource health ratio (how close to initial state)
      const resourceRatio = currentTotal / initialTotal;
      
      // Direct linear mapping of resource ratio to base lushness
      baseLushness = resourceRatio * MAX_LUSHNESS;
    }

    // Calculate lushnessBoost based on egg percentage
    // Pass the biome object to use its eggCount directly
    const eggPercentage = this.calculateEggPercentage(biomeId, state.board, biome);
    const lushnessBoost = this.calculateLushnessBoost(eggPercentage);
    
    // Calculate total lushness (base + boost)
    const totalLushness = baseLushness + lushnessBoost;
    
    return {
      baseLushness,
      lushnessBoost,
      totalLushness
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
   * Update lushness values of a biome directly in the store.
   */
  public static updateBiomeLushness(biomeId: string): void {
    const state = useGameStore.getState();
    const biome = state.biomes.get(biomeId);
    if (!biome) {
      console.warn(`Biome ${biomeId} not found, cannot update lushness`);
      return;
    }
    const { baseLushness, lushnessBoost, totalLushness } = this.calculateBiomeLushness(
      biomeId,
      state.biomes
    );
    const updatedBiome = {
      ...biome,
      baseLushness,
      lushnessBoost,
      totalLushness,
      eggCount: biome.eggCount
    };
    const updatedBiomes = new Map(state.biomes);
    updatedBiomes.set(biomeId, updatedBiome);
    useGameStore.setState({ biomes: updatedBiomes });
  }
}
