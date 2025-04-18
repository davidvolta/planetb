import { create } from "zustand";
import { generateIslandTerrain } from "../utils/TerrainGenerator";
import { calculateManhattanDistance } from "../utils/CoordinateUtils";
import { generateVoronoiBiomes } from "../utils/BiomeGenerator";
import { EcosystemController } from "../controllers/EcosystemController";

// Coordinate system for tiles
export interface Coordinate {
  x: number;
  y: number;
}

// Terrain types
export enum TerrainType {
  WATER = 'water',
  GRASS = 'grass',
  BEACH = 'beach',
  MOUNTAIN = 'mountain',
  UNDERWATER = 'underwater',
}

// Resource types
export enum ResourceType {
  FOREST = 'forest',
  KELP = 'kelp',
  INSECTS = 'insects',
  PLANKTON = 'plankton'
}

// Define the core interface for animal abilities
export interface AnimalAbilities {
  moveRange: number;
  compatibleTerrains: TerrainType[];
  // Extensible for future abilities
}

// Create the species registry with abilities for each animal type - THESE KEYS MUST MATCH SPRITE NAMES
export const SPECIES_REGISTRY: Record<string, AnimalAbilities> = {
  'buffalo': {
    moveRange: 1,
    compatibleTerrains: [TerrainType.GRASS, TerrainType.MOUNTAIN]
  },
  'bird': {
    moveRange: 4,
    compatibleTerrains: [TerrainType.MOUNTAIN, TerrainType.GRASS, TerrainType.BEACH, TerrainType.WATER, TerrainType.UNDERWATER]
  },
  'snake': {
    moveRange: 2,
    compatibleTerrains: [TerrainType.BEACH, TerrainType.GRASS]
  },
  'octopus': {
    moveRange: 3,
    compatibleTerrains: [TerrainType.UNDERWATER, TerrainType.WATER]
  },
  'turtle': {
    moveRange: 1,
    compatibleTerrains: [TerrainType.WATER, TerrainType.BEACH, TerrainType.UNDERWATER, TerrainType.GRASS]
  }
};

// Map terrain types to animal types - KEEP THIS FOR COMPATIBILITY WITH SPRITE SYSTEM
const TERRAIN_ANIMAL_MAP: Record<TerrainType, string> = {
  [TerrainType.GRASS]: 'buffalo',
  [TerrainType.MOUNTAIN]: 'bird',
  [TerrainType.WATER]: 'turtle',
  [TerrainType.UNDERWATER]: 'octopus',
  [TerrainType.BEACH]: 'snake',
};

// Default abilities for fallback
const DEFAULT_ABILITIES: AnimalAbilities = {
  moveRange: 1,
  compatibleTerrains: [TerrainType.GRASS]
};

// Helper functions to access species abilities
export function getSpeciesAbilities(species: string): AnimalAbilities {
  return SPECIES_REGISTRY[species] || DEFAULT_ABILITIES;
}

export function isTerrainCompatible(species: string, terrain: TerrainType): boolean {
  const abilities = getSpeciesAbilities(species);
  return abilities.compatibleTerrains.includes(terrain);
}

export function getSpeciesMoveRange(species: string): number {
  return getSpeciesAbilities(species).moveRange;
}

// Get all species compatible with a given terrain type
export function getCompatibleSpeciesForTerrain(terrain: TerrainType): string[] {
  return Object.entries(SPECIES_REGISTRY)
    .filter(([_, abilities]) => abilities.compatibleTerrains.includes(terrain))
    .map(([species, _]) => species);
}

// Function to randomly select a compatible species for a terrain
export function getRandomCompatibleSpecies(terrain: TerrainType): string {
  const compatibleSpecies = getCompatibleSpeciesForTerrain(terrain);
  if (compatibleSpecies.length === 0) {
    console.warn(`No compatible species found for terrain ${terrain}`);
    return 'snake'; // Default fallback
  }
  const randomIndex = Math.floor(Math.random() * compatibleSpecies.length);
  return compatibleSpecies[randomIndex];
}

// Order of terrain types for habitat placement
// Start with beaches, then move inward (grass, mountain), then outward (water, underwater)
export const HABITAT_TERRAIN_ORDER: TerrainType[] = [
  TerrainType.BEACH,    // Start with beaches as the foundation
  TerrainType.GRASS,    // Move inward to grass
  TerrainType.MOUNTAIN, // Continue inward to mountains
  TerrainType.WATER,    // Move outward to water
  TerrainType.UNDERWATER // Finally to underwater
];

// Only island map generation is available now
export enum MapGenerationType {
  ISLAND = 'island'
}

// Biome structure
export interface Biome {
  id: string;
  habitatId: string; // Each biome is associated with a habitat
  color: number; // Store a color for visualization
  lushness: number; // Lushness value from 0-10, where 8.0 is "stable"
  ownerId: number | null; // Player ID that owns this biome
  productionRate: number; // Number of eggs produced per turn
  lastProductionTurn: number; // Track when we last produced eggs
}

// Habitat structure
export interface Habitat {
  id: string;
  position: Coordinate;
}

// Tile structure
interface Tile {
  coordinate: Coordinate;
  terrain: TerrainType;
  explored: boolean;
  visible: boolean;
  biomeId: string | null; // Track which biome this tile belongs to
}

