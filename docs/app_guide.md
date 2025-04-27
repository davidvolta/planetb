# Planet B - Project Overview

## Introduction

Planet B is a turn-based ecological strategy game where players compete to build sustainable ecosystems by placing habitats and managing animal populations. The game is built using Phaser 3 as the core game engine with TypeScript for type safety and improved developer experience.

## Project Architecture

The project follows a component-based architecture with clear separation of concerns:

```
src/
├── constants/   # Game configuration
├── controllers/ # Game logic controllers
├── managers/    # System managers
├── renderers/   # Visual rendering components
├── scenes/      # Phaser scenes including the main BoardScene
├── store/       # State management system
└── utils/       # Utility functions (coordinates, terrain generation, state observation)
```

### Game Engine Implementation

- **Phaser Implementation**: The game uses Phaser 3 for rendering the game world and handling user interactions
- **Scene Management**: Game scenes are loaded based on the application state
- **UI Layer**: Game UI elements are rendered using Phaser for a cohesive experience

## Core Game Systems

### Architecture Components

The game employs a modular architecture with specialized components organized by function:

#### Renderers
Renderers are responsible for visualizing game elements:
- **BaseRenderer**: Provides common functionality for all renderers
- **TileRenderer**: Renders the terrain tiles and handles tile-related visual effects
- **BiomeRenderer**: Manages habitat visualization, including creation and improvement animations
- **AnimalRenderer**: Handles animal visualization, movement animations, and state changes
- **SelectionRenderer**: Shows selection indicators for tiles, animals, and habitats
- **MoveRangeRenderer**: Visualizes movement ranges and valid action targets
- **FogOfWarRenderer**: Manages the fog of war system that obscures unexplored areas
- **ResourceRenderer**: Handles visualization of resources like forests and kelp on the game board

#### Managers
Managers handle system-level concerns:
- **LayerManager**: Manages the various display layers in the scene
- **CameraManager**: Controls camera movement, zoom, and positioning
- **StateSubscriptionManager**: Centralizes state subscription and implements state diffing

#### Controllers
Controllers implement game logic:
- **AnimationController**: Coordinates complex animation sequences
- **EcosystemController**: Implements pure and mutating ecology services:
  - Resetting/regenerating resources per biome
  - Purely computing harvest results for board, players, and biomes
  - Egg production through `biomeEggProduction` and tile-filtered placement
  - Calculating lushness (`baseLushness`, `lushnessBoost`, `totalLushness`)
  - Computing capture eligibility and effects
- **TileInteractionController**: Interprets user tile clicks and cycles through actions:
  - Unit selection (active/dormant) and move initiation
  - Habitat selection and biome capture triggers
  - Resource selection and harvesting
  - Cycling handlers for repeated clicks

### State Management

The game uses a custom state management system:

#### Component Structure

- **Game State**: Central state store with typed data structures
- **Actions**: Typed actions for state modifications
- **Selectors**: Functions to query and filter state data
- **Subscriptions**: Component-specific state subscriptions with diffing

#### State Flow

1. User interactions trigger events in Phaser scenes
2. Events are processed by controllers/components
3. Controllers dispatch actions to modify state
4. Reducers process actions and update the state store
5. State changes are communicated to subscribers
6. Components respond to state changes and update visuals


### Component Lifecycle
All components follow a consistent lifecycle:
- **Initialization**: Set up resources, subscribe to events/state
- **Update**: Process changes and update visuals
- **Destruction**: Clean up resources, unsubscribe from events


# Application Architecture Guide: Zustand & Phaser
## Core Principles
- **Global Game State**: Held in Zustand (turns, players, board)
- **Rendering State**: Managed by Phaser (rendering, physics, frame-by-frame updates)
- **Connection Strategy**: Connect Zustand and Phaser efficiently (use Zustand at turn changes, not per-frame updates)
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
- **Units**: Player-controlled entities that can move and interact
- **Biomes**: Primary territorial units that have:
  - A unique ID and visual color
  - Lushness value determining resource regeneration rates
  - Ownership by players
  - Production rates for eggs
  - An embedded habitat structure
- **Habitats**: Structures embedded within biomes, defining:
  - A specific location on the map
  - A focal point for biome activities
  - Spawn points for new units

## Architecture Principles and Patterns
Our core architectural pattern follows: **"Components trigger actions, actions modify state"**

This creates a unidirectional data flow where Phaser scenes never directly mutate the state. Instead, they trigger actions, which encapsulate state mutation logic in a centralized location.

1. **Biome-Centric Design**
   - ✅ DO: Treat biomes as the primary data structure
   - ✅ DO: Access habitats through their parent biome
   - ✅ DO: Generate resources within the context of biomes
   - ✅ DO: Use biomes for territorial ownership and egg production
   - ❌ DON'T: Access habitats directly from a separate collection
   - ❌ DON'T: Treat habitats as independent from biomes

