import { TerrainType } from "../store/gameStore";

/**
 * Interface for terrain generation options
 */
interface TerrainGenerationOptions {
  seed?: number;
  waterRatio?: number;     // 0-1: how much water to include
  mountainRatio?: number;  // 0-1: how many mountains to include
  beachWidth?: number;     // Width of beaches around water
  smoothingPasses?: number; // How many smoothing passes to apply
}

/**
 * Default terrain generation options
 */
const defaultOptions: TerrainGenerationOptions = {
  seed: undefined, // This will be randomized for each call
  waterRatio: 0.4,
  mountainRatio: 0.2,
  beachWidth: 2,
  smoothingPasses: 3,
};

/**
 * Generate island terrain for a game board
 * @param width Board width
 * @param height Board height  
 * @param options Generation options
 * @returns 2D array of terrain types
 */
export function generateIslandTerrain(
  width: number, 
  height: number, 
  options: TerrainGenerationOptions = {}
): TerrainType[][] {
  // Merge default options with provided options
  const opts = { ...defaultOptions, ...options };
  
  // Ensure we have a random seed if none was provided
  if (opts.seed === undefined) {
    opts.seed = Math.random() * 10000;
  }
  
  console.log(`Generating terrain with seed: ${opts.seed}`);
  
  // Initialize with a heightmap that favors water at edges
  const heightMap = generateIslandHeightMap(width, height, opts.seed);
  
  // Convert heightmap to terrain types
  const terrain = heightMapToTerrain(heightMap, width, height, opts);
  
  // Apply smoothing passes to make terrain more natural
  for (let i = 0; i < opts.smoothingPasses!; i++) {
    smoothTerrain(terrain, width, height);
  }
  
  // Add beach tiles around water
  addBeaches(terrain, width, height, opts.beachWidth!);
  
  // Add underwater tiles adjacent to water
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
  const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
  
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
 * Convert a heightmap to terrain types
 */
function heightMapToTerrain(
  heightMap: number[][], 
  width: number, 
  height: number, 
  options: TerrainGenerationOptions
): TerrainType[][] {
  const terrain: TerrainType[][] = [];
  
  // Water threshold based on waterRatio
  const waterThreshold = options.waterRatio!;
  
  // Mountain threshold based on mountainRatio
  const mountainThreshold = 1 - options.mountainRatio!;
  
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
  // Deep copy the terrain to avoid modification while iterating
  const terrainCopy = terrain.map(row => [...row]);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (terrainCopy[y][x] === TerrainType.WATER) {
        // Check if it has at least 3 water neighbors
        let waterNeighbors = 0;
        
        // Check 4 adjacent tiles
        const neighbors = [
          [x-1, y], [x+1, y], [x, y-1], [x, y+1]
        ];
        
        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height && 
              terrainCopy[ny][nx] === TerrainType.WATER) {
            waterNeighbors++;
          }
        }
        
        // If enough water neighbors, make it underwater (deeper water)
        if (waterNeighbors >= 3) {
          terrain[y][x] = TerrainType.UNDERWATER;
        }
      }
    }
  }
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