// Base animal structure
export interface Animal {
  id: string;
  species: string; // Renamed from 'type'
  state: AnimalState;
  position: Coordinate;
  previousPosition: Coordinate | null; // Track previous position for direction calculation
  hasMoved: boolean; // Flag to track if animal has moved this turn
  ownerId: number | null; // Player ID that owns this animal, null if unowned
}

// Board structure
export interface Board {
  width: number;
  height: number;
  tiles: Tile[][];
}

interface Player {
  id: number;
  name: string;
  color: string;
  isActive: boolean;
}

// Animal states
export enum AnimalState {
  DORMANT = 'dormant',
  ACTIVE = 'active',
}

// Movement-related interfaces
export interface ValidMove {
  x: number;
  y: number;
}

// Resource structure
export interface Resource {
  id: string;
  type: ResourceType;
  position: Coordinate;
  biomeId: string | null; // Add biome ID to track which biome each resource belongs to
}

// Game configuration and settings
export const GameConfig = {
  resourceGenerationPercentage: 0.5, // 50% chance fixed value
};

// Game state interface
export interface GameState {
  turn: number;
  players: Player[];
  currentPlayerId: number;
  board: Board | null;
  animals: Animal[];
  habitats: Habitat[];
  resources: Resource[]; // Added resources array
  biomes: Map<string, Biome>; // Track biomes by ID
  isInitialized: boolean;  // Flag to track if the game has been initialized
  
  // Movement state
  selectedUnitId: string | null;
  validMoves: ValidMove[];
  moveMode: boolean;
  selectedUnitIsDormant: boolean; // Flag to track if the selected unit is dormant
  
  // Selection state
  selectedHabitatId: string | null; // ID of the currently selected habitat
  selectedBiomeId: string | null; // ID of the currently selected biome
  
  // Displacement tracking (for animation and UI feedback)
  displacementEvent: {
    occurred: boolean;         // Whether displacement has occurred in the current action
    unitId: string | null;     // ID of the displaced unit
    fromX: number | null;      // Original X position
    fromY: number | null;      // Original Y position
    toX: number | null;        // New X position
    toY: number | null;        // New Y position
    timestamp: number | null;  // When the displacement occurred
  };
  
  // Spawn event tracking
  spawnEvent: {
    occurred: boolean;        // Whether a unit was just spawned
    unitId: string | null;    // ID of the unit that was spawned
    timestamp: number | null; // When the spawn occurred
  };
  
  // Biome capture event tracking
  biomeCaptureEvent: {
    occurred: boolean;        // Whether a biome was just captured
    biomeId: string | null;   // ID of the biome that was captured
    timestamp: number | null; // When the capture occurred
  };
  
  nextTurn: () => void;
  resetMovementFlags: () => void; // Reset hasMoved flags for all animals
  addPlayer: (name: string, color: string) => void;
  setActivePlayer: (playerId: number) => void;
  initializeBoard: (width: number, height: number, mapType?: MapGenerationType, forceHabitatGeneration?: boolean) => void;
  getTile: (x: number, y: number) => Tile | undefined;
  
  evolveAnimal: (id: string) => void;
  
  // Movement-related methods
  selectUnit: (id: string | null) => void;
  moveUnit: (id: string, x: number, y: number) => void;
  getValidMoves: (id: string) => ValidMove[];
  
  // Habitat-related methods
  getHabitatAt: (x: number, y: number) => Habitat | undefined;
  selectHabitat: (id: string | null) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  turn: 1,
  players: [],
  currentPlayerId: 0,
  board: null,
  animals: [],
  habitats: [],
  resources: [],
  biomes: new Map(),
  isInitialized: false,
  
  // Initialize movement state
  selectedUnitId: null,
  validMoves: [],
  moveMode: false,
  selectedUnitIsDormant: false,
  
  // Initialize selection state
  selectedHabitatId: null,
  selectedBiomeId: null,
  
  // Initialize displacement event with default values
  displacementEvent: {
    occurred: false,
    unitId: null,
    fromX: null,
    fromY: null,
    toX: null,
    toY: null,
    timestamp: null
  } as GameState['displacementEvent'], // Force type alignment

  // Initialize spawn event with default values
  spawnEvent: {
    occurred: false,
    unitId: null,
    timestamp: null
  } as GameState['spawnEvent'], // Force type alignment
  
  // Initialize biome capture event with default values
  biomeCaptureEvent: {
    occurred: false,
    biomeId: null,
    timestamp: null
  } as GameState['biomeCaptureEvent'], // Force type alignment

  nextTurn: () => set((state) => {
    // Process habitat production
    const updatedState = EcosystemController.biomeEggProduction(state);
    
    // Reset the hasMoved flags for all animals but preserve previousPosition
    const resetAnimals = updatedState.animals?.map((animal: Animal) => ({
      ...animal,
      hasMoved: false
      // previousPosition is preserved here
    })) || state.animals?.map((animal: Animal) => ({
      ...animal,
      hasMoved: false
      // previousPosition is preserved here
    }));
    
    // Reset displacement event
    const resetDisplacementEvent = {
      occurred: false,
      unitId: null,
      fromX: null,
      fromY: null,
      toX: null,
      toY: null,
      timestamp: null
    } as GameState['displacementEvent']; // Force type alignment
    
    // Reset spawn event
    const resetSpawnEvent = {
      occurred: false,
      unitId: null,
      timestamp: null
    } as GameState['spawnEvent']; // Force type alignment
    
    // Reset biome capture event
    console.log(`[gameStore] Resetting biome capture event during nextTurn`);
    const resetBiomeCaptureEvent = {
      occurred: false,
      biomeId: null,
      timestamp: null
    } as GameState['biomeCaptureEvent']; // Force type alignment
    
    return { 
      ...updatedState,
      animals: resetAnimals,
      turn: state.turn + 1,
      displacementEvent: resetDisplacementEvent,
      spawnEvent: resetSpawnEvent,
      biomeCaptureEvent: resetBiomeCaptureEvent
    };
  }),

