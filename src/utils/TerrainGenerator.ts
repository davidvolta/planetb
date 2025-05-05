import { TerrainType } from "../types/gameTypes";

// Default parameters for terrain generation
const WATER_RATIO = 0.4;
const MOUNTAIN_RATIO = 0.05;
const BEACH_WIDTH = 2;
const SMOOTHING_PASSES = 3;

/**
 * Generate island terrain (heightmap, smoothing, beaches, underwater) for a board.
 * @param width Board width in tiles
 * @param height Board height in tiles
 * @returns A 2D array of TerrainType values representing the generated map
 */
export function generateIslandTerrain(width: number, height: number): TerrainType[][] {
  // Random seed for noise (not logged)
  const seed = Math.random() * 10000;

  // Heightmap generation
  const heightMap = generateIslandHeightMap(width, height, seed);

  // Convert heightmap to terrain types
  const terrain = heightMapToTerrain(heightMap, width, height);

  // Smooth terrain for natural look
  for (let i = 0; i < SMOOTHING_PASSES; i++) {
    smoothTerrain(terrain, width, height);
  }

  // Add beaches and underwater tiles
  addBeaches(terrain, width, height, BEACH_WIDTH);
  addUnderwaterTiles(terrain, width, height);

  return terrain;
}

/**
 * Generate an island-style heightmap with water around the edges
 */
function generateIslandHeightMap(width: number, height: number, seed: number): number[][] {
  const heightMap: number[][] = [];
  
  // Simple pseudo-random noise function
  const noise = (x: number, y: number): number => {
    const value = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return value - Math.floor(value);
  };
  
  // Calculate center point and maximum distance to edge
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Generate heightmap with island pattern
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      // Distance from center (0 at center, 1 at furthest corner)
      const dx = (x - centerX) / centerX;
      const dy = (y - centerY) / centerY;
      const distanceFromCenter = Math.sqrt(dx * dx + dy * dy) / Math.sqrt(2);
      
      // Multi-octave noise for terrain variation
      const nx = x / width;
      const ny = y / height;
      
      let noiseValue = 0;
      noiseValue += noise(nx, ny) * 0.5;
      noiseValue += noise(nx * 2, ny * 2) * 0.25;
      noiseValue += noise(nx * 4, ny * 4) * 0.125;
      noiseValue += noise(nx * 8, ny * 8) * 0.0625;
      
      // Combine noise with distance function to create island shape
      // Higher value near center, lower at edges (favor land in middle, water at edges)
      let value = 1.0 - (distanceFromCenter * 1.5) + (noiseValue * 0.5);
      
      // Ensure value stays in 0-1 range
      value = Math.max(0, Math.min(1, value));
      
      row.push(value);
    }
    heightMap.push(row);
  }
  
  return heightMap;
}

/**
 * Convert a heightmap (elevation data) to terrain types based on thresholds
 * @param heightMap 2D array of elevation values (0-1)
 * @param width Number of columns in the map
 * @param height Number of rows in the map
 * @returns A 2D array of TerrainType values based on elevation thresholds
 */
function heightMapToTerrain(
  heightMap: number[][],
  width: number,
  height: number
): TerrainType[][] {
  const terrain: TerrainType[][] = [];
  // Water and mountain thresholds from constants
  const waterThreshold = WATER_RATIO;
  const mountainThreshold = 1 - MOUNTAIN_RATIO;

  for (let y = 0; y < height; y++) {
    const row: TerrainType[] = [];
    for (let x = 0; x < width; x++) {
      const elevation = heightMap[y][x];
      
      // Assign terrain based on elevation
      if (elevation < waterThreshold) {
        row.push(TerrainType.WATER);
      } else if (elevation > mountainThreshold) {
        row.push(TerrainType.MOUNTAIN);
      } else {
        row.push(TerrainType.GRASS);
      }
    }
    terrain.push(row);
  }
  
  return terrain;
}

/**
 * Add beach tiles around water areas
 */
function addBeaches(terrain: TerrainType[][], width: number, height: number, beachWidth: number): void {
  // First identify water tiles
  const waterTiles: [number, number][] = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (terrain[y][x] === TerrainType.WATER) {
        waterTiles.push([x, y]);
      }
    }
  }
  
  // Then add beaches adjacent to water tiles (but not on water or mountains)
  for (const [wx, wy] of waterTiles) {
    // Check in expanding radius up to beachWidth
    for (let r = 1; r <= beachWidth; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          // Skip if out of bounds
          if (wx + dx < 0 || wx + dx >= width || wy + dy < 0 || wy + dy >= height) {
            continue;
          }
          
          // Skip if Manhattan distance is greater than r
          if (Math.abs(dx) + Math.abs(dy) !== r) {
            continue;
          }
          
          // Only override grass tiles
          if (terrain[wy + dy][wx + dx] === TerrainType.GRASS) {
            terrain[wy + dy][wx + dx] = TerrainType.BEACH;
          }
        }
      }
    }
  }
}

