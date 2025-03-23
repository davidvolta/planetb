# Application Architecture Guide: React, Zustand & Phaser

## Architecture Principles and Patterns

1. **Rendering Responsibility**
   - ✅ DO: Use Phaser for game rendering, React for UI only
   - ✅ DO: Keep rendering logic in appropriate components
   - ❌ DON'T: Use React to render game objects/tiles
   - ❌ DON'T: Create unnecessary React re-renders for game state changes

2. **Subscription Model**
   - ✅ DO: Implement a proper Observer pattern for Phaser to subscribe to state changes
   - ✅ DO: Use StateObserver for efficient callbacks when state changes
   - ✅ DO: Ensure Phaser updates tiles only when needed, not every frame
   - ❌ DON'T: Poll state with getState() in Phaser scenes
   - ❌ DON'T: Re-render everything when only small parts of state change

3. **Unidirectional Data Flow**
   - ✅ DO: React/UI → triggers state changes through action functions
   - ✅ DO: Action functions → interact with Zustand using getState()/setState()
   - ✅ DO: Zustand → notifies subscribers of changes 
   - ✅ DO: Phaser → renders based on received state updates
   - ❌ DON'T: Allow Phaser to directly modify state
   - ❌ DON'T: Create circular data flows or bidirectional dependencies

4. **Event Delegation**
   - ✅ DO: Emit events from Phaser when user interacts with game objects
   - ✅ DO: Handle game input events in React components
   - ✅ DO: Update state through action functions
   - ❌ DON'T: Handle input events directly in Phaser scenes that modify state
   - ❌ DON'T: Mix event handling with rendering logic

5. **State Access Pattern**
   - ✅ DO: Access state exclusively through action functions
   - ✅ DO: Create action functions in a central location (actions.ts)
   - ✅ DO: Centralize state access in actions to avoid prop drilling
   - ❌ DON'T: Import useGameStore and call getState() directly in components
   - ❌ DON'T: Spread state access logic throughout the application

6. **Clear Separation of Concerns**
   - ✅ DO: Phaser: Rendering and input handling only
   - ✅ DO: Zustand: State management only
   - ✅ DO: React: UI rendering and action triggering only
   - ✅ DO: Actions: Centralized state access and modification
   - ❌ DON'T: Mix responsibilities across boundaries
   - ❌ DON'T: Allow implementation details to leak between layers 