import { create } from "zustand";
import { generateIslandTerrain } from "../utils/terrainGenerator";

// Coordinate system for tiles
interface Coordinate {
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

// Only island map generation is available now
export enum MapGenerationType {
  ISLAND = 'island'
}

// Tile structure
interface Tile {
  coordinate: Coordinate;
  terrain: TerrainType;
  explored: boolean;
  visible: boolean;
}

// Board structure
interface Board {
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

// Base animal structure
interface Animal {
  id: string;
  type: string;
  state: AnimalState;
  position: Coordinate;
}



// Game state interface
export interface GameState {
  turn: number;
  players: Player[];
  currentPlayerId: number;
  board: Board | null;
  animals: Animal[];
  
  nextTurn: () => void;
  addPlayer: (name: string, color: string) => void;
  setActivePlayer: (playerId: number) => void;
  initializeBoard: (width: number, height: number) => void;
  getTile: (x: number, y: number) => Tile | undefined;
  
  addAnimal: (x: number, y: number, type?: string) => void;
  evolveAnimal: (id: string) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  turn: 1,
  players: [],
  currentPlayerId: 0,
  board: null,
  animals: [],

  nextTurn: () => set((state) => ({ turn: state.turn + 1 })),

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

  initializeBoard: (width, height) =>
    set(() => {
      const terrainData = generateIslandTerrain(width, height);
      const tiles: Tile[][] = [];

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

      return { board: { width, height, tiles } };
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
}));