/**
 * Add underwater tiles adjacent to water tiles
 */
function addUnderwaterTiles(terrain: TerrainType[][], width: number, height: number): void {
  // First identify all water tiles adjacent to non-water (shoreline)
  const shoreline: [number, number][] = [];
  const waterTiles: [number, number][] = [];
  
  // Find all water tiles and shoreline water tiles
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (terrain[y][x] === TerrainType.WATER) {
        waterTiles.push([x, y]);
        
        // Check if this water tile touches any non-water tile (including diagonals)
        const isShore = hasNonWaterNeighbor(terrain, x, y, width, height);
        if (isShore) {
          shoreline.push([x, y]);
        }
      }
    }
  }
  
  // Initialize distance map with infinity for all water tiles
  const distanceFromShore: Record<string, number> = {};
  waterTiles.forEach(([x, y]) => {
    distanceFromShore[`${x},${y}`] = Infinity;
  });
  
  // Set shoreline distances to 0
  shoreline.forEach(([x, y]) => {
    distanceFromShore[`${x},${y}`] = 0;
  });
  
  // Perform breadth-first flood fill from shoreline
  const queue = [...shoreline];
  
  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    const currentDist = distanceFromShore[`${x},${y}`];
    
    // Check 4 adjacent neighbors
    const neighbors = [
      [x-1, y], [x+1, y], [x, y-1], [x, y+1]
    ];
    
    for (const [nx, ny] of neighbors) {
      // Skip if out of bounds or not water
      if (nx < 0 || nx >= width || ny < 0 || ny >= height || 
          terrain[ny][nx] !== TerrainType.WATER) {
        continue;
      }
      
      const key = `${nx},${ny}`;
      // If we found a shorter path, update distance and add to queue
      if (distanceFromShore[key] > currentDist + 1) {
        distanceFromShore[key] = currentDist + 1;
        queue.push([nx, ny]);
      }
    }
  }
  
  // Convert water tiles to underwater based on distance threshold
  // Water tiles with distance >= 2 from shore become underwater
  waterTiles.forEach(([x, y]) => {
    const distance = distanceFromShore[`${x},${y}`];
    if (distance >= 2) {
      terrain[y][x] = TerrainType.UNDERWATER;
    }
  });
}

/**
 * Helper function to check if a water tile has any non-water neighbors
 */
function hasNonWaterNeighbor(
  terrain: TerrainType[][], 
  x: number, 
  y: number, 
  width: number, 
  height: number
): boolean {
  // Check all 8 surrounding tiles (including diagonals)
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue; // Skip center
      
      const nx = x + dx;
      const ny = y + dy;
      
      // If neighbor is in bounds and not water/underwater, this is a shore tile
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && 
          terrain[ny][nx] !== TerrainType.WATER && 
          terrain[ny][nx] !== TerrainType.UNDERWATER) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Apply smoothing to make terrain more natural
 */
function smoothTerrain(terrain: TerrainType[][], width: number, height: number): void {
  // Deep copy the terrain to avoid modification while iterating
  const terrainCopy = terrain.map(row => [...row]);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Count terrain types in neighboring cells
      const counts: Record<TerrainType, number> = {
        [TerrainType.WATER]: 0,
        [TerrainType.GRASS]: 0,
        [TerrainType.BEACH]: 0,
        [TerrainType.MOUNTAIN]: 0,
        [TerrainType.UNDERWATER]: 0
      };
      
      // Check 8 surrounding tiles
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue; // Skip center
          
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            counts[terrainCopy[ny][nx]]++;
          }
        }
      }
      
      // Find most common surrounding terrain type
      let maxCount = 0;
      let mostCommonTerrain = terrainCopy[y][x];
      
      for (const terrainType in counts) {
        if (counts[terrainType as TerrainType] > maxCount) {
          maxCount = counts[terrainType as TerrainType];
          mostCommonTerrain = terrainType as TerrainType;
        }
      }
      
      // Replace with most common terrain type if 5 or more neighbors share it
      // This creates more cohesive terrain groups and reduces noise
      if (maxCount >= 5) {
        terrain[y][x] = mostCommonTerrain;
      }
    }
  }
} 