  addPlayer: (name: string, color: string) => 
    set((state) => {
      const newPlayer: Player = {
        id: state.players.length,
        name,
        color,
        isActive: state.players.length === 0, // First player starts active
      };
      return { players: [...state.players, newPlayer] };
    }),

  setActivePlayer: (playerId: number) =>
    set((state) => {
      const updatedPlayers = state.players.map(player => ({
        ...player,
        isActive: player.id === playerId
      }));
      return { players: updatedPlayers, currentPlayerId: playerId };
    }),

  initializeBoard: (width, height, mapType = MapGenerationType.ISLAND, forceHabitatGeneration = false) =>
    set((state) => {
      // Check if we need to create a player (no players exist)
      let playerId = state.currentPlayerId;
      if (state.players.length === 0) {
        // Create default player using the existing addPlayer function
        // We need to create the player directly here since we can't call 
        // the addPlayer function from within the set callback
        const newPlayer: Player = {
          id: 0,
          name: "Player 1",
          color: "#3498db", // Default blue color
          isActive: true,
        };
        playerId = newPlayer.id;
        state = {
          ...state,
          players: [newPlayer],
          currentPlayerId: playerId
        };
      }

      const terrainData = generateIslandTerrain(width, height);
      const tiles: Tile[][] = [];
      const animals: Animal[] = [];

      // Create tiles
      for (let y = 0; y < height; y++) {
        const row: Tile[] = [];
        for (let x = 0; x < width; x++) {
          row.push({
            coordinate: { x, y },
            terrain: terrainData[y][x],
            explored: false, // Start with all tiles explored for now
            visible: true,  // Start with all tiles visible for now
            biomeId: null   // Will be set after biome generation
          });
        }
        tiles.push(row);
      }

      // Generate initial habitats if this is first initialization or if forced
      let habitats: Habitat[] = [];
      if (!state.isInitialized || forceHabitatGeneration) {
        // Create a map to track which terrain types we've placed habitats on
        const terrainTypesWithHabitats = new Set<TerrainType>();
        
        // Create an array of all terrain types to ensure we place exactly one habitat per type
        const allTerrainTypes = Object.values(TerrainType);
        
        // For each terrain type, find a suitable location and place a habitat
        allTerrainTypes.forEach(terrainType => {
          // Collect all tiles of this terrain type
          const tilesOfType: {x: number, y: number}[] = [];
          
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              // Skip tiles on the edges of the board
              if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                continue;
              }
              
              if (terrainData[y][x] === terrainType) {
                tilesOfType.push({ x, y });
              }
            }
          }
          
          // If we have tiles of this type, try to place a habitat without zone overlap
          if (tilesOfType.length > 0) {
            // Shuffle the tiles to try them in random order
            const shuffledTiles = [...tilesOfType].sort(() => Math.random() - 0.5);
            
            // Try to find a position that doesn't overlap with existing habitat zones
            let position: { x: number, y: number } | null = null;
            
            for (const tile of shuffledTiles) {
              if (!isBiomeOverlapping(tile, habitats)) {
                position = tile;
                break;
              }
            }
            
            // If we couldn't find a non-overlapping position, fall back to random selection
            if (!position) {
              console.log(`Could not find non-overlapping position for ${terrainType} habitat, using random placement`);
              const randomIndex = Math.floor(Math.random() * tilesOfType.length);
              position = tilesOfType[randomIndex];
            }
            
            // Use sequential habitat indexing instead of terrain type count
            const habitatId = habitats.length;
            
            // Check if this is a beach habitat and if we're in initial board setup
            const isBeachHabitat = terrainType === TerrainType.BEACH;
            const shouldImproveForPlayer = isBeachHabitat && !state.isInitialized && state.players.length > 0;
            
            // Generate a consistent ID for both the habitat and its biome
            const newId = `habitat-${habitats.length}`;
            
            const newHabitat: Habitat = {
              id: newId,
              position: position,
            };
            
            habitats.push(newHabitat);
            terrainTypesWithHabitats.add(terrainType);
          }
        });
        
        // Verify we've placed exactly one habitat per available terrain type
        console.log(`Initialized ${habitats.length} habitats on ${terrainTypesWithHabitats.size} terrain types`);
        
        // Now place additional habitats with non-overlapping zones
        console.log('Placing additional habitats with non-overlapping zones...');
        
        // Use HABITAT_TERRAIN_ORDER for prioritized placement
        let placedAdditionalHabitats = true;
        let additionalHabitatsCount = 0;
        let iterationCount = 0;
        const MAX_ITERATIONS = 100; // Safety limit to prevent infinite loops
        
