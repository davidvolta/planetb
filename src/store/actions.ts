import { useGameStore, MapGenerationType } from "./gameStore";

/**
 * Action dispatchers for React components
 * 
 * These functions provide a centralized way to dispatch actions to the store
 * instead of having components directly call services like GameInitializer.
 */

interface BoardInitOptions {
  width: number;
  height: number;
  mapType?: MapGenerationType;
  forceHabitatGeneration?: boolean;
}

/**
 * Initialize the game board with the specified dimensions and options
 */
export function initializeBoard({ width, height, mapType = MapGenerationType.ISLAND, forceHabitatGeneration = false }: BoardInitOptions): void {
  useGameStore.getState().initializeBoard(width, height, mapType, forceHabitatGeneration);
}

/**
 * Get the current board state
 */
export function getBoard() {
  return useGameStore.getState().board;
}

/**
 * Check if the game is initialized
 */
export function isInitialized(): boolean {
  return !!useGameStore.getState().isInitialized;
}

/**
 * Add a new animal at the specified coordinates
 */
export function addAnimal(x: number, y: number, type?: string): void {
  useGameStore.getState().addAnimal(x, y, type);
}

/**
 * Evolve an animal by ID
 */
export function evolveAnimal(id: string): void {
  useGameStore.getState().evolveAnimal(id);
}

/**
 * Improve a habitat by ID
 */
export function improveHabitat(habitatId: string): void {
  useGameStore.getState().improveHabitat(habitatId);
} 