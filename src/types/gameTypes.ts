// Terrain types
export enum TerrainType {
  WATER = 'water',
  GRASS = 'grass',
  BEACH = 'beach',
  MOUNTAIN = 'mountain',
  UNDERWATER = 'underwater',
}

// Resource types
export enum ResourceType {
  FOREST = 'forest',
  KELP = 'kelp',
  INSECTS = 'insects',
  PLANKTON = 'plankton',
  NONE = 'none' // Represents no resource (e.g. BEACH)
}

// Define the core interface for animal abilities
export interface AnimalAbilities {
  moveRange: number;
  compatibleTerrains: TerrainType[];
  // Extensible for future abilities
}

// Create the species registry with abilities for each animal type - THESE KEYS MUST MATCH SPRITE NAMES
export const SPECIES_REGISTRY: Record<string, AnimalAbilities> = {
  'buffalo': {
    moveRange: 1,
    compatibleTerrains: [TerrainType.GRASS, TerrainType.MOUNTAIN]
  },
  'bird': {
    moveRange: 4,
    compatibleTerrains: [TerrainType.MOUNTAIN, TerrainType.GRASS, TerrainType.BEACH, TerrainType.WATER, TerrainType.UNDERWATER]
  },
  'snake': {
    moveRange: 2,
    compatibleTerrains: [TerrainType.BEACH, TerrainType.GRASS]
  },
  'octopus': {
    moveRange: 3,
    compatibleTerrains: [TerrainType.UNDERWATER, TerrainType.WATER]
  },
  'turtle': {
    moveRange: 1,
    compatibleTerrains: [TerrainType.WATER, TerrainType.BEACH, TerrainType.UNDERWATER, TerrainType.GRASS]
  }
};

// Default abilities for fallback
export const DEFAULT_ABILITIES: AnimalAbilities = {
  moveRange: 1,
  compatibleTerrains: [TerrainType.GRASS]
};

// Order of terrain types for habitat placement
// Start with beaches, then move inward (grass, mountain), then outward (water, underwater)
export const BIOME_TERRAIN_ORDER: TerrainType[] = [
  TerrainType.BEACH,    // Start with beaches as the foundation
  TerrainType.GRASS,    // Move inward to grass
  TerrainType.MOUNTAIN, // Continue inward to mountains
  TerrainType.WATER,    // Move outward to water
  TerrainType.UNDERWATER // Finally to underwater
]; 