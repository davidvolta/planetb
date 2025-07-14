// ❗ DO NOT import useGameStore directly outside of actions.ts
// Use the actions.ts API for all reads/writes to game state

import { create } from "zustand";
import { TerrainType, ResourceType } from '../types/gameTypes';
import { DisplacementEvent, SpawnEvent, BiomeCaptureEvent, BLANK_DISPLACEMENT_EVENT, BLANK_SPAWN_EVENT, BLANK_BIOME_CAPTURE_EVENT } from '../types/events';
import type { SelectionState } from '../controllers/SelectionController';

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
  selectEgg: (selectionState: Partial<SelectionState>) => void;
  toggleFogOfWar: (fogOfWarEnabled: boolean, players: Player[]) => void;
  selectResource: (selectionState: Partial<SelectionState>) => void;
  nextTurn: () => void;
  resetMovementFlags: (animals: Animal[]) => void; // Reset hasMoved flags for all animals
  addPlayer: (newPlayer: Player) => void;
  setActivePlayer: (players: Player[], activePlayerId: number) => void;
  initializeBoard: (board: Board, animals: Animal[], biomes: Map<string, Biome>, players: Player[]) => void;
  getTile: (tile: Tile | undefined) => Tile | undefined;
  spawnAnimal: (
    animals: Animal[],
    board: Board,
    biomes: Map<string, Biome>, 
    displacementEvent: DisplacementEvent,
    eggs: Record<string, Egg>,
    newAnimalId: string | null,
    spawnEvent: SpawnEvent
  ) => void;
  selectAnimal: (selectionState: Partial<SelectionState>) => void;
  moveAnimal: (animals: Animal[], displacementEvent?: DisplacementEvent) => void;
  selectBiome: (selectionState: Partial<SelectionState>) => void;
  addAnimal: (animal: Animal) => void;
}

export const useGameStore = create<GameState>((set) => ({
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
  toggleFogOfWar: (fogOfWarEnabled: boolean, players: Player[]) =>
    set(() => ({ fogOfWarEnabled, players })),

  // INITIALIZATION METHODS - Pure state setters only
  initializeBoard: (board: Board, animals: Animal[], biomes: Map<string, Biome>, players: Player[]) =>
    set(() => ({
      board,
      animals,
      biomes,
      resources: {}, // will be filled by resetResources later
      players
    })),

  addPlayer: (newPlayer: Player) => 
    set((state) => ({ players: [...state.players, newPlayer] })),

  setActivePlayer: (players: Player[], activePlayerId: number) =>
    set(() => ({ players, activePlayerId })),

  // GETTERS / SELECTORS - moved to actions.ts
  getTile: (tile: Tile | undefined) => tile,


  // TURN PROGRESSION
  nextTurn: () => set((state) => {
    // Only increment the round counter; per-player resets happen at turn start
    return { turn: state.turn + 1 };
  }),

  // MOVEMENT
  selectAnimal: (selectionState: Partial<SelectionState>) => set(() => selectionState),
    
  // Pure state setters - business logic moved to controllers
  moveAnimal: (animals: Animal[], displacementEvent?: DisplacementEvent) =>
    set(() => ({ 
      animals,
      displacementEvent: displacementEvent || {
        occurred: false,
        animalId: null,
        fromX: null,
        fromY: null,
        toX: null,
        toY: null,
        timestamp: null
      }
    })),

  resetMovementFlags: (animals: Animal[]) => set(() => ({ animals })),

  // SELECTION
  selectResource: (selectionState: Partial<SelectionState>) => set(() => selectionState),

  selectBiome: (selectionState: Partial<SelectionState>) => set(() => selectionState),

  
  spawnAnimal: (
    animals: Animal[],
    board: Board,
    biomes: Map<string, Biome>, 
    displacementEvent: DisplacementEvent,
    eggs: Record<string, Egg>,
    newAnimalId: string | null,
    spawnEvent: SpawnEvent
  ) => set(() => ({
    animals,
    board,
    biomes,
    displacementEvent,
    eggs,
    selectedEggId: null,
    selectedAnimalID: newAnimalId,
    spawnEvent,
    moveMode: false,
    validMoves: []
  })),

  // Egg actions
  addEgg: (egg: Egg) => set((state) => ({ eggs: { ...state.eggs, [egg.id]: egg } })),
  
  selectEgg: (selectionState: Partial<SelectionState>) => set(() => selectionState),

  addAnimal: (animal: Animal) => set((state) => ({ animals: [...state.animals, animal] })),
}));