import { create } from "zustand";
import { EcosystemController } from "../controllers/EcosystemController";
import { initializeBoard as initGameBoard } from '../controllers/GameInitializer';
import { MovementController } from "../controllers/MovementController";

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
  PLANKTON = 'plankton',
  NONE = 'none' // Represents no resource (e.g. BEACH)
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
export const TERRAIN_ANIMAL_MAP: Record<TerrainType, string> = {
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
export const BIOME_TERRAIN_ORDER: TerrainType[] = [
  TerrainType.BEACH,    // Start with beaches as the foundation
  TerrainType.GRASS,    // Move inward to grass
  TerrainType.MOUNTAIN, // Continue inward to mountains
  TerrainType.WATER,    // Move outward to water
  TerrainType.UNDERWATER // Finally to underwater
];

// Distance threshold for Voronoi node placement
const NODE_DISTANCE_THRESHOLD = 3;

// Biome structure
export interface Biome {
  id: string;
  color: number; // Store a color for visualization
  baseLushness: number; // Base lushness calculated from resources
  lushnessBoost: number; // Additional lushness from eggs
  totalLushness: number; // Combined lushness value (baseLushness + lushnessBoost)
  initialResourceCount: number; // Initial count of resources when the biome was created
  nonDepletedCount: number; // Count of non-depleted resources
  totalHarvested: number; // Total resources harvested from this biome
  eggCount: number; // Current number of eggs in this biome
  ownerId: number | null; // Player ID that owns this biome
  productionRate: number; // Number of eggs produced per turn
  lastProductionTurn: number; // Track when we last produced eggs
  habitat: Habitat; // Each biome has a habitat directly attached to it
}

// Habitat structure
export interface Habitat {
  id: string;
  position: Coordinate;
}

// Tile structure
export interface Tile {
  coordinate: Coordinate;
  terrain: TerrainType;
  explored: boolean;
  visible: boolean;
  biomeId: string | null; // Track which biome this tile belongs to
  
  // Resource properties
  resourceType: ResourceType | null; // Type of resource (FOREST, KELP, etc.) or null if none
  resourceValue: number; // Value from 0-10, where 0 means depleted
  active: boolean; // Whether this tile has an active resource
  isHabitat: boolean; // Whether this tile is a habitat
  hasEgg: boolean; // Whether this tile currently has an egg on it
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

export interface Player {
  id: number;
  name: string;
  color: string;
  isActive: boolean;
  energy: number; // Amount of resources collected by this player
  exploredTiles: Set<string>; // Tiles that this player has explored
  visibleTiles: Set<string>; // Tiles currently visible to this player
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

// Game state interface
export interface GameState {
  turn: number;
  players: Player[];
  activePlayerId: number;
  board: Board | null;
  animals: Animal[];
  biomes: Map<string, Biome>; // Track biomes by ID
  
  // Movement state
  selectedUnitId: string | null;
  validMoves: ValidMove[];
  moveMode: boolean;
  selectedUnitIsDormant: boolean; // Flag to track if the selected unit is dormant
  
  // Selection state
  selectedBiomeId: string | null; // ID of the currently selected biome
  selectedResource: Coordinate | null; // Currently selected resource tile
  selectResource: (coord: Coordinate | null) => void;
  
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
  initializeBoard: (width: number, height: number) => void;
  getTile: (x: number, y: number) => Tile | undefined;
  evolveAnimal: (id: string) => void;
  selectUnit: (id: string | null) => void;
  moveUnit: (id: string, x: number, y: number) => void;
  getValidMoves: (id: string) => ValidMove[];
  selectBiome: (id: string | null) => void;
}

// Default displacement event for animations
const DEFAULT_DISPLACEMENT_EVENT: GameState['displacementEvent'] = {
  occurred: false,
  unitId: null,
  fromX: null,
  fromY: null,
  toX: null,
  toY: null,
  timestamp: null
};

// Default spawn event for animations
const DEFAULT_SPAWN_EVENT: GameState['spawnEvent'] = {
  occurred: false,
  unitId: null,
  timestamp: null
};

// Default biome capture event for animations
const DEFAULT_BIOME_CAPTURE_EVENT: GameState['biomeCaptureEvent'] = {
  occurred: false,
  biomeId: null,
  timestamp: null
};

// Pure helper to reset movement flags and clear events
function resetMovementAndEvents(
  animals: Animal[]
): {
  animals: Animal[];
  displacementEvent: GameState['displacementEvent'];
  spawnEvent: GameState['spawnEvent'];
  biomeCaptureEvent: GameState['biomeCaptureEvent'];
} {
  const resetAnimals = animals.map(a => ({ ...a, hasMoved: false }));
  return {
    animals: resetAnimals,
    displacementEvent: DEFAULT_DISPLACEMENT_EVENT,
    spawnEvent: DEFAULT_SPAWN_EVENT,
    biomeCaptureEvent: DEFAULT_BIOME_CAPTURE_EVENT
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  turn: 1,
  players: [],
  activePlayerId: 0,
  board: null,
  animals: [],
  biomes: new Map(),
  
  // Initialize movement state
  selectedUnitId: null,
  validMoves: [],
  moveMode: false,
  selectedUnitIsDormant: false,
  
  // Initialize selection state
  selectedBiomeId: null,
  selectedResource: null,
  
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

  // INITIALIZATION METHODS
  initializeBoard: (width, height) =>
    set((state) => {
      // Pass number of players into board initialization
      const numPlayers = state.players.length;
      const { board, animals, biomes } = initGameBoard(
        width,
        height,
        numPlayers
      );
      console.log(`[${new Date().toISOString()}] Board initialized with ${numPlayers} players. Player state:`, 
        state.players.map(p => ({ id: p.id, name: p.name, isActive: p.isActive })));
      return {
        board,
        animals,
        biomes
      };
    }),

  addPlayer: (name: string, color: string) => 
    set((state) => {
      const newPlayer: Player = {
        id: state.players.length,
        name,
        color,
        isActive: state.players.length === 0, // First player starts active
        energy: 0,
        exploredTiles: new Set<string>(),
        visibleTiles: new Set<string>()
      };
      console.log(`[${new Date().toISOString()}] Player created: ${name} (ID: ${newPlayer.id})`);
      return { players: [...state.players, newPlayer] };
    }),

  setActivePlayer: (playerId: number) =>
    set((state) => {
      const updatedPlayers = state.players.map(player => ({
        ...player,
        isActive: player.id === playerId
      }));
      return { players: updatedPlayers, activePlayerId: playerId };
    }),

  // GETTERS / SELECTORS
  getTile: (x, y) => {
    const board = get().board;
    if (!board) return undefined;
    if (x < 0 || x >= board.width || y < 0 || y >= board.height) return undefined;
    return board.tiles[y][x];
  },

  getValidMoves: (id: string) => {
    const state = get();
    // Delegate to MovementController
    const unit = state.animals.find(a => a.id === id);
    return unit && state.board
      ? MovementController.calculateValidMoves(unit, state.board, state.animals)
      : [];
  },

  // TURN PROGRESSION
  nextTurn: () => set((state) => {
    const newBoard = EcosystemController.regenerateResourcesState(state);
    const { animals: postEggAnimals, biomes: postEggBiomes } = EcosystemController.produceEggsState(state, newBoard);
    const newBiomes = EcosystemController.recalcLushnessState(newBoard, postEggBiomes);
    const { animals: resetAnimals, displacementEvent, spawnEvent, biomeCaptureEvent } =
      resetMovementAndEvents(postEggAnimals);
      return { 
      board: newBoard,
      animals: resetAnimals,
      biomes: newBiomes,
      turn: state.turn + 1,
        displacementEvent,
      spawnEvent,
      biomeCaptureEvent
      };
    }),

  // MOVEMENT
  selectUnit: (id: string | null) => 
    set((state) => {
      if (!id) {
        return { 
          selectedUnitId: null,
          validMoves: [],
          moveMode: false,
          selectedUnitIsDormant: true,
          selectedResource: null  // clear resource selection
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
          selectedUnitIsDormant: unit.state === AnimalState.DORMANT,
          selectedResource: null  // clear resource selection
        };
      }
      
      // Select the unit and calculate valid moves via MovementController
      const validMoves = unit && state.board
        ? MovementController.calculateValidMoves(unit, state.board, state.animals)
        : [];
      
      return {
        selectedUnitId: id,
        validMoves,
        moveMode: true,
        selectedUnitIsDormant: unit?.state === AnimalState.DORMANT,
        selectedResource: null  // clear resource selection
      };
    }),
    
  moveUnit: (id: string, x: number, y: number) =>
    set((state) => {
      // Update the moved unit's position and flag
      let updatedAnimals = state.animals.map(animal => 
        animal.id === id 
          ? { 
              ...animal, 
              previousPosition: { ...animal.position },
              position: { x, y },
              hasMoved: true 
            } 
          : animal
      );
      // Handle collision displacement via MovementController
      const collided = state.animals.find(a =>
        a.id !== id &&
        a.state === AnimalState.ACTIVE &&
        a.position.x === x &&
        a.position.y === y
      );
      if (collided && state.board) {
        updatedAnimals = MovementController.handleDisplacement(
          x, y, collided, updatedAnimals, state.board
        );
      }
      return { animals: updatedAnimals };
    }),

  resetMovementFlags: () => set((state) => {
    const updatedAnimals = state.animals.map(animal => ({
      ...animal,
      hasMoved: false
    }));
    return { animals: updatedAnimals };
  }),

  // SELECTION
  selectResource: (coord) => set({
    selectedResource: coord,
    selectedUnitId: null,
    validMoves: [],
    moveMode: false,
    selectedUnitIsDormant: false
  }),

  selectBiome: (id: string | null) => 
    set(state => {
      if (id === null) {
        return { selectedBiomeId: null, selectedUnitId: null, validMoves: [], moveMode: false, selectedUnitIsDormant: false };
      }
      const biome = state.biomes.get(id);
      if (biome) {
        return { selectedBiomeId: id, selectedUnitId: null, validMoves: [], moveMode: false, selectedUnitIsDormant: false };
      }
      return { selectedBiomeId: null, selectedUnitId: null, validMoves: [], moveMode: false, selectedUnitIsDormant: false };
    }),

  // EVOLUTION
  evolveAnimal: (id: string) =>
    set((state) => {
      const { board: newBoard, biomes: newBiomes, displacementEvent } =
        EcosystemController.evolveAnimalState(state, id);
      // Only activate the egg here; let displacement animation handle others
      const activatedAnimals = state.animals.map(a =>
        a.id === id ? { ...a, state: AnimalState.ACTIVE, hasMoved: true } : a
      );
      return {
        animals: activatedAnimals,
        board: newBoard,
        biomes: newBiomes,
        displacementEvent
      };
    }),
}));