        // Continue placing habitats until we can't place any more
        while (placedAdditionalHabitats && iterationCount < MAX_ITERATIONS) {
          placedAdditionalHabitats = false;
          iterationCount++;
          
          // Try each terrain type in priority order
          for (const terrainType of HABITAT_TERRAIN_ORDER) {
            // Collect all tiles of this terrain type that aren't already used for habitats
            const availableTiles: {x: number, y: number}[] = [];
            
            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                // Skip tiles on the edges of the board
                if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                  continue;
                }
                
                if (terrainData[y][x] === terrainType) {
                  // Check if this position already has a habitat
                  const alreadyHasHabitat = habitats.some(h => 
                    h.position.x === x && h.position.y === y
                  );
                  
                  if (!alreadyHasHabitat) {
                    availableTiles.push({ x, y });
                  }
                }
              }
            }
            
            // Shuffle the available tiles
            const shuffledTiles = [...availableTiles].sort(() => Math.random() - 0.5);
            
            // Try to find a position that doesn't overlap with existing habitat zones
            for (const tile of shuffledTiles) {
              if (!isBiomeOverlapping(tile, habitats)) {
                // We found a valid position, create a habitat here
                const newId = `habitat-${habitats.length}`;
                
                const newHabitat: Habitat = {
                  id: newId,
                  position: tile,
                };
                
                habitats.push(newHabitat);
                additionalHabitatsCount++;
                placedAdditionalHabitats = true;
                
                // Place one additional habitat per terrain type per iteration
                // to ensure even distribution across terrain types
                break;
              }
            }
          }
        }
        
        console.log(`Placed ${additionalHabitatsCount} additional habitats`);
        console.log(`Total habitats: ${habitats.length}`);
        console.log(`Placement completed in ${iterationCount} iterations`);
        
        // Log habitat distribution by terrain type
        const habitatsByTerrain = new Map<TerrainType, number>();
        for (const terrain of Object.values(TerrainType)) {
          habitatsByTerrain.set(terrain, 0);
        }
        
        habitats.forEach(habitat => {
          const position = habitat.position;
          const terrain = terrainData[position.y][position.x];
          const count = habitatsByTerrain.get(terrain) || 0;
          habitatsByTerrain.set(terrain, count + 1);
        });
        
        console.log('Habitat distribution by terrain type:');
        habitatsByTerrain.forEach((count, terrain) => {
          console.log(`  ${terrain}: ${count} habitats`);
        });
        
        // Generate biomes immediately after creating habitats
        // Move biome generation code here - BEFORE egg placement
        // Generate new biomes
        const biomeResult = generateVoronoiBiomes(width, height, habitats, terrainData);
        let biomeMap = biomeResult.biomeMap;
        
        // Create biomes map based on the results
        let biomes = new Map<string, Biome>();
        
        // For each habitat, create a biome
        let playerBeachBiomeAssigned = false; // Track if we've already assigned a beach biome to player
        
        habitats.forEach(habitat => {
          const biomeId = habitat.id;
          const color = biomeResult.biomeColors.get(biomeId) || 0x000000; // Default to black if no color
          
          // Check if this is the initial player's habitat (beach habitat during initial setup)
          const isBeachHabitat = terrainData[habitat.position.y][habitat.position.x] === TerrainType.BEACH;
          // Only set first beach habitat to the player during initial setup
          const isInitialPlayerHabitat = isBeachHabitat && !state.isInitialized && !playerBeachBiomeAssigned;
          
          if (isInitialPlayerHabitat) {
            playerBeachBiomeAssigned = true;
            console.log(`Assigned beach biome ${biomeId} to player ${playerId}`);
          }
          
          biomes.set(biomeId, {
            id: biomeId,
            habitatId: habitat.id,
            color,
            lushness: 8.0, // Initialize lushness to the "stable" value
            // Set ownership for the player's starting beach biome
            ownerId: isInitialPlayerHabitat ? playerId : null,
            productionRate: 1, // Fixed at 1 for now
            lastProductionTurn: 0
          });
        });
        
        // Update tiles with biome IDs
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            tiles[y][x].biomeId = biomeMap[y][x];
          }
        }
        
        // Now place eggs after biomes are generated
        // Place initial eggs around the habitat, but ONLY for the player's improved beach habitat
        habitats.forEach(habitat => {
          // Get the associated biome
          const biome = biomes.get(habitat.id);
          if (!biome) return;
          
          // Only place eggs for biomes with owners
          if (biome.productionRate > 0 && biome.ownerId !== null) {
            
            // For the initial player unit, use adjacent tiles only
            // This ensures the player's starting unit is close to their habitat
            const adjacentTiles: Coordinate[] = [];
            
            // Check all 8 adjacent tiles
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const x = habitat.position.x + dx;
                const y = habitat.position.y + dy;
                
                // Skip the habitat's own position
                if (dx === 0 && dy === 0) continue;
                
                // Skip if out of bounds
                if (x < 0 || x >= width || y < 0 || y >= height) continue;
                
                // Check if tile already has an egg
                const hasEgg = animals.some(animal => 
                  animal.state === AnimalState.DORMANT &&
                  animal.position.x === x &&
                  animal.position.y === y
                );
                
                // For beach-based biomes, prefer beach tiles
                if (terrainData[habitat.position.y][habitat.position.x] === TerrainType.BEACH &&
                    biome.ownerId === playerId) {
                  // Prefer beach tiles for player's starting unit
                  if (terrainData[y][x] === TerrainType.BEACH && !hasEgg) {
                    adjacentTiles.push({ x, y });
                  }
                } else if (!hasEgg) {
                  // For other habitats, add any valid tile
                  adjacentTiles.push({ x, y });
                }
              }
            }
            
            console.log(`Found ${adjacentTiles.length} valid adjacent tiles for initial player unit`);
            
            // Place eggs based on production rate
            for (let i = 0; i < Math.min(biome.productionRate, adjacentTiles.length); i++) {
              const randomTileIndex = Math.floor(Math.random() * adjacentTiles.length);
              const tile = adjacentTiles[randomTileIndex];
              adjacentTiles.splice(randomTileIndex, 1);

              // Create new egg
              const newAnimal = {
                id: `animal-${animals.length}`,
                // For beach biomes owned by player, use turtle
                species: (terrainData[habitat.position.y][habitat.position.x] === TerrainType.BEACH && 
                        biome.ownerId === playerId) ? 
                       'turtle' : TERRAIN_ANIMAL_MAP[terrainData[tile.y][tile.x]],
                state: AnimalState.DORMANT,
                position: tile,
                previousPosition: null,
                hasMoved: false,
                ownerId: null,
              };
              console.log(`Created new animal during init:`, { 
                id: newAnimal.id, 
                type: newAnimal.species, 
                terrain: terrainData[tile.y][tile.x] 
              });
              
              // If this biome is owned by a player, make the animal active and owned
              if (biome.ownerId !== null) {
                // Make this the active player unit
                newAnimal.state = AnimalState.ACTIVE;
                // Type assertion to handle the number assignment to the ownerId property
                (newAnimal as Animal).ownerId = biome.ownerId;
                console.log(`Set animal ${newAnimal.id} as active player unit for player ${newAnimal.ownerId}`);
              }
              
              animals.push(newAnimal);
            }
          }
        });
        
        return { 
          board: { width, height, tiles },
          isInitialized: true,
          habitats: habitats,
          animals: animals,
          resources: [], // Start with empty resources array
          biomes: biomes
        };
      }
      
      // If we're not initializing or regenerating, return unchanged state
      return state;
    }),

  getTile: (x, y) => {
    const board = get().board;
    if (!board) return undefined;
    if (x < 0 || x >= board.width || y < 0 || y >= board.height) return undefined;
    return board.tiles[y][x];
  },

  evolveAnimal: (id) =>
    set((state) => {
      // Find the egg to evolve
      const egg = state.animals.find(a => a.id === id && a.state === AnimalState.DORMANT);
      if (!egg) {
        console.warn(`Cannot evolve animal ${id}: not found or not an egg`);
        return state;
      }
      
      // Get the position of the egg
      const eggPosition = egg.position;
      
      // Check if there is an active unit at this position (that's not the egg itself)
      const activeUnitAtPosition = state.animals.find(a => 
        a.id !== id && 
        a.position.x === eggPosition.x && 
        a.position.y === eggPosition.y &&
        a.state === AnimalState.ACTIVE
      );
      
      // Make a copy of the animals array to update
      let updatedAnimals = [...state.animals];
      
      // Initialize displacement event with default values
      let displacementEvent = {
        occurred: false,
        unitId: null,
        fromX: null,
        fromY: null,
        toX: null,
        toY: null,
        timestamp: null
      } as GameState['displacementEvent']; // Force type alignment
      
      // Handle displacement if there's an active unit at the egg's position
      if (activeUnitAtPosition) {
        console.log(`Need to displace active unit ${activeUnitAtPosition.id} from position ${eggPosition.x},${eggPosition.y}`);
        
        // Find valid displacement tiles
        const validDisplacementTiles = getValidDisplacementTiles(
          eggPosition, 
          updatedAnimals,
          state.board
        );
        
        if (validDisplacementTiles.length > 0) {
          let displacementPosition;
          
          if (activeUnitAtPosition.hasMoved) {
            // If unit has already moved, try to continue in that direction
            const previousDirection = determinePreviousDirection(activeUnitAtPosition);
            displacementPosition = findContinuationTile(
              activeUnitAtPosition,
              validDisplacementTiles,
              previousDirection
            );
            
            // If we couldn't find a continuation tile, fall back to a random tile
            if (!displacementPosition) {
              const randomIndex = Math.floor(Math.random() * validDisplacementTiles.length);
              displacementPosition = validDisplacementTiles[randomIndex];
            }
          } else {
            // If unit hasn't moved, choose a random adjacent tile
            const randomIndex = Math.floor(Math.random() * validDisplacementTiles.length);
            displacementPosition = validDisplacementTiles[randomIndex];
          }
          
          // Update displacement event information
          displacementEvent = {
            occurred: true,
            unitId: activeUnitAtPosition.id,
            fromX: eggPosition.x,
            fromY: eggPosition.y,
            toX: displacementPosition.x,
            toY: displacementPosition.y,
            timestamp: Date.now()
          } as GameState['displacementEvent'];
          
          console.log(`Displaced unit ${activeUnitAtPosition.id} to ${displacementPosition.x},${displacementPosition.y}`);
        } else {
          console.warn(`No valid displacement tiles found for unit ${activeUnitAtPosition.id}`);
        }
      }
      
      // Evolve the egg to an active unit
      updatedAnimals = updatedAnimals.map(animal =>
        animal.id === id
          ? { ...animal, state: AnimalState.ACTIVE, hasMoved: true }
          : animal
      );
      
      const evolvedAnimal = updatedAnimals.find(a => a.id === id);
      console.log(`Evolving animal:`, { 
        id, 
        type: evolvedAnimal?.species, 
        newState: AnimalState.ACTIVE 
      });
      
      return { 
        animals: updatedAnimals,
        displacementEvent
      };
    }),

  getHabitatAt: (x: number, y: number) => {
    const habitats = get().habitats;
    if (!habitats) return undefined;
    return habitats.find(habitat =>
      habitat.position.x === x && habitat.position.y === y
    );
  },

  // Habitat selection method
  selectHabitat: (id: string | null) => 
    set((state) => {
      console.log(`[gameStore] selectHabitat called with habitat ID: ${id}`);
      if (!id) {
        // Deselecting a habitat
        console.log(`[gameStore] Deselecting habitat and biome`);
        return { 
          selectedHabitatId: null,
          selectedBiomeId: null
        };
      }
      
      // Find the habitat by ID
      const habitat = state.habitats.find(h => h.id === id);
      if (!habitat) {
        console.warn(`[gameStore] Cannot select habitat ${id}: not found`);
        return {
          selectedHabitatId: null,
          selectedBiomeId: null
        };
      }
      
      console.log(`[gameStore] Selected habitat ${id} at (${habitat.position.x}, ${habitat.position.y})`);
      console.log(`[gameStore] Associated biome ID: ${habitat.id}`);
      
      return {
        selectedHabitatId: id,
        selectedBiomeId: habitat.id // Using habitat.id as the biome ID
      };
    }),

  // Movement-related methods
  selectUnit: (id: string | null) => 
    set((state) => {
      if (!id) {
        // Deselecting a unit
        return { 
          selectedUnitId: null, 
          validMoves: [], 
          moveMode: false,
          selectedUnitIsDormant: true
        };
      }
      
      // Check if the unit has already moved this turn
      const unit = state.animals.find(a => a.id === id);
      if (unit && unit.hasMoved) {
        console.log(`Cannot select unit ${id} for movement - it has already moved this turn`);
        // We don't prevent selection entirely, but we don't enter move mode
        return {
          selectedUnitId: id,
          validMoves: [],
          moveMode: false,
          selectedUnitIsDormant: unit.state === AnimalState.DORMANT
        };
      }
      
      // Select the unit and calculate valid moves
      const validMoves = calculateValidMoves(id, state);
      
      return {
        selectedUnitId: id,
        validMoves,
        moveMode: true,
        selectedUnitIsDormant: unit?.state === AnimalState.DORMANT
      };
    }),
    
  moveUnit: (id: string, x: number, y: number) =>
    set((state) => {
      // Verify this is a valid move
      const isValidMove = state.validMoves.some(move => move.x === x && move.y === y);
      
      if (!isValidMove) {
        console.warn(`Invalid move to ${x},${y} for unit ${id}`);
        return state;
      }
      
      // Check if there's already an active unit at the destination
      const activeUnitAtDestination = state.animals.find(animal =>
        animal.position.x === x &&
        animal.position.y === y &&
        animal.state === AnimalState.ACTIVE &&
        animal.id !== id
      );
      
      let updatedAnimals = state.animals.map(animal => 
        animal.id === id 
          ? { 
              ...animal, 
              previousPosition: { ...animal.position }, // Save current position as previous
              position: { x, y },                      // Update to new position
              hasMoved: true 
            } 
          : animal
      );
      
      // If there's an active unit at the destination, handle displacement
      if (activeUnitAtDestination) {
        console.log(`Found active unit ${activeUnitAtDestination.id} at destination (${x},${y}), will handle displacement`);
        updatedAnimals = handleDisplacement(x, y, activeUnitAtDestination, updatedAnimals);
      }
      
      console.log(`Unit ${id} moved to (${x},${y}) and marked as moved for this turn`);
      
      // Clear movement state after move
      return {
        animals: updatedAnimals,
        selectedUnitId: null,
        validMoves: [],
        moveMode: false,
        selectedUnitIsDormant: true
      };
    }),
    
  getValidMoves: (id: string) => {
    const state = get();
    return calculateValidMoves(id, state);
  },

  resetMovementFlags: () => set((state) => {
    const updatedAnimals = state.animals.map(animal => ({
      ...animal,
      hasMoved: false
    }));
    return { animals: updatedAnimals };
  }),
}));

