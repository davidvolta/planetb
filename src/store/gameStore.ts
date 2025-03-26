import { create } from "zustand";
import { generateIslandTerrain } from "../utils/terrainGenerator";
import { getValidEggPlacementTiles } from '../utils/gridUtils';

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

// Map terrain types to animal types
const TERRAIN_ANIMAL_MAP: Record<TerrainType, string> = {
  [TerrainType.GRASS]: 'buffalo',
  [TerrainType.MOUNTAIN]: 'bird',
  [TerrainType.WATER]: 'fish',
  [TerrainType.UNDERWATER]: 'snake',
  [TerrainType.BEACH]: 'bunny', // Default to bunny for beach
};

// Movement range for each animal type
const MOVEMENT_RANGE_BY_TYPE: Record<string, number> = {
  'buffalo': 2,  // Buffalo are strong but slower
  'bird': 4,     // Birds have highest mobility
  'fish': 3,     // Fish are fast in water
  'snake': 2,    // Snakes are slower
  'bunny': 3     // Bunnies are quick
};

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

// Habitat state enum
export enum HabitatState {
  POTENTIAL = 'potential',
  SHELTER = 'shelter'
}

// Shelter types based on terrain
export enum ShelterType {
  TIDEPOOL = 'tidepool',  // beach
  NEST = 'nest',         // mountain
  DEN = 'den',           // grass  
  CAVE = 'cave',         // underwater
  REEF = 'reef'          // water
}

// Habitat structure
export interface Habitat {
  id: string;
  position: Coordinate;
  state: HabitatState;
  shelterType: ShelterType | null;
  ownerId: number | null;  // Player ID that owns this habitat
  productionRate: number;  // Number of eggs produced per turn
  lastProductionTurn: number; // Track when we last produced eggs
}

// Tile structure
interface Tile {
  coordinate: Coordinate;
  terrain: TerrainType;
  explored: boolean;
  visible: boolean;
}

// Base animal structure
export interface Animal {
  id: string;
  type: string;
  state: AnimalState;
  position: Coordinate;
  previousPosition: Coordinate | null; // Track previous position for direction calculation
  hasMoved: boolean; // Flag to track if animal has moved this turn
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

// Game state interface
export interface GameState {
  turn: number;
  players: Player[];
  currentPlayerId: number;
  board: Board | null;
  animals: Animal[];
  habitats: Habitat[];
  isInitialized: boolean;  // Flag to track if the game has been initialized
  
  // Movement state
  selectedUnitId: string | null;
  validMoves: ValidMove[];
  moveMode: boolean;
  selectedUnitIsDormant: boolean; // Flag to track if the selected unit is dormant
  
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
  
  nextTurn: () => void;
  resetMovementFlags: () => void; // Reset hasMoved flags for all animals
  addPlayer: (name: string, color: string) => void;
  setActivePlayer: (playerId: number) => void;
  initializeBoard: (width: number, height: number, mapType?: MapGenerationType, forceHabitatGeneration?: boolean) => void;
  getTile: (x: number, y: number) => Tile | undefined;
  
  addAnimal: (x: number, y: number, type?: string) => void;
  evolveAnimal: (id: string) => void;
  
  // Movement-related methods
  selectUnit: (id: string | null) => void;
  moveUnit: (id: string, x: number, y: number) => void;
  getValidMoves: (id: string) => ValidMove[];
  
