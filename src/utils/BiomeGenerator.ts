import { Habitat, TerrainType } from "../store/gameStore";
import { calculateManhattanDistance } from "./CoordinateUtils";

/**
 * Results from biome generation, including a map of which tiles belong to which biomes,
 * and a color mapping for visualization
 */
export interface BiomeGenerationResult {
  biomeMap: (string | null)[][]; // 2D array of biomeIds (habitat IDs), can be null
  biomeColors: Map<string, number>; // Maps biomeId to color for visualization
}

/**
 * Generate biomes using Voronoi partitioning around habitats
 * 
 * Each tile is assigned to the closest habitat using Manhattan distance,
 * creating natural biome boundaries
 * 
 * @param width Board width
 * @param height Board height
 * @param habitats List of habitats to use as biome centers
 * @param terrainData Current terrain map (for future terrain-based adjustments)
 * @returns BiomeGenerationResult with biomeMap and biomeColors
 */
export function generateVoronoiBiomes(
  width: number, 
  height: number, 
  habitats: Habitat[],
  terrainData: TerrainType[][] // For future refinements/validation
): BiomeGenerationResult {
  // Initialize empty biome map
  const biomeMap: (string | null)[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(null));
  
  // Generate consistent colors for each biome
  const biomeColors = new Map<string, number>();
  habitats.forEach((habitat, index) => {
    // Generate color based on golden ratio to distribute colors well
    // This creates visually distinct colors that are evenly spaced in hue
    const hue = (index * 0.618033988749895) % 1;
    const color = hslToHex(hue, 0.7, 0.5);
    biomeColors.set(habitat.id, color);
  });
  
  // For each tile, find the closest habitat and assign to that biome
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minDistance = Infinity;
      let closestHabitatId = null;
      
      // Find closest habitat
      for (const habitat of habitats) {
        const distance = calculateManhattanDistance(
          x, y, habitat.position.x, habitat.position.y
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestHabitatId = habitat.id;
        }
      }
      
      // Assign this tile to the closest habitat's biome
      biomeMap[y][x] = closestHabitatId;
    }
  }
  
  return {
    biomeMap,
    biomeColors
  };
}

/**
 * Convert HSL color values to a hex color number suitable for Phaser
 * 
 * @param h Hue (0-1)
 * @param s Saturation (0-1)
 * @param l Lightness (0-1)
 * @returns Hex color as a number (0xRRGGBB format)
 */
function hslToHex(h: number, s: number, l: number): number {
  // Convert HSL to RGB
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  // Convert RGB to hex
  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  // Convert to Phaser-compatible hex number (0xRRGGBB)
  return parseInt(`0x${toHex(r)}${toHex(g)}${toHex(b)}`, 16);
}
