import type { GameState, Biome, Egg } from '../store/gameStore';

export class PromptBuilder {
  static buildPrompt(state: GameState, playerId: number): string {
    const animals = state.animals
      .filter(a => a.ownerId === playerId)
      .map(a => ({
        id: a.id,
        species: a.species,
        position: a.position,
        hasMoved: a.hasMoved
      }));

    const biomes = Array.from(state.biomes.values())
      .filter((b: Biome) => b.ownerId === playerId)
      .map((b: Biome) => ({
        id: b.id,
        ownerId: b.ownerId,
        habitat: b.habitat,
        lushness: b.totalLushness,
        // type: b.type // 'type' does not exist on Biome, so removed
      }));

    const eggs = Object.values(state.eggs)
      .filter((e: Egg) => e.ownerId === playerId)
      .map((e: Egg) => ({
        id: e.id,
        species: undefined, // Eggs don't have species in the current interface
        biomeId: e.biomeId,
        position: e.position
      }));

    const summary = {
      turn: state.turn,
      playerId,
      animals,
      biomes,
      eggs
    };

    return JSON.stringify(summary, null, 2); // pretty-print for readability
  }
} 