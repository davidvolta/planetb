import { useGameStore, MapGenerationType, Animal, GameState, AnimalState, HabitatState, Board, Biome } from "./gameStore";

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
export function getBoard(): Board | null {
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
      fromX: null,
      fromY: null,
      toX: null,
      toY: null,
      timestamp: null
    }
  });
}

/**
 * Get information about the current spawn event
 */
export function getSpawnEvent(): any {
  return useGameStore.getState().spawnEvent;
}

/**
 * Record a spawn event in the state
 * @param unitId ID of the unit that was spawned
 */
export function recordSpawnEvent(unitId: string): void {
  useGameStore.setState({
    spawnEvent: {
      occurred: true,
      unitId: unitId,
      timestamp: Date.now()
    }
  });
}

/**
 * Clear the current spawn event
 */
export function clearSpawnEvent(): void {
  useGameStore.setState({
    spawnEvent: {
      occurred: false,
      unitId: null,
      timestamp: null
    }
  });
}

/**
 * Record a habitat improvement event in the state
 * @param habitatId ID of the habitat that was improved
 */
export function recordHabitatImproveEvent(habitatId: string): void {
  useGameStore.setState({
    habitatImproveEvent: {
      occurred: true,
      habitatId: habitatId,
      timestamp: Date.now()
    }
  });
}

/**
 * Clear the current habitat improvement event
 */
export function clearHabitatImproveEvent(): void {
  useGameStore.setState({
    habitatImproveEvent: {
      occurred: false,
      habitatId: null,
      timestamp: null
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
 * Select a habitat and check if it's in potential state
 * @param habitatId ID of the habitat to select, or null to deselect
 */
export function selectHabitat(habitatId: string | null): void {
  useGameStore.getState().selectHabitat(habitatId);
}

/**
 * Get the currently selected habitat ID
 */
export function getSelectedHabitatId(): string | null {
  return useGameStore.getState().selectedHabitatId;
}

/**
 * Check if the selected habitat is in potential state
 */
export function isSelectedHabitatPotential(): boolean {
  return useGameStore.getState().selectedHabitatIsPotential;
}

/**
 * Checks if a habitat can be improved based on unit position and movement state
 * Returns true if there's an active unit on the habitat that hasn't moved yet
 * @param habitatId The ID of the habitat to check
 * @returns boolean indicating if habitat can be improved
 */
export function canImproveHabitat(habitatId: string): boolean {
  const state = useGameStore.getState();
  const habitat = state.habitats.find(h => h.id === habitatId);
  
  if (!habitat) {
    return false;
  }
  
  if (habitat.state !== HabitatState.POTENTIAL) {
    return false;
  }
  
  // Find any active units on this habitat's position
  const unitsOnHabitat = state.animals.filter(animal => 
    animal.position.x === habitat.position.x && 
    animal.position.y === habitat.position.y &&
    animal.state === AnimalState.ACTIVE &&
    !animal.hasMoved &&
    animal.ownerId === state.currentPlayerId // Must be current player's unit
  );

  return unitsOnHabitat.length > 0;
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
 * @param id Unit ID
 * @param x X coordinate
 * @param y Y coordinate
 */
export function moveUnit(id: string, x: number, y: number): void {
  useGameStore.getState().moveUnit(id, x, y);
}

/**
 * Move a displaced unit to a new position
 * Used by the animation system after displacement animation completes
 * @param id Unit ID
 * @param x X coordinate
 * @param y Y coordinate
 */
export function moveDisplacedUnit(id: string, x: number, y: number): void {
  // Get current state
  const state = useGameStore.getState();
  
  // Find the unit to move
  const unit = state.animals.find(animal => animal.id === id);
  if (!unit) {
    console.warn(`Cannot move displaced unit ${id}: not found`);
    return;
  }
  
  // Save the original hasMoved state to preserve it
  const originalHasMoved = unit.hasMoved;
  
  // Update the unit's position in state while preserving its hasMoved state
  useGameStore.setState({
    animals: state.animals.map(animal => 
      animal.id === id 
        ? { 
            ...animal, 
            previousPosition: { ...animal.position }, // Record previous position
            position: { x, y }, // Update to new position
            hasMoved: originalHasMoved // Preserve original movement state
          } 
        : animal
    )
  });
  
  console.log(`Displaced unit ${id} position updated in state to (${x},${y}), hasMoved: ${originalHasMoved}`);
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

/**
 * Improve a habitat by changing its state to IMPROVED
 * @param habitatId ID of the habitat to improve
 */
export function improveHabitat(habitatId: string): void {
  const state = useGameStore.getState();
  const habitat = state.habitats.find(h => h.id === habitatId);
  
  if (habitat && habitat.state === HabitatState.POTENTIAL) {
    // Get the current player ID
    const currentPlayerId = state.currentPlayerId;
    
    // Create a new array with the updated habitat
    const updatedHabitats = state.habitats.map(h => 
      h.id === habitatId 
        ? { 
            ...h, 
            state: HabitatState.IMPROVED,
            ownerId: currentPlayerId, // Set the owner to current player
            lastProductionTurn: state.turn - 1 // Set lastProductionTurn to previous turn to maintain correct egg production timing
          }
        : h
    );
    
    // Update the state
    useGameStore.setState({ habitats: updatedHabitats });
    
    // Record the habitat improvement event
    recordHabitatImproveEvent(habitatId);
  }
}

/**
 * Get the current player's ID
 */
export function getCurrentPlayerId(): number {
  return useGameStore.getState().currentPlayerId;
}

/**
 * Update a tile's visibility state
 * @param x X coordinate
 * @param y Y coordinate
 * @param visible Whether the tile should be visible
 */
export function updateTileVisibility(x: number, y: number, visible: boolean): void {
  const state = useGameStore.getState();
  if (!state.board) return;
  
  // Update the tile at the specified position
  useGameStore.setState(state => {
    // Return if no board or tile is out of bounds
    if (!state.board || 
        x < 0 || x >= state.board.width || 
        y < 0 || y >= state.board.height) {
      return state;
    }
    
    // Create a deep copy of the board to avoid mutating it directly
    const newBoard = {
      ...state.board,
      tiles: state.board.tiles.map((row, rowIndex) => {
        // If this is not the row we're updating, return it as is
        if (rowIndex !== y) return row;
        
        // Otherwise update the specific tile in this row
        return row.map((tile, colIndex) => {
          // If this is not the column we're updating, return it as is
          if (colIndex !== x) return tile;
          
          // Otherwise update the tile
          return {
            ...tile,
            explored: true, // Once a tile is explored, it stays explored
            visible: visible
          };
        });
      })
    };
    
    return { board: newBoard };
  });
}

/**
 * Get all biomes from the game state
 */
export function getBiomes(): Map<string, Biome> {
  return useGameStore.getState().biomes;
}

/**
 * Get a specific biome by ID
 * @param id The ID of the biome to retrieve
 */
export function getBiomeById(id: string): Biome | undefined {
  return useGameStore.getState().biomes.get(id);
}

/**
 * Add a player to the game
 * @param name Player name
 * @param color Player color in hex format
 */
export function addPlayer(name: string, color: string): void {
  useGameStore.getState().addPlayer(name, color);
} 