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
  [TerrainType.BEACH]: 'buffalo', // Default to buffalo for beach
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

// Game state interface
export interface GameState {
  turn: number;
  players: Player[];
  currentPlayerId: number;
  board: Board | null;
  animals: Animal[];
  habitats: Habitat[];
  isInitialized: boolean;  // Flag to track if the game has been initialized
  
  nextTurn: () => void;
  addPlayer: (name: string, color: string) => void;
  setActivePlayer: (playerId: number) => void;
  initializeBoard: (width: number, height: number, mapType?: MapGenerationType, forceHabitatGeneration?: boolean) => void;
  getTile: (x: number, y: number) => Tile | undefined;
  
  addAnimal: (x: number, y: number, type?: string) => void;
  evolveAnimal: (id: string) => void;
  
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

  nextTurn: () => set((state) => {
    // Process habitat production
    const updatedState = processHabitatProduction(state);
    
    return { 
      ...updatedState,
      turn: state.turn + 1,
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
              lastProductionTurn: 1,
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
                  type: TERRAIN_ANIMAL_MAP[terrainData[y][x]],
                  state: AnimalState.DORMANT,
                  position: tile,
                };
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
        // Add any new animals to the state
        animals: [...state.animals, ...animals],
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
      };
      return { animals: [...state.animals, newAnimal] };
    }),

  evolveAnimal: (id) =>
    set((state) => {
      const evolvedAnimals = state.animals.map(animal =>
        animal.id === id
          ? { ...animal, state: AnimalState.ACTIVE }
          : animal
      );
      return { animals: evolvedAnimals };
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
        lastProductionTurn: 1,
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
        type: TERRAIN_ANIMAL_MAP[state.board!.tiles[habitat.position.y][habitat.position.x].terrain],
        state: AnimalState.DORMANT,
        position: tile
      };
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
