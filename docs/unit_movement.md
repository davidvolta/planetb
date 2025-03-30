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

### Component Architecture:

1. **Specialized Movement Components**:
   - `AnimationController`: Handles all movement animations and coordinates unit displacement
   - `MoveRangeRenderer`: Visualizes the valid movement range for a selected unit
   - `InputManager`: Processes user input from clicking on units and destination tiles

2. **Separation of Concerns**:
   - State management in `store/actions.ts` and `store/gameStore.ts`
   - Visualization and animation in renderer classes
   - User interaction in manager classes
   - Game logic coordination in controller classes

### Phaser Features Leveraged:

1. **Tweens for Animation**:
   - Phaser.Tweens.TweenManager for smooth unit movement animations
   - Chain tweens for multi-tile paths

2. **Input Management**:
   - Phaser's input system for detecting clicks on units/tiles
   - Pointer events to handle input across different devices

3. **Graphics for Highlighting**:
   - Phaser.GameObjects.Graphics for drawing move range highlights
   - Can use overlay graphics on your tile layer

4. **Layer Management**:
   - Our custom `LayerManager` class to organize display layers (units, terrain, etc.)
   - Control rendering order through the depth hierarchy

### Implementation Approach:

1. **Selection System**:
   - First click: Select unit (store in state)
   - Show valid moves (based on state calculations)
   - Second click: Select destination (if valid)

2. **Movement Visualization**:
   - Keep physical movement in Phaser (tweens) via `AnimationController`
   - But trigger it based on state changes

3. **Layer Management**:
   - Units maintain correct stacking order through dynamic depth calculations
   - Proper sorting during movement with depth updates in animation callbacks

Remember that our StateObserver pattern ensures Phaser components subscribe to movement state changes rather than directly modifying unit positions.
