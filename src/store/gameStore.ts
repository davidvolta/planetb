import { create } from "zustand";

// Coordinate system for tiles
interface Coordinate {
  x: number;
  y: number;
}

// Terrain types
enum TerrainType {
  WATER = 'water',
  GRASS = 'grass',
  BEACH = 'beach',
  MOUNTAIN = 'mountain',
  UNDERWATER = 'underwater',
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

interface GameState {
  turn: number;
  players: Player[];
  currentPlayerId: number;
  board: Board | null;
  nextTurn: () => void;
  addPlayer: (name: string, color: string) => void;
  setActivePlayer: (playerId: number) => void;
  initializeBoard: (width: number, height: number) => void;
  getTile: (x: number, y: number) => Tile | undefined;
}

export const useGameStore = create<GameState>((set, get) => ({
  turn: 1,
  players: [],
  currentPlayerId: 0,
  board: null,
  nextTurn: () => set((state: GameState) => ({ turn: state.turn + 1 })),
  addPlayer: (name: string, color: string) => 
    set((state: GameState) => {
      const newPlayer: Player = {
        id: state.players.length,
        name,
        color,
        isActive: state.players.length === 0 // First player is active by default
      };
      
      return { players: [...state.players, newPlayer] };
    }),
  setActivePlayer: (playerId: number) =>
    set((state: GameState) => {
      const updatedPlayers = state.players.map(player => ({
        ...player,
        isActive: player.id === playerId
      }));
      
      return { 
        players: updatedPlayers,
        currentPlayerId: playerId
      };
    }),
  initializeBoard: (width: number, height: number) =>
    set(() => {
      // Create empty board with default tiles
      const tiles: Tile[][] = [];
      
      for (let y = 0; y < height; y++) {
        const row: Tile[] = [];
        for (let x = 0; x < width; x++) {
          row.push({
            coordinate: { x, y },
            terrain: TerrainType.GRASS, // Default terrain
            explored: false,
            visible: false,
          });
        }
        tiles.push(row);
      }
      
      return { 
        board: {
          width,
          height,
          tiles
        }
      };
    }),
  getTile: (x: number, y: number) => {
    const board = get().board;
    if (!board) return undefined;
    if (x < 0 || x >= board.width || y < 0 || y >= board.height) {
      return undefined;
    }
    return board.tiles[y][x];
  },
}));
