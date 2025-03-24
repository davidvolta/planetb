# DepthSpace: Phaser Depth Management Reference

## Current Depth System
| Layer                 | Depth Value | Description                                  | Property Name         |
|-----------------------|-------------|----------------------------------------------|------------------------|
| Background Layer      | 0           | Background elements and effects              | `backgroundLayer`     |
| Terrain Layer         | 1           | Terrain tiles (grass, water, etc.)           | `terrainLayer`        |
| Selection Layer       | 2           | Selection highlights and indicators          | `selectionLayer`      |
| Static Objects Layer  | 3           | Habitat markers and non-moving objects       | `staticObjectsLayer`  |
| Units Layer           | 4           | Animal units (buffalo, bird, bunny, etc.)    | `unitsLayer`          |
| UI Layer              | 10          | Game UI elements                             | `uiLayer`             |


### Unit Rendering
Units (animals) are currently rendered in the `renderAnimalSprites()` method. Important implementation notes:

1. Units are added to the `unitsLayer` (depth 4)
2. Units currently have a vertical offset of -12 pixels to appear above tiles
3. No individual depth sorting within the layer for units that overlap

### Selection Indicator
The selection indicator is added to the `selectionLayer` (depth 2) and appears below units but above terrain.

## Recommended Changes for Unit Movement
To implement proper unit movement with correct visual stacking:

1. **Increase Depth Range Between Layers**:
   - Use larger gaps between layer depths to allow room for individual object depth values

2. **Dynamic Unit Depth**:
   - Set each unit's individual depth based on Y-position
   - Ensure proper unit stacking without changing the layer structure

3. **Per-Unit Depth Formula**:
   - Base depth: unitsLayer.depth (4)
   - Individual unit depth formula: 4 + (unit.gridY / 100)
   - This allows 100 rows of units to be properly sorted without conflicting with other layers

