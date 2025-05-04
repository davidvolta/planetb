// Game configuration & ecosystem constants

// Game dimensions and scaling
export const TILE_SIZE = 64; // Current tile size
export const TILE_HEIGHT = 32; // Current tile height for isometric

// Maximum lushness value (matching simulator implementation)
export const MAX_LUSHNESS = 8.0;

// Threshold for egg production (biomes must have lushness >= 7.0 to produce eggs)
export const EGG_PRODUCTION_THRESHOLD = 7.0;

// Maximum lushness boost that can be provided by eggs
export const MAX_LUSHNESS_BOOST = 2.0;

// Resource generation percentage - controls density of resources (0.0 to 1.0)
export const RESOURCE_GENERATION_PERCENTAGE = 0.5; // 50% chance fixed value