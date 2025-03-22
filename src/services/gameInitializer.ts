import { TerrainType, MapGenerationType, useGameStore } from "../store/gameStore";
import { generateIslandTerrain } from "../utils/terrainGenerator";

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
}

const DEFAULT_OPTIONS: GameInitOptions = {
  width: 20,
  height: 20,
  mapType: MapGenerationType.ISLAND
};

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
      const { width, height, mapType } = opts;
      
      if (!width || !height) {
        console.error("Invalid board dimensions", width, height);
        return false;
      }
      
      // Initialize the board in the store
      useGameStore.getState().initializeBoard(width, height, mapType);
      console.log(`Board initialized: ${width}x${height}, type: ${mapType}`);
      return true;
    } catch (error) {
      console.error("Failed to initialize board:", error);
      return false;
    }
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
   * Gets the current board from state or creates a fallback if needed
   */
  static getBoard() {
    const store = useGameStore.getState();
    if (store.board) {
      return store.board;
    }
    
    // Generate a fallback board without saving to state
    return this.generateFallbackBoard(DEFAULT_OPTIONS.width!, DEFAULT_OPTIONS.height!);
  }
} 