/**
 * Checks if a potential habitat position would result in overlapping biomes with existing habitats
 * A biome zone consists of the habitat and its surrounding territory
 * Zones overlap if habitats are less than Manhattan distance 5 apart
 * 
 * @param position The potential position to check
 * @param existingHabitats Array of existing habitats to check against
 * @returns true if the position would overlap with any existing biome zone, false otherwise
 */
export function isBiomeOverlapping(
  position: Coordinate,
  existingHabitats: Habitat[]
): boolean {
  // For each existing habitat, calculate Manhattan distance
  for (const habitat of existingHabitats) {
    const distance = calculateManhattanDistance(
      position.x, position.y,
      habitat.position.x, habitat.position.y
    );
    
    // If distance is less than 5, zones will overlap
    if (distance < 5) {
      return true;
    }
  }
  
  // No overlaps found
  return false;
}

// Helper function to find valid adjacent tiles for displacement
const getValidDisplacementTiles = (
  position: Coordinate,
  animals: Animal[],
  board: Board | null
): Coordinate[] => {
  if (!board) return [];
  
  const { x, y } = position;
  const validTiles: Coordinate[] = [];
  
  // Check all 8 adjacent tiles
  const directions = [
    [0, -1], // north
    [1, -1], // northeast
    [1, 0],  // east
    [1, 1],  // southeast
    [0, 1],  // south
    [-1, 1], // southwest
    [-1, 0], // west
    [-1, -1] // northwest
  ];
  
  for (const [dx, dy] of directions) {
    const newX = x + dx;
    const newY = y + dy;
    
    // Skip if out of bounds
    if (newX < 0 || newX >= board.width || newY < 0 || newY >= board.height) {
      continue;
    }
    
    // Check if there's an active unit at this position
    const hasActiveUnit = animals.some(a => 
      a.position.x === newX && 
      a.position.y === newY && 
      a.state === AnimalState.ACTIVE
    );
    
    // Only add to valid tiles if no active unit is present
    if (!hasActiveUnit) {
      validTiles.push({ x: newX, y: newY });
    }
  }
  
  return validTiles;
};

