import { TerrainType } from "../types/gameTypes";
import { calculateManhattanDistance } from "./CoordinateUtils";

/**
 * Represents a node used for Voronoi diagram generation
 * This is a temporary structure used only during map generation
 */
export interface VoronoiNode {
  id: string;  // Temporary ID for generation purposes
  position: {  // Same position structure as habitats
    x: number;
    y: number;
  };
}

/**
 * Results from biome generation, including a map of which tiles belong to which biomes.
 */
export interface BiomeGenerationResult {
  biomeMap: (string | null)[][]; // 2D array of biomeIds (habitat IDs), can be null
}

/**
 * Generate biomes using Voronoi partitioning around nodes
 * Each tile is assigned to the closest node using Manhattan distance,
 * creating natural biome boundaries
 * 
 * @param width Board width
 * @param height Board height
 * @param nodes List of VoronoiNodes to use as biome centers
 * @param terrainData Current terrain map (for future terrain-based adjustments)
 * @returns BiomeGenerationResult with biomeMap
 */
export function generateVoronoiBiomes(
  width: number, 
  height: number, 
  nodes: VoronoiNode[],  // Changed from habitats to nodes
): BiomeGenerationResult {
  // Initialize empty biome map
  const biomeMap: (string | null)[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(null));

  
  // For each tile, find the closest node and assign to that biome
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minDistance = Infinity;
      let closestNodeId = null;
      
      // Find closest node
      for (const node of nodes) {
        const distance = calculateManhattanDistance(
          x, y, node.position.x, node.position.y
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestNodeId = node.id;
        }
      }
      
      // Assign this tile to the closest node's biome
      biomeMap[y][x] = closestNodeId;
    }
  }
  
  return {
    biomeMap
  };
}

/**
 * Check if a potential node would overlap with existing nodes
 * This ensures that biomes are properly separated during generation
 * 
 * @param position The potential position to check
 * @param existingNodes Array of existing nodes to check against
 * @returns true if the position would overlap with any existing node zone, false otherwise
 */
export function isNodeOverlapping(
  position: { x: number, y: number },
  existingNodes: VoronoiNode[]
): boolean {
  // For each existing node, calculate Manhattan distance
  for (const node of existingNodes) {
    const distance = calculateManhattanDistance(
      position.x, position.y,
      node.position.x, node.position.y
    );
    
    // If distance is less than 5, zones will overlap
    if (distance < 5) {
      return true;
    }
  }
  
  // No overlaps found
  return false;
}