2. **Rendering Responsibility**
   - ✅ DO: Use Phaser for game rendering and UI
   - ✅ DO: Keep rendering logic in appropriate components
   - ❌ DON'T: Mix rendering responsibilities across systems

3. **Subscription Model**
   - ✅ DO: Implement a proper Observer pattern for Phaser to subscribe to state changes
   - ✅ DO: Use StateObserver for efficient callbacks when state changes
   - ✅ DO: Ensure Phaser updates tiles only when needed, not every frame
   - ✅ DO: Configure subscriptions with custom equality checks when needed
   - ✅ DO: Use StateObserver with proper cleanup in scene lifecycle methods
   - ❌ DON'T: Poll state with getState() in Phaser scenes
   - ❌ DON'T: Re-render everything when only small parts of state change
   - ❌ DON'T: Create duplicate subscriptions for the same state data

4. **Unidirectional Data Flow**
   - ✅ DO: Phaser UI → triggers state changes through action functions
   - ✅ DO: Action functions → interact with Zustand using getState()/setState()
   - ✅ DO: Zustand → notifies subscribers of changes 
   - ✅ DO: Phaser → renders based on received state updates
   - ❌ DON'T: Allow Phaser to directly modify state
   - ❌ DON'T: Create circular data flows or bidirectional dependencies

5. **Event Delegation**
   - ✅ DO: Emit events from Phaser when user interacts with game objects
   - ✅ DO: Handle game input events in appropriate handler functions
   - ✅ DO: Update state through action functions
   - ❌ DON'T: Handle input events directly in Phaser scenes that modify state
   - ❌ DON'T: Mix event handling with rendering logic

6. **State Access Pattern**
   - ✅ DO: Use action functions for ALL state mutations
   - ✅ DO: Create action functions in a central location (actions.ts)
   - ❌ DON'T: Call getState() directly in Phaser scenes
   - ❌ DON'T: Perform state mutations directly in components

7. **Clear Separation of Concerns**
   - ✅ DO: Phaser: Rendering and input handling
   - ✅ DO: Zustand: State management only
   - ✅ DO: Actions: Centralized state access and modification
   - ❌ DON'T: Mix responsibilities across boundaries
   - ❌ DON'T: Allow implementation details to leak between layers 

## Why This Architecture Works

Our approach balances pragmatism with maintainability:

1. **Reading State**: We use the StateObserver to efficiently track state changes, providing a reactive programming model.

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

### FogOfWarRenderer

The FogOfWarRenderer manages the fog of war system that obscures unexplored areas of the map, enhancing gameplay through exploration mechanics.

#### Key Features

1. **Progressive Discovery**
   - Tiles start concealed under fog of war
   - Areas are revealed as units explore the map
   - Provides visual feedback through fade animations
   - Reveals biomes when habitats are improved

2. **Efficient Implementation**
   - Uses Phaser Graphics objects for diamond-shaped fog tiles
   - Manages visibility state with a tile coordinate tracking system
   - Provides batch reveal operations for multiple tiles at once
   - Supports callbacks for game state updates when visibility changes

3. **Visualization**
   - Renders fog at depth 5, above static objects but below units
   - Smooth fade-out transitions when revealing tiles
   - Can toggle fog of war system on/off
   - Maintains internal map of visible/fogged tiles

4. **API Highlights**
   - `revealTile(x, y)`: Reveals a single tile with animation
   - `revealTiles(tilesArray)`: Batch reveals multiple tiles efficiently
   - `isTileFogged(x, y)`: Checks if a specific tile is under fog
   - `setTileVisibilityCallback()`: Sets a callback for visibility changes

### ResourceRenderer

The ResourceRenderer visualizes resources like forests and kelp on the game board, providing visual representation for harvestable game elements.

#### Key Features

1. **Resource Visualization**
   - Renders different resource types with appropriate sprites
   - Positions resources correctly in the isometric view
   - Maintains proper depth ordering with other game elements
   - Supports multiple resource types (forest, kelp)

2. **Efficient State Management**
   - Uses optimized state diffing for updates
   - Only creates/updates sprites when resource data changes
   - Reuses existing sprites when possible
   - Properly cleans up removed resources

3. **Integration**
   - Resources are displayed on the static objects layer
   - Coordinates with other renderers for proper visual layering
   - Stores resource metadata on sprites for interaction

4. **API Highlights**
   - `renderResources(resources)`: Renders all resources based on the provided data
   - `addResource(resource)`: Adds a single resource sprite
   - `updateResource(resource)`: Updates an existing resource
   - `removeResource(resourceId)`: Removes a resource sprite 