/**
 * Determine the previous movement direction for an animal
 * @param animal The animal to determine direction for
 * @returns Direction vector {dx, dy} or null if no previous position exists
 */
export function determinePreviousDirection(animal: Animal): { dx: number, dy: number } | null {
  // If animal has no previous position, we can't determine direction
  if (!animal.previousPosition) {
    return null;
  }
  
  // Calculate the direction vector
  const dx = animal.position.x - animal.previousPosition.x;
  const dy = animal.position.y - animal.previousPosition.y;
  
  // If there was no movement, return null
  if (dx === 0 && dy === 0) {
    return null;
  }
  
  // Return normalized direction vector
  // For diagonal movement, we preserve both x and y components
  return { 
    dx: Math.sign(dx), 
    dy: Math.sign(dy) 
  };
}

// Helper function to pick a random tile from validTiles
const randomTile = (validTiles: Coordinate[]): Coordinate | null => {
  if (validTiles.length === 0) {
    return null;
  }
  
  const randomIndex = Math.floor(Math.random() * validTiles.length);
  return validTiles[randomIndex];
};

// Helper function to find a continuation tile based on previous direction
const findContinuationTile = (
  animal: Animal,
  validTiles: Coordinate[],
  previousDirection: { dx: number, dy: number } | null
): Coordinate | null => {
  if (!previousDirection || validTiles.length === 0) {
    // If no previous direction or no valid tiles, we can't find a continuation
    return randomTile(validTiles);
  }
  
  const { dx, dy } = previousDirection;
  
  // Priority 1: Continue in the same direction if possible
  const sameDirectionX = animal.position.x + dx;
  const sameDirectionY = animal.position.y + dy;
  
  const sameDirTile = validTiles.find(
    tile => tile.x === sameDirectionX && tile.y === sameDirectionY
  );
  
  if (sameDirTile) {
    console.log(`Found continuation tile in same direction: (${sameDirTile.x},${sameDirTile.y})`);
    return sameDirTile;
  }
  
  // Priority 2: Try alternative directions based on previous movement
  // Try to preserve at least one component of the movement direction
  const alternativeOptions = [];
  
  // If moving diagonally, try the cardinal directions that make up the diagonal
  if (dx !== 0 && dy !== 0) {
    // Try horizontal component
    alternativeOptions.push({ x: animal.position.x + dx, y: animal.position.y });
    // Try vertical component
    alternativeOptions.push({ x: animal.position.x, y: animal.position.y + dy });
  } 
  // If moving horizontally, try diagonal up and down
  else if (dx !== 0 && dy === 0) {
    alternativeOptions.push({ x: animal.position.x + dx, y: animal.position.y + 1 });
    alternativeOptions.push({ x: animal.position.x + dx, y: animal.position.y - 1 });
  }
  // If moving vertically, try diagonal left and right
  else if (dx === 0 && dy !== 0) {
    alternativeOptions.push({ x: animal.position.x + 1, y: animal.position.y + dy });
    alternativeOptions.push({ x: animal.position.x - 1, y: animal.position.y + dy });
  }
  
  // Find the first valid alternative option
  for (const option of alternativeOptions) {
    const validOption = validTiles.find(
      tile => tile.x === option.x && tile.y === option.y
    );
    
    if (validOption) {
      console.log(`Found alternative continuation tile: (${validOption.x},${validOption.y})`);
      return validOption;
    }
  }
  
  // Priority 3: If all else fails, pick a random valid tile
  console.log("No continuation tile found, selecting random valid tile");
  return randomTile(validTiles);
};

