// ❗ DO NOT import useGameStore directly outside of actions.ts
// Use the actions.ts API for all reads/writes to game state

import { create } from "zustand";
import { EvolutionController } from "../controllers/EvolutionController";
import { initializeBoard as initGameBoard } from '../game/GameInitializer';
import { MovementController } from "../controllers/MovementController";
import { TerrainType, ResourceType } from '../types/gameTypes';
import { EcosystemController } from "../controllers/EcosystemController";
import { HealthController } from "../controllers/HealthController";
import { DisplacementEvent, SpawnEvent, BiomeCaptureEvent, BLANK_DISPLACEMENT_EVENT, BLANK_SPAWN_EVENT, BLANK_BIOME_CAPTURE_EVENT } from '../types/events';

// Coordinate system for tiles
export interface Coordinate {
  x: number;
  y: number;
}

// Biome structure
export interface Biome {
  id: string;
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
  isHabitat: boolean; // Whether this tile is a habitat
}

// Base animal structure (enum-free)
export interface Animal {
  id: string;
  species: string; 
  position: Coordinate;
  previousPosition: Coordinate | null; // Track previous position for direction calculation
  hasMoved: boolean; // Flag to track if animal has moved this turn
  ownerId: number | null; // Player ID that owns this animal, null if unowned
  facingDirection: 'left' | 'right'; // New property to track sprite orientation
  health: number; // Health from 1-10, animals die at 0
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
  visibleTiles: Set<string>; // Tiles currently visible to this player
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
  value: number; // current remaining value (0-10)
  active: boolean; // whether resource is still harvestable
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
  resources: Record<string, Resource>;
  selectedEggId: string | null;
  
  // Movement state
  selectedAnimalID: string | null;
  validMoves: ValidMove[];
  moveMode: boolean;
  fogOfWarEnabled: boolean;

  // Selection state
  selectedBiomeId: string | null; // ID of the currently selected biome
  selectedResource: Coordinate | null; // Currently selected resource tile
  
  // Displacement tracking (for animation and UI feedback)
  displacementEvent: DisplacementEvent;
  
  // Spawn event tracking
  spawnEvent: SpawnEvent;
  
  // Biome capture event tracking
  biomeCaptureEvent: BiomeCaptureEvent;
  
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
  spawnAnimal: (id: string) => void;
  selectAnimal: (id: string | null) => void;
  moveAnimal: (id: string, x: number, y: number) => void;
  getValidMoves: (id: string) => ValidMove[];
  selectBiome: (id: string | null) => void;
  addAnimal: (animal: Animal) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  turn: 1,
  players: [],
  activePlayerId: 0,
  board: null,
  animals: [],
  biomes: new Map(),
  eggs: {},
  resources: {},
  selectedEggId: null,
  
  selectedAnimalID: null,
  validMoves: [],
  moveMode: false,
  
