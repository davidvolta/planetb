import { MovementController } from './MovementController';
import { HealthController } from './HealthController';
import { EvolutionController } from './EvolutionController';
import type { GameState, Animal, Board, Biome, Egg } from '../store/gameStore';
import type { DisplacementEvent } from '../types/events';

export class AnimalController {
  /**
   * Pure function to move an animal
   * Returns updated state without side effects
   */
  static moveAnimal(
    animalId: string,
    targetX: number,
    targetY: number,
    gameState: GameState
  ): {
    animals: Animal[];
    displacementEvent?: DisplacementEvent;
  } {
    const animal = gameState.animals.find(a => a.id === animalId);
    if (!animal || !gameState.board) {
      return { animals: gameState.animals };
    }

    // Update the moving animal
    let updatedAnimals = gameState.animals.map(a => {
      if (a.id === animalId) {
        // Calculate facing direction
        const direction = targetX > a.position.x ? 'right' : 'left';
        
        const updatedAnimal = {
          ...a,
          position: { x: targetX, y: targetY },
          previousPosition: a.position,
          hasMoved: true,
          facingDirection: direction
        };
        
        // Apply health changes using HealthController
        return HealthController.applyHealthChanges(updatedAnimal, gameState.board!);
      }
      return a;
    });

    // Remove animals that died from health loss
    updatedAnimals = updatedAnimals.filter(animal => animal.health > 0);

    // Handle collision displacement
    const eggsRecord = gameState.eggs;
    const collided = updatedAnimals.find(a =>
      a.id !== animalId &&
      !(a.id in eggsRecord) &&
      a.position.x === targetX &&
      a.position.y === targetY
    );

    let displacementEvent: DisplacementEvent | undefined;
    if (collided && gameState.board) {
      const result = MovementController.handleDisplacement(
        targetX, targetY, collided, updatedAnimals, gameState.board
      );
      updatedAnimals = result.animals;
      displacementEvent = result.displacementEvent;
    }

    return { animals: updatedAnimals, displacementEvent };
  }

  /**
   * Pure function to spawn an animal from an egg
   */
  static spawnAnimal(
    eggId: string,
    gameState: GameState
  ): {
    animals: Animal[];
    board: Board;
    biomes: Map<string, Biome>;
    displacementEvent: DisplacementEvent;
    eggs: Record<string, Egg>;
    newAnimalId: string | null;
    biomeIdAffected: string | null;
  } {
    return EvolutionController.spawnAnimal({
      eggId,
      animals: gameState.animals,
      eggs: gameState.eggs,
      biomes: gameState.biomes,
      board: gameState.board!,
      turn: gameState.turn
    });
  }

  /**
   * Pure function to reset movement flags
   */
  static resetMovementFlags(animals: Animal[]): Animal[] {
    return animals.map(animal => ({
      ...animal,
      hasMoved: false
    }));
  }
}