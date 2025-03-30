# Planet B - Project Overview

## Introduction

Planet B is a turn-based ecological strategy game where players compete to build sustainable ecosystems by placing habitats and managing animal populations. The game is built using Phaser 3 as the core game engine with React for UI components, and TypeScript for type safety and improved developer experience.

## Project Architecture

The project follows a component-based architecture with clear separation of concerns:

```
src/
├── components/  # React UI components
├── game/        # Core game initialization
├── scenes/      # Phaser scenes including the main BoardScene
│   ├── board/   # Board-related components
│   │   ├── controllers/  # Game logic controllers
│   │   ├── managers/     # System managers
│   │   ├── renderers/    # Visual rendering components
│   │   └── utils/        # Utility functions
├── state/       # State management system
├── ui/          # UI-related components
└── utils/       # General utility functions
```

### Game Engine Integration

- **Phaser + React Integration**: The game uses a custom integration layer to connect the Phaser game engine with React UI components
- **Scene Management**: Game scenes are loaded dynamically based on the application state
- **UI Overlay**: React UI components are rendered as an overlay on top of the Phaser canvas

## Core Game Systems

### BoardScene Architecture

The BoardScene employs a modular architecture with specialized components:

#### Renderers
Renderers are responsible for visualizing game elements:
- **BaseRenderer**: Provides common functionality for all renderers
- **TileRenderer**: Renders the terrain tiles and handles tile-related visual effects
- **HabitatRenderer**: Manages habitat visualization, including creation and improvement animations
- **AnimalRenderer**: Handles animal visualization, movement animations, and state changes
- **SelectionRenderer**: Shows selection indicators for tiles, animals, and habitats
- **MoveRangeRenderer**: Visualizes movement ranges and valid action targets

#### Managers
Managers handle system-level concerns:
- **LayerManager**: Manages the various display layers in the scene
- **InputManager**: Processes user input (mouse/touch events)
- **CameraManager**: Controls camera movement, zoom, and positioning
- **StateSubscriptionManager**: Centralizes state subscription and implements state diffing

#### Controllers
Controllers implement game logic:
- **GameController**: Manages game rules, turn flow, and action processing
- **AnimationController**: Coordinates complex animation sequences

### State Management

The game uses a custom state management system:

#### Component Structure

- **Game State**: Central state store with typed data structures
- **Actions**: Typed actions for state modifications
- **Reducers**: Pure functions that transform state based on actions
- **Selectors**: Functions to query and filter state data
- **Subscriptions**: Component-specific state subscriptions with diffing

#### State Flow

1. User interactions trigger events in Phaser or React
2. Events are processed by controllers/components
3. Controllers dispatch actions to modify state
4. Reducers process actions and update the state store
5. State changes are communicated to subscribers
6. Components react to state changes and update visuals


### Component Lifecycle
All components follow a consistent lifecycle:
- **Initialization**: Set up resources, subscribe to events/state
- **Update**: Process changes and update visuals
- **Destruction**: Clean up resources, unsubscribe from events


# Application Architecture Guide: React, Zustand & Phaser
## Core Principles
- **Global Game State**: Held in Zustand (turns, players, board)
- **Rendering State**: Managed by Phaser (rendering, physics, frame-by-frame updates)
- **Connection Strategy**: Connect Zustand and Phaser sparingly (use Zustand at turn changes, not per-frame updates)
- **Separation of Concerns**: Logical game state is separate from visual representation

## State Update Flow
1. User actions trigger state changes via store methods
2. State updates are processed in Zustand
3. Phaser scenes respond to state changes
4. Visual representation updates accordingly

### State Components
- **Turn**: Tracks current game progression
- **Players**: Player entities with properties like name, color, and active status
- **Board**: Grid of tiles with terrain types (water, grass, beach, mountain, underwater)
- **Tiles**: Individual grid cells with coordinates, terrain type, and visibility properties
- **Units**: (Planned) Player-controlled entities that can move and interact
- **Habitats**: (Planned) Structures on the board

## Architecture Principles and Patterns
Our core architectural pattern follows: **"Components trigger actions, actions modify state"**

This creates a unidirectional data flow where React components and Phaser scenes never directly mutate the state. Instead, they trigger actions, which encapsulate state mutation logic in a centralized location.

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
   - ✅ DO: Use direct Zustand hooks for reading state in React components
   - ✅ DO: Use action functions for ALL state mutations
   - ✅ DO: Create action functions in a central location (actions.ts)
   - ✅ DO: Use action functions for state access in non-React contexts (like Phaser scenes)
   - ❌ DON'T: Call getState() directly in components or Phaser scenes
   - ❌ DON'T: Perform state mutations directly in components

6. **Clear Separation of Concerns**
   - ✅ DO: Phaser: Rendering and input handling only
   - ✅ DO: Zustand: State management only
   - ✅ DO: React: UI rendering and action triggering only
   - ✅ DO: Actions: Centralized state access and modification
   - ❌ DON'T: Mix responsibilities across boundaries
   - ❌ DON'T: Allow implementation details to leak between layers 

## Why This Architecture Works

Our approach balances pragmatism with maintainability:

1. **Reading State**: React components use direct Zustand hooks for reading state, leveraging Zustand's efficient subscription system and keeping components simple.

2. **Modifying State**: ALL state mutations go through action functions, creating a centralized place for mutation logic which makes the codebase more maintainable, testable, and easier to debug.

3. **Single Source of Truth**: Actions serve as the API for state changes, ensuring consistent mutation patterns across the codebase.

4. **Component Decoupling**: Components don't need to know about the internal structure of the state; they just call action functions with the necessary parameters.

Remember the core pattern: **"Components trigger actions, actions modify state"**

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