// Game configuration & ecosystem constants

// Game dimensions and scaling
export const TILE_SIZE = 64; // Current tile size
export const TILE_HEIGHT = 32; // Current tile height for isometric
export const BOARD_WIDTH_TILES = 30; // From current board initialization
export const BOARD_HEIGHT_TILES = 30; // From current board initialization

// Calculate fixed game dimensions
export const GAME_WIDTH = TILE_SIZE * BOARD_WIDTH_TILES;
export const GAME_HEIGHT = TILE_HEIGHT * (BOARD_HEIGHT_TILES + 10); // Add padding for UI elements

// Ecosystem constants

// Maximum lushness value (matching simulator implementation)
export const MAX_LUSHNESS = 8.0;

// Threshold for egg production (biomes must have lushness >= 7.0 to produce eggs)
export const EGG_PRODUCTION_THRESHOLD = 7.0;

// Maximum lushness boost that can be provided by eggs
export const MAX_LUSHNESS_BOOST = 2.0;