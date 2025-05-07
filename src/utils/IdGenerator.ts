/**
 * A globally incrementing ID generator for game entities.
 * Safe for multiplayer, replay systems, and debugging.
 */
let nextId = 1;

export function resetIdCounter(): void {
  nextId = 1; // Useful for tests or deterministic replays
}

export function getNextId(): number {
  return nextId++;
}

export function generateEggId(biomeId: string): string {
  const id = getNextId();
  return `egg-${id}-${biomeId}`;
}

export function generateAnimalId(species: string): string {
  const id = getNextId();
  return `animal-${species}-${id}`;
} 