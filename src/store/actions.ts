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

/**
 * Get information about the current displacement event
 */
export function getDisplacementEvent(): any {
  return useGameStore.getState().displacementEvent;
}

/**
 * Clear the current displacement event
 */
export function clearDisplacementEvent(): void {
  useGameStore.setState({
    displacementEvent: {
      occurred: false,
      unitId: null,
      fromX: 0,
      fromY: 0,
      toX: 0,
      toY: 0,
      timestamp: 0
    }
  });
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

//
// Movement Actions
//

/**
 * Select a unit and calculate its valid moves
 */
export function selectUnit(unitId: string | null): void {
  useGameStore.getState().selectUnit(unitId);
}

/**
 * Deselect the currently selected unit
 */
export function deselectUnit(): void {
  useGameStore.getState().selectUnit(null);
}

/**
 * Move a unit to a new position
 */
export function moveUnit(unitId: string, x: number, y: number): void {
  useGameStore.getState().moveUnit(unitId, x, y);
}

/**
 * Get the currently selected unit ID
 */
export function getSelectedUnitId(): string | null {
  return useGameStore.getState().selectedUnitId;
}

/**
 * Get the valid moves for the currently selected unit
 */
export function getValidMoves(): { x: number, y: number }[] {
  return useGameStore.getState().validMoves;
}

/**
 * Check if the game is in move mode
 */
export function isMoveMode(): boolean {
  return useGameStore.getState().moveMode;
}

/**
 * Check if the selected unit is a dormant unit (egg)
 */
export function isSelectedUnitDormant(): boolean {
  return useGameStore.getState().selectedUnitIsDormant;
}

/**
 * Get the selected animal object
 */
export function getSelectedAnimal(): any | null {
  const id = useGameStore.getState().selectedUnitId;
  if (!id) return null;
  
  return useGameStore.getState().animals.find(a => a.id === id);
} 