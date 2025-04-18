import { ResourceType, Coordinate, TerrainType, Habitat, Resource, GameConfig, AnimalState, Board, Animal, HabitatState, Biome, GameState } from "../store/gameStore";
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
   * Generates resources based on terrain type and biome distribution
   * 
   * @param width Board width
   * @param height Board height
   * @param terrainData 2D array of terrain types
   * @param habitats Array of habitats to exclude from resource placement
   * @returns Array of generated resources
   */
  public static generateResources(
    width: number, 
    height: number, 
    terrainData: TerrainType[][], 
    habitats: Habitat[]
  ): Resource[] {
    const resources: Resource[] = [];
    
    // Track positions where habitats exist
    const habitatPositions = new Set<string>();
    habitats.forEach(habitat => {
      habitatPositions.add(`${habitat.position.x},${habitat.position.y}`);
    });
    
    // Define resource chance (percentage of eligible tiles that should have resources)
    const resourceChance = GameConfig.resourceGenerationPercentage;
    
    // Group tiles by biome (needs to be extracted from state.board.tiles)
    const state = useGameStore.getState();
    const biomeToTiles = new Map<string | null, {x: number, y: number, terrain: TerrainType}[]>();
    
    // First, we group all tiles by their biome ID
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Skip if this position has a habitat
        if (habitatPositions.has(`${x},${y}`)) {
          continue;
        }
        
        // Get the biome ID from the corresponding tile
        const biomeId = state.board?.tiles[y][x].biomeId || null;
        
        // If this biome isn't in our map yet, add it
        if (!biomeToTiles.has(biomeId)) {
          biomeToTiles.set(biomeId, []);
        }
        
        // Add this tile to its biome group
        biomeToTiles.get(biomeId)?.push({
          x, 
          y, 
          terrain: terrainData[y][x]
        });
      }
    }
    
    // Now process each biome separately
    biomeToTiles.forEach((tiles, biomeId) => {
      // Count resources by type for this biome
      const biomeResourceCounts = {
        [ResourceType.FOREST]: 0,
        [ResourceType.KELP]: 0,
        [ResourceType.INSECTS]: 0,
        [ResourceType.PLANKTON]: 0
      };
      
      // First, filter for tiles that can have resources
      const eligibleTiles = tiles.filter(tile => {
        // Only grass, water, mountain, and underwater can have resources
        return tile.terrain === TerrainType.GRASS ||
               tile.terrain === TerrainType.WATER ||
               tile.terrain === TerrainType.MOUNTAIN ||
               tile.terrain === TerrainType.UNDERWATER;
      });
      
      // Calculate exactly how many tiles should have resources
      const resourceCount = Math.round(eligibleTiles.length * resourceChance);
      
      // Randomly shuffle eligible tiles and select the first resourceCount tiles
      const shuffledTiles = [...eligibleTiles].sort(() => Math.random() - 0.5);
      const selectedTiles = shuffledTiles.slice(0, resourceCount);
      
      // Create resources on the selected tiles
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
        
        // Add the resource
        if (resourceType) {
          resources.push({
            id: `resource-${resources.length}`,
            type: resourceType,
            position: { x: tile.x, y: tile.y },
            biomeId: biomeId
          });
          
          // Increment count for this resource type in this biome
          biomeResourceCounts[resourceType]++;
        }
      });
    });
    
    return resources;
  }

  /**
   * Gets all valid tiles for egg placement in a habitat's biome
   * Valid tiles are in the same biome as the habitat, don't have eggs, and don't have resources
   * 
   * @param habitat The habitat to find valid egg placement tiles for
   * @param state Simplified game state containing board and animals
   * @returns Array of valid tile coordinates for egg placement, prioritized by proximity to resources in owned biomes
   */
  public static getValidEggPlacementTiles(
    habitat: Habitat,
    state: ValidEggPlacementState
  ): Coordinate[] {
    const validTiles: Coordinate[] = [];
    const board = state.board;
    
    if (!board) {
      return validTiles;
    }
    
    // Get the habitat's biome ID from the tile
    const habitatTile = board.tiles[habitat.position.y][habitat.position.x];
    const habitatBiomeId = habitat.biomeId;
    
    if (!habitatBiomeId) {
      console.warn(`Habitat at ${habitat.position.x},${habitat.position.y} has no biome ID`);
      return validTiles;
    }
    
    // Get the biome to check ownership
    const biome = useGameStore.getState().biomes.get(habitatBiomeId);
    if (!biome) {
      console.warn(`Biome ${habitatBiomeId} not found`);
      return validTiles;
    }
    
    // Get the owner of this biome
    const biomeOwnerId = biome.ownerId;
    if (biomeOwnerId === null) {
      console.warn(`Biome ${habitatBiomeId} has no owner, cannot place eggs`);
      return validTiles;
    }
    
    // Get all biomes owned by this player
    const playerBiomeIds = new Set<string>();
    playerBiomeIds.add(habitatBiomeId); // Always include current biome
    
    // Find all biomes owned by this player directly using biome ownership
    const allBiomes = useGameStore.getState().biomes;
    allBiomes.forEach((b, id) => {
      if (b.ownerId === biomeOwnerId) {
        playerBiomeIds.add(id);
      }
    });
    
    console.log(`Player ${biomeOwnerId} owns ${playerBiomeIds.size} biomes`);
    
    // Create a set of resource positions for quick lookup
    const resourcePositions = new Set<string>();
    const resourceBiomeMap = new Map<string, string | undefined>();
    const resources = useGameStore.getState().resources;
    
    resources.forEach(resource => {
      const key = `${resource.position.x},${resource.position.y}`;
      resourcePositions.add(key);
      // Store the biome ID for each resource
      const resourceTile = board.tiles[resource.position.y][resource.position.x];
      resourceBiomeMap.set(key, resourceTile.biomeId || undefined);
    });
    
    // Track positions with resources for prioritization
    const resourceAdjacencyMap = new Map<string, number>();
    // Track proximity to habitat
    const habitatProximityMap = new Map<string, boolean>();
    
    // Scan the entire board for tiles in this biome
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        // Skip the habitat's own position
        if (x === habitat.position.x && y === habitat.position.y) continue;
        
        const tile = board.tiles[y][x];
        
        // Skip if not in the same biome
        if (tile.biomeId !== habitatBiomeId) continue;
        
        // Skip if there's a resource on this tile
        if (resourcePositions.has(`${x},${y}`)) continue;
        
        // Check if tile already has an egg
        const hasEgg = state.animals.some(animal => 
          animal.state === AnimalState.DORMANT &&
          animal.position.x === x &&
          animal.position.y === y
        );
        
        if (!hasEgg) {
          // Calculate resource adjacency score (resources in owned biomes = higher score)
          let adjacencyScore = 0;
          const isNearHabitat = Math.abs(x - habitat.position.x) <= 2 && Math.abs(y - habitat.position.y) <= 2;
          
          // Check adjacent tiles for resources
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              if (dx === 0 && dy === 0) continue;
              
              const nx = x + dx;
              const ny = y + dy;
              
              // Skip if out of bounds
              if (nx < 0 || ny < 0 || nx >= board.width || ny >= board.height) continue;
              
              const resourceKey = `${nx},${ny}`;
              if (resourcePositions.has(resourceKey)) {
                const resourceBiomeId = resourceBiomeMap.get(resourceKey);
                
                // Resources in owned biomes are worth more when considering placement
                if (resourceBiomeId && playerBiomeIds.has(resourceBiomeId)) {
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
          habitatProximityMap.set(posKey, isNearHabitat);
        }
      }
    }
    
    // Sort valid tiles by prioritizing:
    // 1. Tiles closer to resources in owned biomes
    // 2. Tiles closer to the habitat
    return validTiles.sort((a, b) => {
      const aKey = `${a.x},${a.y}`;
      const bKey = `${b.x},${b.y}`;
      
      const aAdjacency = resourceAdjacencyMap.get(aKey) || 0;
      const bAdjacency = resourceAdjacencyMap.get(bKey) || 0;
      
      // First compare adjacency scores
      if (aAdjacency !== bAdjacency) {
        return bAdjacency - aAdjacency; // Higher score first
      }
      
      // Then compare proximity to habitat
      const aIsNearHabitat = habitatProximityMap.get(aKey) || false;
      const bIsNearHabitat = habitatProximityMap.get(bKey) || false;
      
      if (aIsNearHabitat !== bIsNearHabitat) {
        return aIsNearHabitat ? -1 : 1; // Near habitat first
      }
      
      // If still tied, use distance from habitat as tiebreaker
      const aDistance = Math.abs(a.x - habitat.position.x) + Math.abs(a.y - habitat.position.y);
      const bDistance = Math.abs(b.x - habitat.position.x) + Math.abs(b.y - habitat.position.y);
      
      return aDistance - bDistance; // Shorter distance first
    });
  }

  /**
   * Process egg production for biomes with improved habitats.
   * This function evaluates which biomes should create eggs based on ownership, habitat state,
   * and other ecological factors. The function is called during the next turn
   * and places new eggs (dormant animals) in appropriate locations.
   * 
   * @param state Current game state
   * @returns Updates to apply to the game state (new animals and updated biomes)
   */
  public static biomeEggProduction(state: GameState): Partial<BiomeProductionResult> {
    // Only produce eggs on even-numbered turns
    if (state.turn % 2 !== 0) {
      return state as Partial<BiomeProductionResult>; // Skip production on odd-numbered turns
    }

    const newAnimals = [...state.animals];
    const updatedBiomes = new Map(state.biomes);
    const updatedHabitats = [...state.habitats];
    
    // Process each habitat-biome pair
    updatedHabitats.forEach((habitat: Habitat) => {
      // Get the associated biome
      const biomeId = habitat.biomeId;
      const biome = updatedBiomes.get(biomeId);
      
      if (!biome) return;
      
      // Skip if no production
      if (biome.productionRate <= 0) return;
      
      // Skip if not improved - only improved habitats with owned biomes can produce eggs
      if (habitat.state !== HabitatState.IMPROVED) return;
      
      // Skip if biome not owned by a player
      if (biome.ownerId === null) return;

      // Calculate turns since last production
      const turnsSinceProduction = state.turn - biome.lastProductionTurn;
      if (turnsSinceProduction <= 0) return;

      // Calculate how many eggs to create
      const eggsToCreate = biome.productionRate * Math.floor(turnsSinceProduction / 2);
      
      // Skip if no eggs to create this turn
      if (eggsToCreate <= 0) return;

      // Find valid tiles for egg placement
      const validTiles = this.getValidEggPlacementTiles(habitat, {
        board: state.board!,
        animals: newAnimals
      });

      // Place eggs on valid tiles - use best tiles first (highest resource adjacency)
      for (let i = 0; i < Math.min(eggsToCreate, validTiles.length); i++) {
        // Take from the start of the array (highest resource adjacency first)
        const tile = validTiles[i];

        // Get appropriate species based on terrain
        const terrain = state.board!.tiles[tile.y][tile.x].terrain;
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
        
        newAnimals.push(newAnimal);
      }

      // Update biome's last production turn
      const updatedBiome: Biome = {
        ...biome,
        lastProductionTurn: state.turn
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
   * @returns True if a resource was successfully selected
   */
  public static selectResourceTile(x: number, y: number): boolean {
    // Check if there's a resource at this position
    const state = useGameStore.getState();
    const resource = state.resources.find(r => 
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
   * @returns True if harvesting was successful
   */
  public static harvestResource(resourceId: string, amount: number): boolean {
    // Validate amount
    if (amount < 0 || amount > 10) {
      console.error(`Invalid harvest amount: ${amount}, must be between 0-10`);
      return false;
    }

    // Find the resource in the state
    const state = useGameStore.getState();
    const resource = state.resources.find(r => r.id === resourceId);
    
    if (!resource) {
      console.error(`Resource ${resourceId} not found`);
      return false;
    }

    // TODO: Update the resource value
    console.log(`Harvesting ${amount} from resource ${resourceId}`);
    
    // Get the biome associated with this resource
    const biomeId = resource.biomeId;
    if (biomeId) {
      const biome = state.biomes.get(biomeId);
      if (biome) {
        // TODO: Update the biome's lushness based on the harvested resource
      }
    }
    
    // TODO: Add harvested resources to player's energy counter
    
    return true;
  }

  /**
   * Calculates the lushness value for a biome based on its resources.
   * 
   * @param biomeId ID of the biome to calculate lushness for
   * @returns Lushness value (0-10 scale)
   */
  public static calculateBiomeLushness(biomeId: string): number {
    const state = useGameStore.getState();
    const biome = state.biomes.get(biomeId);
    
    if (!biome) {
      console.warn(`Biome ${biomeId} not found`);
      return 0;
    }
    
    // TODO: Calculate lushness based on resource count and values
    const defaultLushness = 8.0; // Default "stable" value
    
    // TODO: Implement the polynomial resource generation formula
    
    return defaultLushness;
  }

  /**
   * Updates all biomes' lushness values based on their current resources.
   */
  public static updateAllBiomeLushness(): void {
    const state = useGameStore.getState();
    const updatedBiomes = new Map<string, Biome>();
    
    // Iterate through all biomes
    state.biomes.forEach((biome, biomeId) => {
      const lushness = this.calculateBiomeLushness(biomeId);
      const updatedBiome: Biome = {
        ...biome,
        lushness
      };
      updatedBiomes.set(biomeId, updatedBiome);
    });
    
    // TODO: Update biomes in the state
    console.log("Updating all biome lushness values");
  }

  /**
   * Regenerates resources in all biomes based on their lushness.
   * Higher lushness = faster regeneration.
   */
  public static regenerateAllResources(): void {
    const state = useGameStore.getState();
    const biomes = state.biomes;
    
    // TODO: Iterate through biomes and regenerate resources based on lushness
    console.log("Regenerating resources based on biome lushness");
  }
} 