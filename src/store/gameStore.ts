import { create } from "zustand";
import { generateIslandTerrain } from "../utils/TerrainGenerator";
import { calculateManhattanDistance } from "../utils/CoordinateUtils";
import { generateVoronoiBiomes } from "../utils/BiomeGenerator";
import { VoronoiNode, isNodeOverlapping } from "../utils/BiomeGenerator";
import { devtools } from 'zustand/middleware';
import { EcosystemController } from "../controllers/EcosystemController";
import { updateBiomeLushness } from "./actions";
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

interface Player {
  id: number;
  name: string;
  color: string;
  isActive: boolean;
  energy: number; // Amount of resources collected by this player
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
  
  // Setter for resource generation percentage (0.0 to 1.0)
  setResourcePercentage: (percentage: number) => {
    // Ensure the percentage is between 0 and 1
    const clampedValue = Math.max(0, Math.min(1, percentage));
    GameConfig.resourceGenerationPercentage = clampedValue;
    return clampedValue;
  }
};

// Game state interface
export interface GameState {
  turn: number;
  players: Player[];
  currentPlayerId: number;
  board: Board | null;
  animals: Animal[];
  biomes: Map<string, Biome>; // Track biomes by ID
  isInitialized: boolean;  // Flag to track if the game has been initialized
  
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

// Helper to find a dormant egg by ID
function getEggById(state: GameState, id: string): Animal | undefined {
  return state.animals.find(a => a.id === id && a.state === AnimalState.DORMANT);
}

// Helper to remove an egg flag from the board
function removeEggFromPosition(board: Board, coord: Coordinate): Board {
  return {
    ...board,
    tiles: board.tiles.map((row, y) =>
      y === coord.y
        ? row.map((tile, x) =>
            x === coord.x ? { ...tile, hasEgg: false } : tile
          )
        : row
    )
  };
}

// Helper to update egg count in a biome and recalculate lushness
function updateEggCountAndLushness(
  biomes: Map<string, Biome>,
  biomeId: string,
  board: Board
): Map<string, Biome> {
  const newBiomes = new Map(biomes);
  const biome = newBiomes.get(biomeId);
  if (!biome) return newBiomes;
  const updatedEggCount = Math.max(0, biome.eggCount - 1);
  newBiomes.set(biomeId, { ...biome, eggCount: updatedEggCount });
  if (biome.ownerId !== null) {
    const { baseLushness, lushnessBoost, totalLushness } =
      EcosystemController.calculateBiomeLushness(biomeId, board, newBiomes);
    newBiomes.set(biomeId, {
      ...newBiomes.get(biomeId)!,
      baseLushness,
      lushnessBoost,
      totalLushness
    });
  }
  return newBiomes;
}

// Pure helper to regenerate resources at start of turn
function regenerateResources(state: GameState): Board {
  return EcosystemController.regenerateResources(state.board!, state.biomes);
}

// Pure helper to produce eggs and return new animals and biomes
function produceEggs(
  state: GameState,
  board: Board
): { animals: Animal[]; biomes: Map<string, Biome> } {
  const result = EcosystemController.biomeEggProduction(
    state.turn,
    state.animals,
    state.biomes,
    board
  );
  return { animals: result.animals, biomes: result.biomes };
}

// Pure helper to recalculate lushness for owned biomes
function recalcLushness(
  board: Board,
  biomes: Map<string, Biome>
): Map<string, Biome> {
  const newBiomes = new Map(biomes);
  newBiomes.forEach((biome, biomeId) => {
    if (biome.ownerId !== null) {
      const { baseLushness, lushnessBoost, totalLushness } =
        EcosystemController.calculateBiomeLushness(
          biomeId,
          board,
          newBiomes
        );
      newBiomes.set(biomeId, { ...biome, baseLushness, lushnessBoost, totalLushness });
    }
  });
  return newBiomes;
}

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

// Pure helper to handle displacement logic
function pureHandleDisplacement(
  board: Board,
  animalsList: Animal[],
  activeUnit: Animal,
  position: Coordinate
): { animals: Animal[]; displacementEvent: GameState['displacementEvent'] } {
  const validTiles = MovementController.getValidDisplacementTiles(position, animalsList, board);
  if (validTiles.length === 0) {
    return { animals: animalsList, displacementEvent: DEFAULT_DISPLACEMENT_EVENT };
  }
  let displacementPosition: Coordinate;
  if (activeUnit.hasMoved) {
    const prevDir = MovementController.determinePreviousDirection(activeUnit);
    displacementPosition = MovementController.findContinuationTile(activeUnit, validTiles, prevDir) || MovementController.randomTile(validTiles)!;
  } else {
    displacementPosition = MovementController.randomTile(validTiles)!;
  }
  const displacedAnimals = animalsList.map(animal =>
    animal.id === activeUnit.id
      ? { ...animal, previousPosition: { ...animal.position }, position: displacementPosition }
      : animal
  );
  return {
    animals: displacedAnimals,
    displacementEvent: {
      occurred: true,
      unitId: activeUnit.id,
      fromX: position.x,
      fromY: position.y,
      toX: displacementPosition.x,
      toY: displacementPosition.y,
      timestamp: Date.now()
    }
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  turn: 1,
  players: [],
  currentPlayerId: 0,
  board: null,
  animals: [],
  biomes: new Map(),
  isInitialized: false,
  
  // Initialize movement state
  selectedUnitId: null,
  validMoves: [],
  moveMode: false,
  selectedUnitIsDormant: false,
  
  // Initialize selection state
  selectedBiomeId: null,
  selectedResource: null,
  selectResource: (coord) => set({
    selectedResource: coord,
    selectedUnitId: null,
    validMoves: [],
    moveMode: false,
    selectedUnitIsDormant: false
  }),
  
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
    const newBoard = regenerateResources(state);
    const { animals: postEggAnimals, biomes: postEggBiomes } = produceEggs(state, newBoard);
    const newBiomes = recalcLushness(newBoard, postEggBiomes);
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

  addPlayer: (name: string, color: string) => 
    set((state) => {
      const newPlayer: Player = {
        id: state.players.length,
        name,
        color,
        isActive: state.players.length === 0, // First player starts active
        energy: 0
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

  initializeBoard: (width, height) =>
    set((state) => {
      const { board, animals, biomes } = initGameBoard(
        width,
        height,
        state.currentPlayerId
      );
      return {
        board,
        animals,
        biomes,
        isInitialized: true
      };
    }),

  getTile: (x, y) => {
    const board = get().board;
    if (!board) return undefined;
    if (x < 0 || x >= board.width || y < 0 || y >= board.height) return undefined;
    return board.tiles[y][x];
  },

  evolveAnimal: (id) =>
    set((state) => {
      // Orchestrate egg evolution using pure helpers
      const egg = getEggById(state, id);
      if (!egg) {
        console.warn(`Cannot evolve animal ${id}: not found or not a dormant egg`);
        return state;
      }
      const eggPosition = egg.position;
      const board = state.board!;
      // Retrieve biomeId from tile (Animal doesn't have biomeId)
      const tile = board.tiles[eggPosition.y][eggPosition.x];
      const biomeId = tile.biomeId;
      // Handle displacement of any active unit at egg position
      const activeUnit = state.animals.find(a =>
        a.id !== id &&
        a.position.x === eggPosition.x &&
        a.position.y === eggPosition.y &&
        a.state === AnimalState.ACTIVE
      );
      let tempAnimals = state.animals;
      let tempEvent = DEFAULT_DISPLACEMENT_EVENT;
      if (activeUnit) {
        const result = pureHandleDisplacement(board, state.animals, activeUnit, eggPosition);
        tempAnimals = result.animals;
        tempEvent = result.displacementEvent;
      }
      // Remove egg flag from board
      const newBoard = removeEggFromPosition(board, eggPosition);
      // Update biome egg count & lushness if in a biome
      const newBiomes = biomeId
        ? updateEggCountAndLushness(state.biomes, biomeId, newBoard)
        : state.biomes;
      // Evolve the egg to active unit
      const finalAnimals = tempAnimals.map(a =>
        a.id === id ? { ...a, state: AnimalState.ACTIVE, hasMoved: true } : a
      );
      return {
        animals: finalAnimals,
        board: newBoard,
        biomes: newBiomes,
        displacementEvent: tempEvent
      };
    }),

  // Biome selection method
  selectBiome: (id: string | null) => 
    set(state => {
      // Clear unit selection and move highlights on any biome select/deselect
      if (id === null) {
        return {
          selectedBiomeId: null,
          selectedUnitId: null,
          validMoves: [],
          moveMode: false,
          selectedUnitIsDormant: false
        };
      }
      
      // Check if it's a biome ID
      const biome = state.biomes.get(id);
      if (biome) {
        return {
          selectedBiomeId: id,
          selectedUnitId: null,
          validMoves: [],
          moveMode: false,
          selectedUnitIsDormant: false
        };
      }
      
      // If invalid biome ID, clear both biome and unit selection/move state
      return {
        selectedBiomeId: null,
        selectedUnitId: null,
        validMoves: [],
        moveMode: false,
        selectedUnitIsDormant: false
      };
    }),

  // Movement-related methods
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
    
  getValidMoves: (id: string) => {
    const state = get();
    // Delegate to MovementController
    const unit = state.animals.find(a => a.id === id);
    return unit && state.board
      ? MovementController.calculateValidMoves(unit, state.board, state.animals)
      : [];
  },

  resetMovementFlags: () => set((state) => {
    const updatedAnimals = state.animals.map(animal => ({
      ...animal,
      hasMoved: false
    }));
    return { animals: updatedAnimals };
  }),
}));