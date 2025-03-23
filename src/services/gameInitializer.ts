import { TerrainType, MapGenerationType, useGameStore } from "../store/gameStore";
import { generateIslandTerrain } from "../utils/terrainGenerator";
import { StateObserver } from "../utils/stateObserver";

/**
 * GameInitializer service
 * 
 * This service handles initialization of game state including:
 * - Board creation and initialization
 * - Initial game state setup
 * - Fallback initialization without modifying state
 * 
 * It provides a consistent way to initialize the game that can be used
 * from multiple places (React components, Phaser scenes, etc.)
 */

interface GameInitOptions {
  width?: number;
  height?: number;
  mapType?: MapGenerationType;
  forceHabitatGeneration?: boolean;
}

const DEFAULT_OPTIONS: GameInitOptions = {
  width: 30,
  height: 30,
  mapType: MapGenerationType.ISLAND,
  forceHabitatGeneration: false
};

// Current game board cached for retrieval without accessing store directly
let cachedBoard: {
  width: number;
  height: number;
  tiles: { coordinate: { x: number; y: number }; terrain: TerrainType; explored: boolean; visible: boolean; }[][];
} | null = null;

// Cache for isInitialized state
let cachedIsInitialized: boolean = false;

// Initialize cache values from current state
// This ensures we have valid values right from the start
cachedIsInitialized = useGameStore.getState().isInitialized;
if (useGameStore.getState().board) {
  cachedBoard = useGameStore.getState().board;
}

// Update the cached board when state changes
StateObserver.subscribe(
  'GameInitializer.board',
  (state) => state.board,
  (board) => {
    if (board) {
      cachedBoard = board;
    }
  }
);

// Update the cached initialization state
StateObserver.subscribe(
  'GameInitializer.isInitialized',
  (state) => state.isInitialized,
  (isInitialized) => {
    cachedIsInitialized = isInitialized;
  }
);

export class GameInitializer {
  /**
   * Initializes the game board with the provided options
   * @param options Game initialization options
   * @returns Boolean indicating success
   */
  static initializeBoard(options: GameInitOptions = {}): boolean {
    try {
      // Merge default options with provided options
      const opts = { ...DEFAULT_OPTIONS, ...options };
      const { width, height, mapType, forceHabitatGeneration } = opts;
      
      if (!width || !height) {
        console.error("Invalid board dimensions", width, height);
        return false;
      }
      
      // Initialize the board in the store
      useGameStore.getState().initializeBoard(width, height, mapType, forceHabitatGeneration);
      console.log(`Board initialized: ${width}x${height}, type: ${mapType}`);
      return true;
    } catch (error) {
      console.error("Failed to initialize board:", error);
      return false;
    }
  }
  
  /**
   * Checks if the game has been initialized
   * @returns Boolean indicating if game is initialized
   */
  static isInitialized(): boolean {
    // Use cached value instead of direct getState() call
    return cachedIsInitialized;
  }
  
  /**
   * Generates a fallback board when needed without storing in state
   * Used when the board is needed but not available in state
   */
  static generateFallbackBoard(width: number, height: number): {
    width: number;
    height: number;
    tiles: { coordinate: { x: number; y: number }; terrain: TerrainType; explored: boolean; visible: boolean; }[][];
  } {
    console.warn("Generating fallback board - this will not be saved to state");
    
    // Generate terrain data
    const terrainData = generateIslandTerrain(width, height);
    
    // Create tiles with the generated terrain
    const tiles = [];
    
    for (let y = 0; y < height; y++) {
      const row = [];
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
      width,
      height,
      tiles
    };
  }
  
  /**
   * Gets the current board from cached state or creates a fallback if needed
   */
  static getBoard() {
    if (cachedBoard) {
      return cachedBoard;
    }
    
    // Generate a fallback board without saving to state
    return this.generateFallbackBoard(DEFAULT_OPTIONS.width!, DEFAULT_OPTIONS.height!);
  }
} 