import { ResourceType, Coordinate, TerrainType, Habitat, Resource, GameConfig, AnimalState, Board, Animal, Biome, GameState } from "../store/gameStore";
import { getEggPlacementTiles, TileResult } from "../store/actions";

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
   * Generate resources for the game board
   * This creates resources on eligible tiles based on terrain type and resource density
   * 
   * @param width Board width
   * @param height Board height
   * @param terrainData Array of terrain types for each tile
   * @param board The current game board
   * @param biomes Map of all biomes
   */
  public static regenerateResources(
    width: number, 
    height: number, 
    terrainData: TerrainType[][],
    board: Board,
    biomes: Map<string, Biome>
  ): void {
    if (!board) {
      console.warn("Board not initialized, cannot regenerate resources");
      return;
    }
    
    // Define resource chance (percentage of eligible tiles that should have resources)
    const resourceChance = GameConfig.resourceGenerationPercentage;
    console.log(`Regenerating resources with ${resourceChance * 100}% density per biome`);
    
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
    if (turn % 2 !== 0) {
      return { 
        animals: animals,
        biomes: biomes
      }; // Skip production on odd-numbered turns
    }
    
    // Create copies of the animals and biomes for immutability
    const newAnimals = [...animals];
    const updatedBiomes = new Map(biomes);
    
    // Process each biome
    biomes.forEach((biome, biomeId) => {
      // Skip biomes that don't have an owner
      if (biome.ownerId === null) {
        return;
      }
      
      // Skip biomes that have already produced in this turn
      if (biome.lastProductionTurn === turn) {
        return;
      }
      
      // TODO: Implement lushness check here (must be ≥ 7.0)
      // Currently using a fixed production rate
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
      for (let i = 0; i < Math.min(eggsToCreate, validTiles.length); i++) {
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
        
        console.log(`Created new animal during production:`, { 
          id: newAnimal.id, 
          type: newAnimal.species, 
          terrain: terrain 
        });
        
        // Mark the tile as having an egg
        board.tiles[tile.y][tile.x].hasEgg = true;
        
        newAnimals.push(newAnimal);
      }

      // Update biome's last production turn
      const updatedBiome: Biome = {
        ...biome,
        lastProductionTurn: turn
      };
      updatedBiomes.set(biomeId, updatedBiome);
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
   * Selects a resource tile on the board.
   * 
   * @param x X coordinate of the resource tile
   * @param y Y coordinate of the resource tile
   * @param resources Array of all resources in the game
   * @returns True if a resource was successfully selected
   */
  public static selectResourceTile(x: number, y: number, resources: Resource[]): boolean {
    // Check if there's a resource at this position
    const resource = resources.find(r => 
      r.position.x === x && r.position.y === y
    );

    if (!resource) {
      console.warn(`No resource found at position ${x},${y}`);
      return false;
    }

    // TODO: Store the selected resource in state
    console.log(`Selected resource: ${resource.id} of type ${resource.type}`);
    return true;
  }

  /**
   * Harvests a specified amount from a resource.
   * 
   * @param resourceId ID of the resource to harvest
   * @param amount Amount to harvest (0-10 scale)
   * @param resources Array of all resources in the game
   * @param biomes Map of all biomes
   * @returns True if harvesting was successful
   */
  public static harvestResource(
    resourceId: string, 
    amount: number, 
    resources: Resource[], 
    biomes: Map<string, Biome>
  ): boolean {
    // Validate amount
    if (amount < 0 || amount > 10) {
      console.error(`Invalid harvest amount: ${amount}, must be between 0-10`);
      return false;
    }

    // Find the resource in the state
    const resource = resources.find(r => r.id === resourceId);
    
    if (!resource) {
      console.error(`Resource ${resourceId} not found`);
      return false;
    }

    // Get the biome associated with this resource
    const biomeId = resource.biomeId;
    if (biomeId) {
      const biome = biomes.get(biomeId);
      if (biome) {
        // Get the updated biome with increased totalHarvested
        const updatedBiome = {
          ...biome,
          totalHarvested: biome.totalHarvested + amount
        };
        
        // Assume resource is being depleted if amount is its maximum value (10)
        // Since we don't have a 'value' property on Resource objects directly
        const isBeingDepleted = amount >= 10;
        
        // If resource is being depleted, decrease nonDepletedCount
        if (isBeingDepleted && updatedBiome.nonDepletedCount > 0) {
          updatedBiome.nonDepletedCount--;
        }
        
        // Update the biome in the map
        biomes.set(biomeId, updatedBiome);
        
        // TODO: Recalculate baseLushness after harvesting
      }
    }
    
    // TODO: Add harvested resources to player's energy counter
    
    return true;
  }

  /**
   * Calculates the base lushness value for a biome based on its resources.
   * 
   * @param biomeId ID of the biome to calculate base lushness for
   * @param biomes Map of all biomes
   * @returns Base lushness value (0-10 scale)
   */
  public static calculateBiomeLushness(biomeId: string, biomes: Map<string, Biome>): number {
    const biome = biomes.get(biomeId);
    
    if (!biome) {
      console.warn(`Biome ${biomeId} not found`);
      return 0;
    }
    
    // TODO: Calculate baseLushness based on resource count and values
    const defaultLushness = 8.0; // Default "stable" value
    
    // TODO: Implement the polynomial resource generation formula
    
    return defaultLushness;
  }

  /**
   * Updates all biomes' lushness values based on their current resources.
   * 
   * @param biomes Map of all biomes
   * @returns Updated map of biomes with new lushness values
   */
  public static updateAllBiomeLushness(biomes: Map<string, Biome>): Map<string, Biome> {
    const updatedBiomes = new Map<string, Biome>();
    
    // Iterate through all biomes
    biomes.forEach((biome, biomeId) => {
      const baseLushness = this.calculateBiomeLushness(biomeId, biomes);
      const updatedBiome: Biome = {
        ...biome,
        baseLushness,
        totalLushness: baseLushness + biome.lushnessBoost
      };
      updatedBiomes.set(biomeId, updatedBiome);
    });
    
    return updatedBiomes;
  }

  /**
   * Regenerates resources in all biomes based on their lushness.
   * Higher lushness = faster regeneration.
   * 
   * @param biomes Map of all biomes
   * @param resources Current resources
   * @param board The game board
   * @returns Updated resources array
   */
  public static regenerateAllResources(
    biomes: Map<string, Biome>, 
    resources: Resource[], 
    board: Board
  ): Resource[] {
    // TODO: Iterate through biomes and regenerate resources based on lushness
    console.log("Regenerating resources based on biome lushness");
    
    // For now, return the same resources
    return [...resources];
  }

  /**
   * Gets the count of resources for a specific biome
   * 
   * @param biomeId ID of the biome to count resources for
   * @param board The game board
   * @returns Count of all resources (active and depleted) in the biome
   */
  public static getBiomeResourceCount(biomeId: string, board: Board): number {
    if (!board) {
      return 0;
    }
    
    let count = 0;
    
    // Scan board to find resource tiles in this biome
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const tile = board.tiles[y][x];
        if (tile.biomeId === biomeId && tile.resourceType !== null) {
          count++;
        }
      }
    }
    
    return count;
  }

  /**
   * Gets the count of non-depleted resources for a specific biome
   * 
   * @param biomeId ID of the biome to count active resources for
   * @param board The game board
   * @returns Count of active (non-depleted) resources in the biome
   */
  public static getBiomeNonDepletedResourceCount(biomeId: string, board: Board): number {
    if (!board) {
      return 0;
    }
    
    let count = 0;
    
    // Scan board to find active resource tiles in this biome
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const tile = board.tiles[y][x];
        if (tile.biomeId === biomeId && tile.resourceType !== null && tile.active) {
          count++;
        }
      }
    }
    
    return count;
  }

  /**
   * Updates the resource counts for all biomes
   * 
   * @param biomes Map of all biomes
   * @param board The game board
   * @returns Updated biomes with correct non-depleted counts
   */
  public static updateAllBiomeResourceCounts(biomes: Map<string, Biome>, board: Board): Map<string, Biome> {
    const updatedBiomes = new Map(biomes);
    
    // Process each biome
    updatedBiomes.forEach((biome, biomeId) => {
      const nonDepletedCount = this.getBiomeNonDepletedResourceCount(biomeId, board);
      
      // Update the biome with the new count
      const updatedBiome = {
        ...biome,
        nonDepletedCount
      };
      
      updatedBiomes.set(biomeId, updatedBiome);
    });
    
    return updatedBiomes;
  }
} 