  // Habitat-related methods
  addPotentialHabitat: (x: number, y: number) => void;
  improveHabitat: (habitatId: string) => void;
  getHabitatAt: (x: number, y: number) => Habitat | undefined;
}

export const useGameStore = create<GameState>((set, get) => ({
  turn: 1,
  players: [],
  currentPlayerId: 0,
  board: null,
  animals: [],
  habitats: [],
  isInitialized: false,
  
  // Initialize movement state
  selectedUnitId: null,
  validMoves: [],
  moveMode: false,
  selectedUnitIsDormant: false,
  
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

  nextTurn: () => set((state) => {
    // Process habitat production
    const updatedState = processHabitatProduction(state);
    
    // Reset the hasMoved flags for all animals but preserve previousPosition
    const resetAnimals = updatedState.animals?.map(animal => ({
      ...animal,
      hasMoved: false
      // previousPosition is preserved here
    })) || state.animals?.map(animal => ({
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
    
    return { 
      ...updatedState,
      animals: resetAnimals,
      turn: state.turn + 1,
      displacementEvent: resetDisplacementEvent,
      spawnEvent: resetSpawnEvent
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
            explored: false,
            visible: true,
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
              if (terrainData[y][x] === terrainType) {
                tilesOfType.push({ x, y });
              }
            }
          }
          
          // If we have tiles of this type, place a habitat on one randomly
          if (tilesOfType.length > 0) {
            const randomIndex = Math.floor(Math.random() * tilesOfType.length);
            const { x, y } = tilesOfType[randomIndex];
            
            const habitatId = terrainTypesWithHabitats.size;
            const newHabitat: Habitat = {
              id: `habitat-${habitatId}`,
              position: { x, y },
              state: HabitatState.POTENTIAL,
              shelterType: null,
              ownerId: null,
              productionRate: Math.floor(Math.random() * 3) + 1, // Random 1-3
              lastProductionTurn: 0,
            };
            
            habitats.push(newHabitat);
            terrainTypesWithHabitats.add(terrainType);

            // Place initial eggs around the habitat if it has production
            if (newHabitat.productionRate > 0) {
              const validTiles = getValidEggPlacementTiles(newHabitat, {
                board: { width, height, tiles },
                animals,
              });

              // Place eggs based on production rate
              for (let i = 0; i < Math.min(newHabitat.productionRate, validTiles.length); i++) {
                const randomTileIndex = Math.floor(Math.random() * validTiles.length);
                const tile = validTiles[randomTileIndex];
                validTiles.splice(randomTileIndex, 1);

                // Create new egg
                const newAnimal = {
                  id: `animal-${animals.length}`,
                  type: TERRAIN_ANIMAL_MAP[tiles[tile.y][tile.x].terrain],
                  state: AnimalState.DORMANT,
                  position: tile,
                  previousPosition: null,
                  hasMoved: false,
                };
                console.log(`Created new animal during init:`, { 
                  id: newAnimal.id, 
                  type: newAnimal.type, 
                  terrain: tiles[tile.y][tile.x].terrain 
                });
                animals.push(newAnimal);
              }
            }
          }
        });
        
        // Verify we've placed exactly one habitat per available terrain type
        console.log(`Initialized ${habitats.length} habitats on ${terrainTypesWithHabitats.size} terrain types`);
      }

      return { 
        board: { width, height, tiles },
        isInitialized: true,
        // Use new habitats if generating, otherwise keep existing ones
        habitats: (!state.isInitialized || forceHabitatGeneration) ? habitats : state.habitats,
        // Replace animals when force generating, otherwise add to existing
        animals: (!state.isInitialized || forceHabitatGeneration) ? animals : [...state.animals, ...animals],
      };
    }),

  getTile: (x, y) => {
    const board = get().board;
    if (!board) return undefined;
    if (x < 0 || x >= board.width || y < 0 || y >= board.height) return undefined;
    return board.tiles[y][x];
  },

  addAnimal: (x, y, type = "buffalo") =>
    set((state) => {
      const newAnimal: Animal = {
        id: `animal-${state.animals.length}`,
        type: type,
        state: AnimalState.DORMANT,
        position: { x, y },
        previousPosition: null,
        hasMoved: false,
      };
      return { animals: [...state.animals, newAnimal] };
    }),

  evolveAnimal: (id) =>
    set((state) => {
      // Find the egg to evolve
      const eggToEvolve = state.animals.find(a => a.id === id);
      if (!eggToEvolve) return state;
      
      const eggPosition = eggToEvolve.position;
      
      // Check if there's an active unit at the same position
      const activeUnitAtPosition = state.animals.find(a => 
        a.state === AnimalState.ACTIVE &&
        a.position.x === eggPosition.x &&
        a.position.y === eggPosition.y
      );
      
      // Create a working copy of the animals array
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
          } as GameState['displacementEvent']; // Force type alignment
          
          // Update the displaced unit's position (preserve hasMoved state)
          updatedAnimals = updatedAnimals.map(animal =>
            animal.id === activeUnitAtPosition.id
              ? { ...animal, position: displacementPosition }
              : animal
          );
          
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
        type: evolvedAnimal?.type, 
        newState: AnimalState.ACTIVE 
      });
      
      return { 
        animals: updatedAnimals,
        displacementEvent
      };
    }),

  addPotentialHabitat: (x: number, y: number) =>
    set((state) => {
      const newHabitat: Habitat = {
        id: `habitat-${state.habitats.length}`,
        position: { x, y },
        state: HabitatState.POTENTIAL,
        shelterType: null,
        ownerId: null,
        productionRate: Math.floor(Math.random() * 3) + 1, // Random 1-3
        lastProductionTurn: 0,
      };
      return { habitats: [...state.habitats, newHabitat] };
    }),

  improveHabitat: (habitatId: string) =>
    set((state) => {
      const board = state.board;
      if (!board) return { habitats: state.habitats };

      const updatedHabitats = state.habitats.map(habitat => {
        if (habitat.id !== habitatId || habitat.state !== HabitatState.POTENTIAL) {
          return habitat;
        }
        
        // Get tile at the habitat position
        const tile = board.tiles[habitat.position.y]?.[habitat.position.x];
        if (!tile) return habitat;
        
        // Determine shelter type based on terrain
        let shelterType: ShelterType;
        switch (tile.terrain) {
          case TerrainType.BEACH:
            shelterType = ShelterType.TIDEPOOL;
            break;
          case TerrainType.MOUNTAIN:
            shelterType = ShelterType.NEST;
            break;
          case TerrainType.GRASS:
            shelterType = ShelterType.DEN;
            break;
          case TerrainType.UNDERWATER:
            shelterType = ShelterType.CAVE;
            break;
          case TerrainType.WATER:
            shelterType = ShelterType.REEF;
            break;
          default:
            shelterType = ShelterType.DEN; // Fallback
        }
        
        return {
          ...habitat,
          state: HabitatState.SHELTER,
          shelterType,
          ownerId: state.currentPlayerId,
          productionRate: Math.floor(Math.random() * 3) + 1, // Random 1-3
          lastProductionTurn: state.turn,
        };
      });
      
      return { habitats: updatedHabitats };
    }),

  getHabitatAt: (x: number, y: number) => {
    const habitats = get().habitats;
    if (!habitats) return undefined;
    return habitats.find(habitat =>
      habitat.position.x === x && habitat.position.y === y
    );
  },

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

