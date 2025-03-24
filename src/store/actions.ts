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

//
// Getter Functions (for non-React contexts like Phaser scenes)
//

/**
 * Get the current turn number
 */
export function getTurn(): number {
  return useGameStore.getState().turn;
}

/**
 * Get the function to advance to the next turn
 */
export function getNextTurn(): () => void {
  return useGameStore.getState().nextTurn;
}

//
// Board Actions
//

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

//
// Animal Actions
//

/**
 * Get all animals in the game
 */
export function getAnimals(): any[] {
  return useGameStore.getState().animals;
}

/**
 * Evolve an animal by ID
 */
export function evolveAnimal(id: string): void {
  useGameStore.getState().evolveAnimal(id);
}

//
// Habitat Actions
//

/**
 * Get all habitats in the game
 */
export function getHabitats(): any[] {
  return useGameStore.getState().habitats;
}

/**
 * Improve a habitat by ID
 */
export function improveHabitat(habitatId: string): void {
  useGameStore.getState().improveHabitat(habitatId);
} 