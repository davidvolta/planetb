// Game dimensions and scaling
export const TILE_SIZE = 64; // Current tile size
export const TILE_HEIGHT = 32; // Current tile height for isometric
export const BOARD_WIDTH_TILES = 30; // From current board initialization
export const BOARD_HEIGHT_TILES = 30; // From current board initialization

// Calculate fixed game dimensions
export const GAME_WIDTH = TILE_SIZE * BOARD_WIDTH_TILES;
export const GAME_HEIGHT = TILE_HEIGHT * (BOARD_HEIGHT_TILES + 10); // Add padding for UI elements

// Console logging for debugging during development
console.log(`Game dimensions: ${GAME_WIDTH}x${GAME_HEIGHT} (${BOARD_WIDTH_TILES}x${BOARD_HEIGHT_TILES} tiles)`); 