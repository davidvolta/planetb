import { useGameStore, Egg } from '../gameStore';

/**
 * Get the number of eggs in a specific biome.
 */
export function getEggCountForBiome(biomeId: string): number {
  const eggs = useGameStore.getState().eggs;
  return Object.values(eggs).filter(e => e.biomeId === biomeId).length;
}

/**
 * Check if a tile has an egg.
 */
export function tileHasEgg(x: number, y: number): boolean {
  const eggs = useGameStore.getState().eggs;
  return Object.values(eggs).some(e => e.position.x === x && e.position.y === y);
}

/**
 * Add an egg to the game state.
 */
export function addEgg(egg: Egg): void {
  useGameStore.getState().addEgg(egg);
}

/**
 * Remove an egg from the game state by ID.
 */
export function removeEgg(id: string): void {
  useGameStore.setState(state => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [id]: _, ...remaining } = state.eggs;
    return { eggs: remaining };
  });
}

/**
 * Get all eggs in the game.
 */
export function getEggs(): Record<string, Egg> {
  return useGameStore.getState().eggs;
}

/**
 * Get all eggs at a given tile coordinate.
 */
export function getEggsAt(x: number, y: number): Egg[] {
  const eggs = useGameStore.getState().eggs;
  return Object.values(eggs).filter(e => e.position.x === x && e.position.y === y);
}