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
   - ✅ DO: Configure subscriptions with custom equality checks when needed
   - ✅ DO: Use StateObserver with proper cleanup in scene lifecycle methods
   - ❌ DON'T: Poll state with getState() in Phaser scenes
   - ❌ DON'T: Re-render everything when only small parts of state change
   - ❌ DON'T: Create duplicate subscriptions for the same state data

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

## Utilities and Implementation Details

### StateObserver

The StateObserver is a utility that allows Phaser scenes to safely subscribe to Zustand state changes with minimal performance overhead. It follows the Observer pattern and includes the following key features:

1. **Efficient Change Detection**
   - Uses deep equality checking instead of JSON.stringify
   - Caches selected state to avoid redundant updates
   - Supports custom equality functions for specific subscription needs

2. **Type-Safe API**
   - Properly typed selectors and change handlers
   - Provides type inference for selected state

3. **Configuration Options**
   - `immediate`: Control whether the callback fires immediately on subscription
   - `debug`: Enable logging to track state changes and updates
   - `equalityFn`: Custom function to determine if state has changed

4. **Memory Safety**
   - Provides methods for proper cleanup in scene lifecycle events
   - Avoids memory leaks through proper unsubscription

5. **Error Handling**
   - Includes try/catch blocks to prevent crashes from subscription errors
   - Logs errors for debugging

**Example Usage:**

See the comprehensive example in `src/utils/stateObserverExample.ts` which demonstrates:
- Basic subscriptions
- Custom equality functions
- Filtered selectors
- Proper cleanup patterns
- Using previous state values

**Implementation in BoardScene:**

The BoardScene demonstrates the correct implementation pattern:
1. Centralized subscription keys (SUBSCRIPTIONS constant)
2. Setup of all subscriptions in one method (setupSubscriptions)
3. Cleanup of subscriptions in scene lifecycle methods (init/shutdown)
4. Configuration of subscriptions with options when needed 