// Helper function to calculate valid moves for a unit
const calculateValidMoves = (unitId: string, state: GameState): ValidMove[] => {
  const board = state.board;
  if (!board) return [];
  
  const unit = state.animals.find(a => a.id === unitId);
  if (!unit || unit.state === AnimalState.DORMANT) return [];
  
  // If the unit has already moved this turn, it cannot move again
  if (unit.hasMoved) {
    console.log(`Unit ${unitId} has already moved this turn and cannot move again`);
    return [];
  }
  
  // Start position
  const startX = unit.position.x;
  const startY = unit.position.y;
  
  // Use a breadth-first search to find all valid moves
  const validMoves: ValidMove[] = [];
  const visited = new Set<string>();
  const queue: [number, number, number][] = [[startX, startY, 0]]; // [x, y, distance]
  
  // Add starting position to visited set
  visited.add(`${startX},${startY}`);
  
  // Get movement range based on species abilities
  const maxDistance = getSpeciesMoveRange(unit.species);
  
  while (queue.length > 0) {
    const [x, y, distance] = queue.shift()!;
    
    // Don't count the starting position as a valid move
    if (distance > 0) {
      validMoves.push({ x, y });
    }
    
    // If we've reached max distance, don't explore further
    if (distance >= maxDistance) continue;
    
    // Check all 8 adjacent tiles
    const directions = [
      [0, -1], // north
      [1, -1], // northeast
      [1, 0],  // east
      [1, 1],  // southeast
      [0, 1],  // south
      [-1, 1], // southwest
      [-1, 0], // west
      [-1, -1] // northwest
    ];
    
    for (const [dx, dy] of directions) {
      const newX = x + dx;
      const newY = y + dy;
      const key = `${newX},${newY}`;
      
      // Skip if already visited or out of bounds
      if (visited.has(key) || newX < 0 || newX >= board.width || newY < 0 || newY >= board.height) {
        continue;
      }
      
      // Check terrain compatibility
      const terrain = board.tiles[newY][newX].terrain;
      if (!isTerrainCompatible(unit.species, terrain)) {
        continue; // Skip incompatible terrain
      }
      
      // Check if the tile has a non-dormant unit (can't move to tiles with active units)
      const hasActiveUnit = state.animals.some(a => 
        a.position.x === newX && 
        a.position.y === newY && 
        a.state === AnimalState.ACTIVE &&
        a.id !== unitId
      );
      
      if (hasActiveUnit) continue;
      
      // Mark as visited and add to queue
      visited.add(key);
      queue.push([newX, newY, distance + 1]);
    }
  }
  
  return validMoves;
};