// Process production for all habitats
const processHabitatProduction = (state: GameState): Partial<GameState> => {
  const newAnimals = [...state.animals];
  const updatedHabitats = state.habitats.map(habitat => {
    // Skip if no production
    if (habitat.productionRate <= 0) return habitat;

    // Calculate turns since last production
    const turnsSinceProduction = state.turn - habitat.lastProductionTurn;
    if (turnsSinceProduction <= 0) return habitat;

    // Calculate how many eggs to create
    const eggsToCreate = habitat.productionRate * turnsSinceProduction;

    // Find valid tiles for egg placement
    const validTiles = getValidEggPlacementTiles(habitat, {
      board: state.board!,
      animals: newAnimals
    });

    // Place eggs on valid tiles
    for (let i = 0; i < Math.min(eggsToCreate, validTiles.length); i++) {
      const randomIndex = Math.floor(Math.random() * validTiles.length);
      const tile = validTiles[randomIndex];
      validTiles.splice(randomIndex, 1);

      // Create new egg
      const newAnimal = {
        id: `animal-${newAnimals.length}`,
        type: TERRAIN_ANIMAL_MAP[state.board!.tiles[tile.y][tile.x].terrain],
        state: AnimalState.DORMANT,
        position: tile,
        previousPosition: null,
        hasMoved: false,
      };
      console.log(`Created new animal during production:`, { 
        id: newAnimal.id, 
        type: newAnimal.type, 
        terrain: state.board!.tiles[tile.y][tile.x].terrain 
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
};

// Helper function to find valid adjacent tiles for displacement
const getValidDisplacementTiles = (
  position: Coordinate,
  animals: Animal[],
  board: Board | null
): Coordinate[] => {
  if (!board) return [];
  
  const { x, y } = position;
  const validTiles: Coordinate[] = [];
  
  // Check all 4 adjacent tiles (north, east, south, west)
  const directions = [
    [0, -1], // north
    [1, 0],  // east
    [0, 1],  // south
    [-1, 0]  // west
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
  
  // Normalize to unit vectors for cardinal directions
  // This allows for cleaner direction comparisons
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal movement dominates
    return { dx: Math.sign(dx), dy: 0 };
  } else if (Math.abs(dy) > Math.abs(dx)) {
    // Vertical movement dominates
    return { dx: 0, dy: Math.sign(dy) };
  } else {
    // Diagonal movement (equal x and y components)
    return { dx: Math.sign(dx), dy: Math.sign(dy) };
  }
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
  
  // Priority 2: Try diagonal variations if same direction is blocked
  // This provides more natural movement when the direct path is blocked
  const diagonalOptions = [];
  
  // If moving horizontally, try diagonal up and down
  if (dx !== 0 && dy === 0) {
    diagonalOptions.push({ x: animal.position.x + dx, y: animal.position.y + 1 });
    diagonalOptions.push({ x: animal.position.x + dx, y: animal.position.y - 1 });
  }
  // If moving vertically, try diagonal left and right
  else if (dx === 0 && dy !== 0) {
    diagonalOptions.push({ x: animal.position.x + 1, y: animal.position.y + dy });
    diagonalOptions.push({ x: animal.position.x - 1, y: animal.position.y + dy });
  }
  // If moving diagonally, try horizontal and vertical components
  else {
    diagonalOptions.push({ x: animal.position.x + dx, y: animal.position.y });
    diagonalOptions.push({ x: animal.position.x, y: animal.position.y + dy });
  }
  
  // Find the first valid diagonal option
  for (const option of diagonalOptions) {
    const validOption = validTiles.find(
      tile => tile.x === option.x && tile.y === option.y
    );
    
    if (validOption) {
      console.log(`Found diagonal continuation tile: (${validOption.x},${validOption.y})`);
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
  
  // Get movement range based on animal type
  const maxDistance = MOVEMENT_RANGE_BY_TYPE[unit.type] || 3; // Default to 3 if type not found
  
  while (queue.length > 0) {
    const [x, y, distance] = queue.shift()!;
    
    // Don't count the starting position as a valid move
    if (distance > 0) {
      validMoves.push({ x, y });
    }
    
    // If we've reached max distance, don't explore further
    if (distance >= maxDistance) continue;
    
    // Check all 4 adjacent tiles
    const directions = [
      [0, -1], // north
      [1, 0],  // east
      [0, 1],  // south
      [-1, 0]  // west
    ];
    
    for (const [dx, dy] of directions) {
      const newX = x + dx;
      const newY = y + dy;
      const key = `${newX},${newY}`;
      
      // Skip if already visited or out of bounds
      if (visited.has(key) || newX < 0 || newX >= board.width || newY < 0 || newY >= board.height) {
        continue;
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
  
  // Filter valid positions (on board and not occupied)
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
