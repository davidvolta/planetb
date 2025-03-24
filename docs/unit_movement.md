
### Best Practices for Unit Movement:

1. **State-First Approach**: 
   - Store unit positions in your Zustand state
   - Movement logic should live in action functions, not Phaser scenes
   - Phaser should only visualize movement, not determine its validity

2. **Movement Range Calculation**:
   - Use a breadth-first search or A* algorithm to determine valid moves based on terrain, movement points, and obstacles
   - Store valid move tiles in state when a unit is selected

3. **Input Handling**:
   - Phaser handles click/tap events on tiles and units
   - Events trigger action functions that validate and execute moves

### Phaser Features You Can Leverage:

1. **Tweens for Animation**:
   - Phaser.Tweens.TweenManager for smooth unit movement animations
   - Chain tweens for multi-tile paths

2. **Input Management**:
   - Phaser's input system for detecting clicks on units/tiles
   - Pointer events to handle input across different devices

3. **Graphics for Highlighting**:
   - Phaser.GameObjects.Graphics for drawing move range highlights
   - Can use overlay graphics on your tile layer

4. **Tile Layer Management**:
   - Since you're using tile layers rather than containers, use Phaser's LayerManager to control rendering order

### Implementation Approach:

1. **Selection System**:
   - First click: Select unit (store in state)
   - Show valid moves (based on state calculations)
   - Second click: Select destination (if valid)

2. **Movement Visualization**:
   - Keep physical movement in Phaser (tweens)
   - But trigger it based on state changes

3. **Layer Management**:
   - Since units are on one layer, use z-index or depth properties to control which units appear on top
   - Consider using Phaser's display list sorting for proper rendering order

Remember that with your StateObserver pattern, Phaser should subscribe to movement state changes rather than directly modifying unit positions.
