import { AnimalAbilities, SPECIES_REGISTRY, DEFAULT_ABILITIES, TerrainType } from '../types/gameTypes';

/**
 * Get abilities for a given species, falling back to defaults.
 */
export function getSpeciesAbilities(species: string): AnimalAbilities {
  return SPECIES_REGISTRY[species] || DEFAULT_ABILITIES;
}

/**
 * Check if a species can traverse a specific terrain.
 */
export function isTerrainCompatible(species: string, terrain: TerrainType): boolean {
  return getSpeciesAbilities(species).compatibleTerrains.includes(terrain);
}

/**
 * Get the movement range for a species.
 */
export function getSpeciesMoveRange(species: string): number {
  return getSpeciesAbilities(species).moveRange;
}

/**
 * List all species compatible with a terrain.
 */
export function getCompatibleSpeciesForTerrain(terrain: TerrainType): string[] {
  return Object.entries(SPECIES_REGISTRY)
    .filter(([, abilities]) => abilities.compatibleTerrains.includes(terrain))
    .map(([species]) => species);
}

/**
 * Pick a random species compatible with the given terrain.
 */
export function getRandomCompatibleSpecies(terrain: TerrainType): string {
  const options = getCompatibleSpeciesForTerrain(terrain);
  if (options.length === 0) return 'snake';
  const idx = Math.floor(Math.random() * options.length);
  return options[idx];
} 