import { useGameStore, Animal, ValidMove } from '../gameStore';
import { AnimalController } from '../../controllers/AnimalController';
import { MovementController } from '../../controllers/MovementController';
import { EcosystemController } from '../../controllers/EcosystemController';

/**
 * Get all animals in the game
 */
export function getAnimals(): Animal[] {
  return useGameStore.getState().animals;
}

/**
 * Remove an animal from the game state by ID.
 */
export function removeAnimal(id: string): void {
  useGameStore.setState(state => ({ animals: state.animals.filter(a => a.id !== id) }));
}

/**
 * Add a new animal to the game state.
 */
export function addAnimal(animal: Animal): void {
  animal.facingDirection = 'left'; // Default to facing left
  useGameStore.getState().addAnimal(animal);
}

/**
 * Spawn (hatch) an animal from an egg by ID
 */
export async function spawnAnimal(id: string): Promise<void> {
  const state = useGameStore.getState();
  const animal = state.animals.find(a => a.id === id);
  const eggRecord = state.eggs[id];
  if (!animal && !eggRecord) {
    throw new Error(`SpawnAnimal failed: entity ${id} not found)`);
  }
  
  // Use AnimalController for business logic
  const result = AnimalController.spawnAnimal(id, state);
  const spawnEvent = {
    occurred: true,
    animalId: result.newAnimalId,
    timestamp: Date.now()
  };
  
  useGameStore.getState().spawnAnimal(
    result.animals,
    result.board,
    result.biomes,
    result.displacementEvent,
    result.eggs,
    result.newAnimalId,
    spawnEvent
  );

  // Recalculate lushness for the affected biome if needed
  if (result.biomeIdAffected) {
    const latestState = useGameStore.getState();
    const recalcedBiomes = EcosystemController.recalcBiomeLushness(
      latestState.biomes,
      result.biomeIdAffected,
      latestState.board!,
      latestState.resources
    );
    useGameStore.setState({ biomes: recalcedBiomes });
  }
}

/**
 * Get valid moves for an animal
 */
export function getValidMoves(animalId: string): ValidMove[] {
  const state = useGameStore.getState();
  const animal = state.animals.find(a => a.id === animalId);
  return animal && state.board
    ? MovementController.calculateValidMoves(animal, state.board, state.animals)
    : [];
}

/**
 * Get the currently selected animal ID
 */
export function getSelectedAnimalID(): string | null {
  return useGameStore.getState().selectedAnimalID;
}

/**
 * Move an animal to a new position
 * @param id Animal ID
 * @param x X coordinate
 * @param y Y coordinate
 */
export async function moveAnimal(id: string, x: number, y: number): Promise<void> {
  const state = useGameStore.getState();
  const animal = state.animals.find(a => a.id === id);
  if (!animal) {
    throw new Error(`MoveAnimal failed: animal ${id} not found`);
  }
  if (animal.hasMoved) {
    throw new Error(`MoveAnimal failed: animal ${id} has already moved`);
  }
  if (!state.board) {
    throw new Error(`MoveAnimal failed: board not initialized`);
  }
  // Recalculate legal moves directly for validation
  const legalMoves = MovementController.calculateValidMoves(animal, state.board, state.animals);
  if (!legalMoves.some(m => m.x === x && m.y === y)) {
    throw new Error(`MoveAnimal failed: invalid move to (${x},${y})`);
  }

  // Use AnimalController for business logic (includes direction update)
  const { animals, displacementEvent } = AnimalController.moveAnimal(id, x, y, state);
  useGameStore.getState().moveAnimal(animals, displacementEvent);
}

/**
 * Move a displaced animal to its new position after collision
 * Used by the animation system after displacement animation completes
 * @param id Animal ID
 * @param x X coordinate
 * @param y Y coordinate
 */
export async function moveDisplacedAnimal(id: string, x: number, y: number): Promise<void> {
  const state = useGameStore.getState();
  const animal = state.animals.find(animal => animal.id === id);
  if (!animal) {
    throw new Error(`MoveDisplacedAnimal failed: animal ${id} not found`);
  }
  const originalHasMoved = animal.hasMoved;
  // Update the animal's position in state while preserving its hasMoved state
  useGameStore.setState({
    animals: state.animals.map(a => 
      a.id === id 
        ? { 
            ...a, 
            previousPosition: { ...a.position }, // Record previous position
            position: { x, y },
            hasMoved: originalHasMoved // Preserve original hasMoved state
          }
        : a
    )
  });
}

/**
 * Get the valid moves for the currently selected animal
 */
export function getSelectedAnimalValidMoves(): { x: number, y: number }[] {
  return useGameStore.getState().validMoves;
}

/**
 * Get animals at a specific position
 */
export function getAnimalsAt(x: number, y: number): Animal[] {
  const state = useGameStore.getState();
  return state.animals.filter(animal => 
    animal.position.x === x && animal.position.y === y
  );
}