// Helper function to handle displacement when an active unit tries to move to an occupied position
const handleDisplacement = (
  x: number,
  y: number,
  activeUnitAtPosition: Animal,
  updatedAnimals: Animal[]
): Animal[] => {
  console.log(`Handling displacement for active unit at (${x},${y})`);
  
  // Find all vacant tiles that are valid for displacement
  const board = useGameStore.getState().board;
  if (!board) {
    console.error("Board is null, cannot handle displacement");
    return updatedAnimals;
  }
  
  // Get neighboring tiles that are valid for displacement
  const neighborPositions = [
    { x: x - 1, y: y - 1 }, // NW
    { x: x, y: y - 1 },     // N
    { x: x + 1, y: y - 1 }, // NE
    { x: x - 1, y: y },     // W
    { x: x + 1, y: y },     // E
    { x: x - 1, y: y + 1 }, // SW
    { x: x, y: y + 1 },     // S
    { x: x + 1, y: y + 1 }  // SE
  ];
  
  // Filter valid positions (on board, not occupied, and compatible terrain)
  const validDisplacementPositions = neighborPositions.filter(pos => {
    // Check if within board boundaries
    if (pos.x < 0 || pos.x >= board.width || pos.y < 0 || pos.y >= board.height) {
      return false;
    }
    
    // Get tile at position
    const tile = board.tiles[pos.y][pos.x];
    if (!tile) {
      return false;
    }
    
    // Check terrain compatibility for the species
    if (!isTerrainCompatible(activeUnitAtPosition.species, tile.terrain)) {
      return false;
    }
    
    // Check if position is not occupied by another animal
    const isOccupied = updatedAnimals.some(animal => 
      animal.position.x === pos.x && 
      animal.position.y === pos.y &&
      animal.state === AnimalState.ACTIVE
    );
    
    return !isOccupied;
  });
  
  console.log(`Found ${validDisplacementPositions.length} valid displacement positions`);
  
  // Set displacement position based on previous movement direction if possible
  let displacementPosition: Coordinate | null = null;
  
  if (activeUnitAtPosition.hasMoved) {
    // If unit has already moved, try to continue in that direction
    const previousDirection = determinePreviousDirection(activeUnitAtPosition);
    displacementPosition = findContinuationTile(
      activeUnitAtPosition,
      validDisplacementPositions,
      previousDirection
    );
  }
  
  // If no continuation tile found, pick a random valid displacement position
  if (!displacementPosition && validDisplacementPositions.length > 0) {
    const randomIndex = Math.floor(Math.random() * validDisplacementPositions.length);
    displacementPosition = validDisplacementPositions[randomIndex];
    console.log(`Using random displacement position: (${displacementPosition.x},${displacementPosition.y})`);
  }
  
  if (displacementPosition) {
    // Update the animal's position (displacement)
    const displacedAnimals = updatedAnimals.map(animal => 
      animal.id === activeUnitAtPosition.id 
        ? { 
            ...animal, 
            position: displacementPosition!,
            previousPosition: { ...animal.position } // Record the previous position before displacement
          } 
        : animal
    );
    
    // Record the displacement event for animation
    useGameStore.setState(state => ({
      ...state,
      displacementEvent: {
        occurred: true,
        unitId: activeUnitAtPosition.id,
        fromX: activeUnitAtPosition.position.x,
        fromY: activeUnitAtPosition.position.y,
        toX: displacementPosition.x,
        toY: displacementPosition.y,
        timestamp: Date.now()
      } as GameState['displacementEvent'] // Force type alignment
    }));
    
    console.log(`Displaced unit ${activeUnitAtPosition.id} to (${displacementPosition.x},${displacementPosition.y})`);
    return displacedAnimals;
  } else {
    console.warn("Could not find valid displacement position");
    return updatedAnimals;
  }
};