  selectedBiomeId: null,
  selectedResource: null,
  displacementEvent: { ...BLANK_DISPLACEMENT_EVENT },
  spawnEvent: { ...BLANK_SPAWN_EVENT },
  biomeCaptureEvent: { ...BLANK_BIOME_CAPTURE_EVENT },

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
          const eggsRecord = state.eggs;
          animals
            .filter(a => a.ownerId === player.id && !(a.id in eggsRecord))
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
        const eggsRecord = state.eggs;
        animals
          .filter(a => a.ownerId === player.id && !(a.id in eggsRecord))
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
          visibleTiles: new Set(coordSet)
        };
      });
      return {
        board,
        animals,
        biomes,
        resources: {}, // will be filled by resetResources later
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
    const animal = state.animals.find(a => a.id === id);
    return animal && state.board
      ? MovementController.calculateValidMoves(animal, state.board, state.animals)
      : [];
  },

  // TURN PROGRESSION
  nextTurn: () => set((state) => {
    // Only increment the round counter; per-player resets happen at turn start
    return { turn: state.turn + 1 };
  }),

  // MOVEMENT
  selectAnimal: (id: string | null) =>
    set((state) => {
      if (!id) {
        return {
          selectedAnimalID: null,
          validMoves: [],
          moveMode: false,
          selectedEggId: null,
          selectedResource: null
        };
      }

      const animal = state.animals.find(a => a.id === id);
      if (animal && animal.hasMoved) {
        console.log(`Cannot select animal ${id} for movement - it has already moved this turn`);
        return {
          selectedAnimalID: id,
          validMoves: [],
          moveMode: false,
          selectedEggId: null,
          selectedResource: null
        };
      }

      const validMoves = animal && state.board
        ? MovementController.calculateValidMoves(animal, state.board, state.animals)
        : [];

      return {
        selectedAnimalID: id,
        validMoves,
        moveMode: true,
        selectedEggId: null,
        selectedResource: null
      };
    }),
    
  moveAnimal: (id: string, x: number, y: number) =>
    set((state) => {
      if (!state.board) return state;
      
      const movingAnimal = state.animals.find(a => a.id === id);
      if (!movingAnimal) return state;
      
      // Get biome IDs for health calculation
      const fromTile = state.board.tiles[movingAnimal.position.y][movingAnimal.position.x];
      const toTile = state.board.tiles[y][x];
      const fromBiomeId = fromTile.biomeId;
      const toBiomeId = toTile.biomeId;
      
      // Update the moved animal's position and flag
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
      
      // Apply health logic for movement
      updatedAnimals = updatedAnimals.map(animal => {
        if (animal.id === id) {
          const updatedAnimal = HealthController.applyMovementHealthLoss(
            animal, fromBiomeId, toBiomeId, state.biomes
          );
          return updatedAnimal;
        }
        return animal;
      });
      
      // Remove animals that died from health loss
      updatedAnimals = updatedAnimals.filter(animal => animal.health > 0);
      
      // Handle collision displacement via MovementController
      const eggsRecord = state.eggs;
      const collided = updatedAnimals.find(a =>
        a.id !== id &&
        !(a.id in eggsRecord) &&
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
    selectedAnimalID: null,
    validMoves: [],
    moveMode: false
  }),

  selectBiome: (id: string | null) => 
    set(state => {
      if (id === null) {
        return { selectedBiomeId: null, selectedAnimalID: null, validMoves: [], moveMode: false };
      }
      const biome = state.biomes.get(id);
      if (biome) {
        return { selectedBiomeId: id, selectedAnimalID: null, validMoves: [], moveMode: false };
      }
      return { selectedBiomeId: null, selectedAnimalID: null, validMoves: [], moveMode: false };
    }),

  
  spawnAnimal: (id: string) => {
    const state = get();
    const {
      animals: animalsFromController,
      board: newBoard,
      biomes: newBiomes,
      displacementEvent,
      eggs: updatedEggs,
      newAnimalId,
      biomeIdAffected
    } = EvolutionController.spawnAnimal({
      eggId: id,
      animals: state.animals,
      eggs: state.eggs,
      biomes: state.biomes,
      board: state.board!,
      turn: state.turn
    });

    // First commit diff (animals, eggs etc.)
    set({
      animals: animalsFromController,
      board: newBoard,
      biomes: newBiomes,
      displacementEvent,
      eggs: updatedEggs,
      selectedEggId: null,
      selectedAnimalID: newAnimalId,
      spawnEvent: {
        occurred: true,
        animalId: newAnimalId,
        timestamp: Date.now()
      } as SpawnEvent,
      moveMode: false,
      validMoves: []
    });

    // Recalculate lushness for the affected biome now that eggs record is updated
    if (biomeIdAffected) {
      const latestState = get();
      const recalcedBiomes = EcosystemController.recalcBiomeLushness(
        latestState.biomes,
        biomeIdAffected,
        latestState.board!,
        latestState.resources
      );
      set({ biomes: recalcedBiomes });
    }
  },

  // Egg actions
  addEgg: (egg: Egg) => set((state) => ({ eggs: { ...state.eggs, [egg.id]: egg } })),
  
  selectEgg: (id: string | null) => set(() => ({
    selectedEggId: id,
    selectedAnimalID: null,
    validMoves: [],
    moveMode: false,
    selectedResource: null
  })),

  addAnimal: (animal: Animal) => set((state) => ({ animals: [...state.animals, animal] })),
}));