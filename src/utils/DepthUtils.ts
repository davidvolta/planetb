// Utility to compute depth for isometric display based on grid coordinates
export function computeDepth(gridX: number, gridY: number, isActive: boolean = false): number {
  const baseDepth = 5;
  const positionOffset = (gridX + gridY) / 1000;
  const stateOffset = isActive ? 0.0005 : 0;
  return baseDepth + positionOffset + stateOffset;
} 