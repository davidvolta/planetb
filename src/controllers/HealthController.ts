import { Animal, Board, Biome } from '../store/gameStore';

export class HealthController {
  /**
   * Update health for all animals at the start of a turn
   * Animals gain health when in owned biomes, lose health when outside
   */
  public static updateHealthForTurn(
    animals: Animal[], 
    biomes: Map<string, Biome>, 
    board: Board
  ): Animal[] {
    console.log(`🏥 [HealthController] Processing health updates for ${animals.length} animals`);
    
    const updatedAnimals = animals.map(animal => {
      const isInOwnedBiome = HealthController.isInOwnedBiome(animal, biomes, board);
      const oldHealth = animal.health;
      
      let newHealth: number;
      if (isInOwnedBiome) {
        // Gain 1 health per turn in owned biomes (max 10)
        newHealth = Math.min(10, animal.health + 1);
        if (newHealth > oldHealth) {
          console.log(`💚 ${animal.species} ${animal.id.slice(-4)} gained health: ${oldHealth} → ${newHealth} (in owned biome)`);
        }
      } else {
        // Lose 1 health per turn outside owned biomes (min 0)
        newHealth = Math.max(0, animal.health - 1);
        if (newHealth < oldHealth) {
          console.log(`💔 ${animal.species} ${animal.id.slice(-4)} lost health: ${oldHealth} → ${newHealth} (outside owned biome)`);
        }
      }
      
      return {
        ...animal,
        health: newHealth
      };
    });
    
    const deadAnimals = updatedAnimals.filter(animal => animal.health <= 0);
    const aliveAnimals = updatedAnimals.filter(animal => animal.health > 0);
    
    if (deadAnimals.length > 0) {
      console.log(`💀 ${deadAnimals.length} animals died from health loss:`, 
        deadAnimals.map(a => `${a.species} ${a.id.slice(-4)}`));
    }
    
    console.log(`🏥 Health update complete: ${aliveAnimals.length} animals remaining`);
    return aliveAnimals;
  }

  /**
   * Apply immediate health loss when an animal moves out of an owned biome
   */
  public static applyMovementHealthLoss(
    animal: Animal,
    fromBiome: string | null,
    toBiome: string | null,
    biomes: Map<string, Biome>
  ): Animal {
    // Check if moving FROM an owned biome TO a non-owned biome
    const fromOwnedBiome = fromBiome && biomes.get(fromBiome)?.ownerId === animal.ownerId;
    const toOwnedBiome = toBiome && biomes.get(toBiome)?.ownerId === animal.ownerId;
    
    if (fromOwnedBiome && !toOwnedBiome) {
      // Moving out of owned territory - lose 1 health immediately
      const oldHealth = animal.health;
      const newHealth = Math.max(0, animal.health - 1);
      console.log(`🚶💔 ${animal.species} ${animal.id.slice(-4)} lost health from movement: ${oldHealth} → ${newHealth} (left owned biome)`);
      
      if (newHealth === 0) {
        console.log(`💀 ${animal.species} ${animal.id.slice(-4)} died from movement health loss!`);
      }
      
      return {
        ...animal,
        health: newHealth
      };
    }
    
    return animal; // No health change
  }

  /**
   * Check if an animal is in a biome owned by the same player
   */
  public static isInOwnedBiome(
    animal: Animal, 
    biomes: Map<string, Biome>, 
    board: Board
  ): boolean {
    const { x, y } = animal.position;
    
    // Check bounds
    if (x < 0 || x >= board.width || y < 0 || y >= board.height) {
      return false;
    }
    
    const tile = board.tiles[y][x];
    const biomeId = tile.biomeId;
    
    if (!biomeId) {
      return false; // No biome = not owned
    }
    
    const biome = biomes.get(biomeId);
    return biome?.ownerId === animal.ownerId;
  }

  /**
   * Get animals that will die next turn (health will reach 0)
   * Useful for UI warnings
   */
  public static getAnimalsAtRisk(
    animals: Animal[], 
    biomes: Map<string, Biome>, 
    board: Board
  ): Animal[] {
    return animals.filter(animal => {
      const isInOwnedBiome = HealthController.isInOwnedBiome(animal, biomes, board);
      return animal.health === 1 && !isInOwnedBiome;
    });
  }
} 