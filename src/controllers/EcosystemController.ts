import { ResourceType, Coordinate, TerrainType, Habitat, Resource, GameConfig, AnimalState, Board, Animal, HabitatState } from "../store/gameStore";
import { useGameStore } from "../store/gameStore";

/**
 * Interface for egg placement validation
 */
interface ValidEggPlacementState {
  board: Board;
  animals: Animal[];
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
    
    // Get the habitat's owner and biome ID
    const habitatOwnerId = habitat.ownerId;
    const habitatTile = board.tiles[habitat.position.y][habitat.position.x];
    const habitatBiomeId = habitatTile.biomeId;
    
    if (!habitatBiomeId) {
      console.warn(`Habitat at ${habitat.position.x},${habitat.position.y} has no biome ID`);
      return validTiles; 
    }
    
    // Get all biomes owned by this player
    const playerBiomeIds = new Set<string>();
    playerBiomeIds.add(habitatBiomeId); // Always include current biome
    
    // Find all biomes owned by this player by checking habitats
    const habitats = useGameStore.getState().habitats;
    habitats.forEach(h => {
      if (h.ownerId === habitatOwnerId && h.ownerId !== null) {
        const biomeTile = board.tiles[h.position.y][h.position.x];
        if (biomeTile.biomeId) {
          playerBiomeIds.add(biomeTile.biomeId);
        }
      }
    });
    
    console.log(`Player ${habitatOwnerId} owns ${playerBiomeIds.size} biomes`);
    
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
          // Calculate adjacency score for prioritization (count adjacent resources)
          let adjacencyScore = 0;
          
          // Check all 8 adjacent positions for resources
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const adjX = x + dx;
              const adjY = y + dy;
              
              // Skip if out of bounds or the tile itself
              if (dx === 0 && dy === 0) continue;
              if (adjX < 0 || adjX >= board.width || adjY < 0 || adjY >= board.height) continue;
              
              const resourcePos = `${adjX},${adjY}`;
              
              // Check if there's a resource at this position
              if (resourcePositions.has(resourcePos)) {
                // Get the biome ID of this resource
                const resourceBiomeId = resourceBiomeMap.get(resourcePos);
                
                // Only count if the resource is in a biome owned by the player
                if (resourceBiomeId && playerBiomeIds.has(resourceBiomeId)) {
                  adjacencyScore += 1;
                }
              }
            }
          }
          
          // Store the score for later sorting
          resourceAdjacencyMap.set(`${x},${y}`, adjacencyScore);
          
          // Check if tile is adjacent to the habitat (for tie-breaking)
          const isAdjacentToHabitat = Math.abs(x - habitat.position.x) <= 1 && 
                                     Math.abs(y - habitat.position.y) <= 1;
          habitatProximityMap.set(`${x},${y}`, isAdjacentToHabitat);
          
          // Add to valid tiles
          validTiles.push({ x, y });
        }
      }
    }
    
    // Sort valid tiles by resource adjacency score (higher is better)
    // Use habitat proximity as a tie-breaker
    validTiles.sort((a, b) => {
      const scoreA = resourceAdjacencyMap.get(`${a.x},${a.y}`) || 0;
      const scoreB = resourceAdjacencyMap.get(`${b.x},${b.y}`) || 0;
      
      // First compare by resource adjacency
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      
      // If resource adjacency is equal, use habitat proximity as tie-breaker
      const isATouchingHabitat = habitatProximityMap.get(`${a.x},${a.y}`) || false;
      const isBTouchingHabitat = habitatProximityMap.get(`${b.x},${b.y}`) || false;
      
      // If A is touching habitat and B is not, A should come first
      if (isATouchingHabitat && !isBTouchingHabitat) return -1;
      // If B is touching habitat and A is not, B should come first
      if (!isATouchingHabitat && isBTouchingHabitat) return 1;
      // Otherwise, keep original order
      return 0;
    });
    
    return validTiles;
  }

  /**
   * Processes egg production for all biomes and habitats based on their lushness
   * and other ecological factors. The function is called during the next turn
   * and places new eggs (dormant animals) in appropriate locations.
   * 
   * @param state Current game state
   * @returns Updates to apply to the game state (new animals and updated habitats)
   */
  public static biomeEggProduction(state: any): Partial<any> {
    // Only produce eggs on even-numbered turns
    if (state.turn % 2 !== 0) {
      return state; // Skip production on odd-numbered turns
    }

    const newAnimals = [...state.animals];
    const updatedHabitats = state.habitats.map((habitat: Habitat) => {
      // Skip if no production
      if (habitat.productionRate <= 0) return habitat;
      
      // Skip if not improved - only improved habitats owned by a player can produce eggs
      if (habitat.state !== HabitatState.IMPROVED) return habitat;
      
      // Skip if not owned by a player
      if (habitat.ownerId === null) return habitat;

      // Calculate turns since last production
      const turnsSinceProduction = state.turn - habitat.lastProductionTurn;
      if (turnsSinceProduction <= 0) return habitat;

      // Calculate how many eggs to create
      const eggsToCreate = habitat.productionRate * Math.floor(turnsSinceProduction / 2);
      
      // Skip if no eggs to create this turn
      if (eggsToCreate <= 0) return habitat;

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

        // Create new egg
        const newAnimal = {
          id: `animal-${newAnimals.length}`,
          species,
          state: AnimalState.DORMANT,
          position: tile,
          previousPosition: null,
          hasMoved: false,
          ownerId: habitat.ownerId,
        };
        
        console.log(`Created new animal during production:`, { 
          id: newAnimal.id, 
          type: newAnimal.species, 
          terrain: terrain 
        });
        
        newAnimals.push(newAnimal);
      }

      // Update habitat's last production turn
      return {
        ...habitat,
        lastProductionTurn: state.turn
      };
    });

    return {
      animals: newAnimals,
      habitats: updatedHabitats
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

    // TODO: Find the resource, update its value, and handle depletion
    console.log(`Harvesting ${amount} from resource ${resourceId}`);
    
    // TODO: Update the biome's lushness based on the new resource state
    
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
    // TODO: Calculate lushness based on resource count and values
    const defaultLushness = 8.0; // Default "stable" value
    
    // TODO: Implement the polynomial resource generation formula
    
    return defaultLushness;
  }

  /**
   * Updates all biomes' lushness values based on their current resources.
   */
  public static updateAllBiomeLushness(): void {
    // TODO: Iterate through all biomes and update their lushness values
    console.log("Updating all biome lushness values");
  }

  /**
   * Regenerates resources in all biomes based on their lushness.
   * Higher lushness = faster regeneration.
   */
  public static regenerateAllResources(): void {
    // TODO: Implement resource regeneration based on lushness
    console.log("Regenerating resources based on biome lushness");
  }
} 