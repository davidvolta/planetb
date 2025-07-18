# DepthSpace: Phaser Depth Management Reference

## Current Depth System
| Layer                 | Depth Value | Description                                  | Property Name         |
|-----------------------|-------------|----------------------------------------------|------------------------|
| Background Layer      | 0           | Background elements and effects              | `backgroundLayer`     |
| Terrain Layer         | 1           | Terrain tiles (grass, water, etc.)           | `terrainLayer`        |
| Selection Layer       | 2           | Selection highlights and indicators          | `selectionLayer`      |
| Move Range Layer      | 3           | Movement range highlights                    | `moveRangeLayer`      |
| Static Objects Layer  | 4           | Habitat markers and non-moving objects       | `staticObjectsLayer`  |
| Fog of War Layer      | 5           | Fog tiles obscuring unexplored areas         | `fogOfWarLayer`       |
| Units Layer           | 6           | Animal units (snake, bird, etc.)             | `unitsLayer`          |
| UI Layer              | 10          | Game UI elements                             | `uiLayer`             |


### Unit Rendering
Units (animals) are rendered in the `AnimalRenderer` class with dynamic depth calculation:

1. Units are added to the `unitsLayer` (base depth 6)
2. Units have a vertical offset of -12 pixels to appear above tiles
3. **Dynamic depth sorting** within the layer based on the unit's position and state


### Depth Formula Breakdown
Our depth formula creates a three-part depth hierarchy:

1. **Layer Depth** (Integer Part):
   - Each major layer has a whole number (6 for the units layer)
   - Maintains separation between major rendering layers

2. **Y-Position Sublayer** (First Fractional Part):
   - Units at higher Y-coordinates appear visually "above" units with lower Y
   - Range: 0.000 to 0.999 (supports up to 1000 rows)
   - Formula: `y / 1000`

3. **Unit State Sublayer** (Second Fractional Part):
   - Active units (0.0005) appear above dormant units/eggs (0.0)
   - Ensures eggs are always rendered beneath active units at the same position
   - Using a very small value to minimize impact on overall perspective

### Example Depth Values
For the units layer (base depth 6):
- Dormant unit (egg) at y=0: 6.000
- Dormant unit (egg) at y=10: 6.010
- Active unit at y=0: 6.0005
- Active unit at y=10: 6.0105

This system maintains proper isometric perspective by ensuring:
1. Units at higher Y-coordinates appear above those at lower Y
2. Active units always appear above eggs at the same position
3. No layer boundaries are crossed (all unit depths remain between 6.0 and 7.0)

## Fog of War System
The fog of war system creates black tiles that obscure unexplored areas of the map:

1. **Layer Position**: Fog tiles are rendered at depth 5, above static objects but below units
2. **Rendering**: Each fog tile is a diamond-shaped Graphics object matching terrain tiles
3. **Visibility**: When tiles are revealed, fog tiles fade out with a smooth animation
4. **Callbacks**: The system supports visibility change callbacks to update game state

### Key Features
- **Tile-Based System**: Each fog tile corresponds to one terrain tile
- **Animated Reveal**: Smooth fade-out transitions when revealing tiles 
- **Toggle Support**: Can be enabled/disabled at runtime via `toggleFogOfWar()`
- **Efficient Rendering**: Uses Phaser Graphics objects for optimized performance
- **Visibility Tracking**: Maintains internal map of visible/fogged tiles

## Benefits of Current System
1. **Visual Consistency**: Units maintain proper stacking order during movement
2. **Clean Layer Separation**: No risk of units crossing into other layers
3. **Enhanced Isometric Effect**: Proper overlap handling reinforces the isometric perspective
4. **State-Based Rendering**: Different unit states maintain consistent vertical relationships
5. **Progressive Discovery**: Fog of war enhances gameplay through exploration mechanics

