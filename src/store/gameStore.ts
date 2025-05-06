import { create } from "zustand";
import { EcosystemController } from "../controllers/EcosystemController";
import { initializeBoard as initGameBoard } from '../game/GameInitializer';
import { MovementController } from "../controllers/MovementController";
import { TerrainType, ResourceType } from '../types/gameTypes';

// Coordinate system for tiles
export interface Coordinate {
  x: number;
  y: number;
}

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
  biomeId: string | null; // Track which biome this tile belongs to
  resourceType: ResourceType | null; // Type of resource (FOREST, KELP, etc.) or null if none
  resourceValue: number; // Value from 0-10, where 0 means depleted
  active: boolean; // Whether this tile has an active resource
  isHabitat: boolean; // Whether this tile is a habitat
}

// Base animal structure
export interface Animal {
  id: string;
  species: string; 
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

// Egg structure for Animal/Egg refactor Phase 1
export interface Egg {
  id: string;
  ownerId: number;
  position: Coordinate;
  biomeId: string;
  createdAtTurn: number;
}

// Game state interface
export interface GameState {
  turn: number;
  players: Player[];
  activePlayerId: number;
  board: Board | null;
  animals: Animal[];
  biomes: Map<string, Biome>; // Track biomes by ID
  eggs: Record<string, Egg>;
  selectedEggId: string | null;
  
  // Movement state
  selectedUnitId: string | null;
  validMoves: ValidMove[];
  moveMode: boolean;
  selectedUnitIsDormant: boolean; // Flag to track if the selected unit is dormant
  fogOfWarEnabled: boolean;

  // Selection state
  selectedBiomeId: string | null; // ID of the currently selected biome
  selectedResource: Coordinate | null; // Currently selected resource tile
  
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
  
  // Actions
  addEgg: (egg: Egg) => void;
  selectEgg: (id: string | null) => void;
  toggleFogOfWar: (enabled: boolean) => void;
  selectResource: (coord: Coordinate | null) => void;
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
  addAnimal: (animal: Animal) => void;
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


export const useGameStore = create<GameState>((set, get) => ({
  turn: 1,
  players: [],
  activePlayerId: 0,
  board: null,
  animals: [],
  biomes: new Map(),
  eggs: {},
  selectedEggId: null,
  
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

  // FOG OF WAR
  fogOfWarEnabled: true,
  toggleFogOfWar: (enabled: boolean) => {
    set((state) => {
      if (enabled) {
        // Re-seed visibility/exploration as per normal rules
        if (!state.board) return { fogOfWarEnabled: true };
        const board = state.board;
        const animals = state.animals;
        const biomes = state.biomes;
        const seededPlayers = state.players.map(player => {
          const coordSet = new Set<string>();
          animals
            .filter(a => a.ownerId === player.id && a.state === AnimalState.ACTIVE)
            .forEach(a => {
              for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                  const x = a.position.x + dx;
                  const y = a.position.y + dy;
                  if (x >= 0 && x < board.width && y >= 0 && y < board.height) {
                    coordSet.add(`${x},${y}`);
                  }
                }
              }
            });
          biomes.forEach((b, id) => {
            if (b.ownerId === player.id) {
              for (let yy = 0; yy < board.height; yy++) {
                for (let xx = 0; xx < board.width; xx++) {
                  if (board.tiles[yy][xx].biomeId === id) {
                    coordSet.add(`${xx},${yy}`);
                  }
                }
              }
            }
          });
          return {
            ...player,
            exploredTiles: new Set(coordSet),
            visibleTiles: new Set(coordSet)
          };
        });
        return { fogOfWarEnabled: true, players: seededPlayers };
      } else {
        // Reveal the whole board for all players
        if (!state.board) return { fogOfWarEnabled: false };
        const board = state.board;
        const allCoords = new Set<string>();
        for (let y = 0; y < board.height; y++) {
          for (let x = 0; x < board.width; x++) {
            allCoords.add(`${x},${y}`);
          }
        }
        const updatedPlayers = state.players.map(player => ({
          ...player,
          exploredTiles: new Set(allCoords),
          visibleTiles: new Set(allCoords)
        }));
        return { fogOfWarEnabled: false, players: updatedPlayers };
      }
    });
  },

  // INITIALIZATION METHODS
  initializeBoard: (width, height) =>
    set((state) => {
      const numPlayers = state.players.length;
      const { board, animals, biomes } = initGameBoard(
        width,
        height,
        numPlayers
      );
      // Seed initial fog-of-war for each player
      const seededPlayers = state.players.map(player => {
        const coordSet = new Set<string>();
        // Reveal tiles around any active starting units for this player
        animals
          .filter(a => a.ownerId === player.id && a.state === AnimalState.ACTIVE)
          .forEach(a => {
            for (let dx = -1; dx <= 1; dx++) {
              for (let dy = -1; dy <= 1; dy++) {
                const x = a.position.x + dx;
                const y = a.position.y + dy;
                if (x >= 0 && x < board.width && y >= 0 && y < board.height) {
                  coordSet.add(`${x},${y}`);
                }
              }
            }
          });
        // Reveal all tiles in owned biomes
        biomes.forEach((b, id) => {
          if (b.ownerId === player.id) {
            for (let yy = 0; yy < board.height; yy++) {
              for (let xx = 0; xx < board.width; xx++) {
                if (board.tiles[yy][xx].biomeId === id) {
                  coordSet.add(`${xx},${yy}`);
                }
              }
            }
          }
        });
        return {
          ...player,
          exploredTiles: new Set(coordSet),
          visibleTiles: new Set(coordSet)
        };
      });
      return {
        board,
        animals,
        biomes,
        players: seededPlayers
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
    // Only increment the round counter; per-player resets happen at turn start
    return { turn: state.turn + 1 };
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
    const {
      board: newBoard,
      biomes: newBiomes,
      displacementEvent,
      eggs: updatedEggs // ✅ pulled from logic result
    } = EcosystemController.evolveAnimalState(state, id);

    // Activate the egg by updating its state in the animals list
    const activatedAnimals = state.animals.map(a =>
      a.id === id ? { ...a, state: AnimalState.ACTIVE, hasMoved: true } : a
    );

    return {
      animals: activatedAnimals,
      board: newBoard,
      biomes: newBiomes,
      displacementEvent,
      eggs: updatedEggs // ✅ apply new eggs object (without the evolved egg)
    };
  }),


  // Egg actions for Animal/Egg refactor Phase 1
  addEgg: (egg: Egg) => set((state) => ({ eggs: { ...state.eggs, [egg.id]: egg } })),
  selectEgg: (id: string | null) => set(() => ({ selectedEggId: id })),
  addAnimal: (animal: Animal) => set((state) => ({ animals: [...state.animals, animal] })),
}));