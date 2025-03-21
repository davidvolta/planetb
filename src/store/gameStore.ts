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

/**
 * GameState Interface
 * 
 * State Management Rules:
 * - Zustand store holds global game state (turns, players, board state)
 * - Phaser handles game scene and rendering state (rendering, physics, frame-by-frame updates)
 * - Connect Zustand and Phaser sparingly (use Zustand at turn changes, not per-frame updates)
 * - Separate logical game state from visual representation
 * 
 * Game State Components:
 * - Turn: Tracks current game progression
 * - Players: All player entities, their status and properties
 * - Board: The game world grid with terrain and visibility information
 * - Units: Will be added later to represent player-controlled entities
 * - Habitats: Will be added to represent structures on the board
 * 
 * State Update Flow:
 * 1. User actions trigger state changes via store methods
 * 2. State updates are processed in Zustand
 * 3. React components and Phaser scenes respond to state changes
 * 4. Visual representation updates accordingly
 */
interface GameState {
  turn: number;
  players: Player[];
  currentPlayerId: number;
  board: Board | null;
  nextTurn: () => void;
  addPlayer: (name: string, color: string) => void;
  setActivePlayer: (playerId: number) => void;
  initializeBoard: (width: number, height: number, mapType?: MapGenerationType) => void;
  getTile: (x: number, y: number) => Tile | undefined;
  
  // Terrain modification
  setTerrain: (x: number, y: number, terrain: TerrainType) => void;
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
  initializeBoard: (width: number, height: number, mapType = MapGenerationType.ISLAND) =>
    set(() => {
      // We only have island generation now
      const terrainData = generateIslandTerrain(width, height);
      
      // Create tiles with the generated terrain
      const tiles: Tile[][] = [];
      
      for (let y = 0; y < height; y++) {
        const row: Tile[] = [];
        for (let x = 0; x < width; x++) {
          row.push({
            coordinate: { x, y },
            terrain: terrainData[y][x],
            explored: false,
            visible: true, // Start with visible for testing
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
  setTerrain: (x: number, y: number, terrain: TerrainType) =>
    set((state: GameState) => {
      const board = state.board;
      if (!board) return state;
      if (x < 0 || x >= board.width || y < 0 || y >= board.height) {
        return state;
      }
      
      // Create a deep copy of the tiles to maintain immutability
      const newTiles = board.tiles.map(row => [...row]);
      newTiles[y][x] = {
        ...newTiles[y][x],
        terrain
      };
      
      return {
        board: {
          ...board,
          tiles: newTiles
        }
      };
    }),
}));
