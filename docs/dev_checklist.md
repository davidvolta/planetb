# Development Checklist

## Project Context
- Project Name: Planet B
- Description: A unique turn-based 4x ecological strategy game that dispenses with traditional mechanics and power structures. Planet B models nature and population dynamics to create gameplay that asks the user to balance their growth and exploitation with the world's natural rates of production. 

## Environment Setup
- Node.js environment
- React + Vite
- TypeScript
- Zustand + immer for game state management
- Phaser as our game engine

## Current Focus:
- Focus on core game mechanics (movement, reproduction, interactions, state updates, etc.) client-side in a way that could later run on a server. 

## Upcoming Tasks
- [ ] Refactor BoardScene (currently too large at 1400+ lines):
  
  #### Phase 1: Preparation and Structure Setup
  - [ ] Create Folder Structure
    - [ ] Create `/src/scenes/board` directory for all extracted components
    - [ ] Create subdirectories: `/renderers`, `/managers`, `/utils`, `/interfaces`
  - [ ] Define Base Interfaces
    - [ ] Create `IRenderer.ts` in `/interfaces` with base renderer methods
    - [ ] Create `IManager.ts` in `/interfaces` with base lifecycle hooks
    - [ ] Define data transfer interfaces between components

  #### Phase 2: Extract Coordinate Utilities
  - [ ] Create CoordinateUtils Class
    - [ ] Create `CoordinateUtils.ts` in `/utils` directory
    - [ ] Identify all coordinate conversion methods in BoardScene
    - [ ] Extract isometric conversions (`gridToScreen`, `screenToGrid`, etc.)
    - [ ] Add documentation for each utility method
    - [ ] Update references in BoardScene to use the utility
  - [ ] Validate Coordinate System
    - [ ] Create tests or validation method to ensure conversions are correct
    - [ ] Verify extracted methods produce identical results to original

  #### Phase 3: Extract Layer Management
  - [ ] Create LayerManager Interface
    - [ ] Define interface with required methods for layer management
    - [ ] Specify methods for layer access, clearing, and depth management
  - [ ] Implement LayerManager
    - [ ] Extract layer initialization from BoardScene
    - [ ] Move all layer-related properties to the manager
    - [ ] Create accessor methods for each layer type
    - [ ] Add layer manipulation methods (clear, removeAll, etc.)
  - [ ] Integrate LayerManager with BoardScene
    - [ ] Initialize LayerManager in BoardScene constructor
    - [ ] Replace direct layer access with manager methods
    - [ ] Update BoardScene to delegate layer management

  #### Phase 4: Extract Renderers (One at a time)
  - [ ] Create TileRenderer
    - [ ] Define ITileRenderer interface in `/interfaces`
    - [ ] Create TileRenderer class in `/renderers`
    - [ ] Extract tile creation logic from BoardScene
    - [ ] Extract terrain tile rendering methods
    - [ ] Implement render and update methods
    - [ ] Refactor BoardScene to use TileRenderer
  - [ ] Create SelectionRenderer
    - [ ] Define ISelectionRenderer interface
    - [ ] Create SelectionRenderer class
    - [ ] Extract selection indicator methods
    - [ ] Extract hover state management
    - [ ] Move indicator creation and update logic
    - [ ] Refactor BoardScene to use SelectionRenderer
  - [ ] Create MoveRangeRenderer
    - [ ] Define IMoveRangeRenderer interface
    - [ ] Create MoveRangeRenderer class
    - [ ] Extract move range highlight methods
    - [ ] Extract methods for creating and clearing highlights
    - [ ] Refactor BoardScene to use MoveRangeRenderer
  - [ ] Create HabitatRenderer
    - [ ] Define IHabitatRenderer interface
    - [ ] Create HabitatRenderer class
    - [ ] Extract habitat graphics creation
    - [ ] Extract habitat rendering and update methods
    - [ ] Refactor BoardScene to use HabitatRenderer
  - [ ] Create AnimalRenderer
    - [ ] Define IAnimalRenderer interface
    - [ ] Create AnimalRenderer class
    - [ ] Extract animal sprite creation and management
    - [ ] Extract sprite positioning and state logic
    - [ ] Extract animal depth calculation methods
    - [ ] Refactor BoardScene to use AnimalRenderer

  #### Phase 5: Extract Managers and Controllers
  - [ ] Create InputManager
    - [ ] Define IInputManager interface
    - [ ] Create InputManager class
    - [ ] Extract click event delegation
    - [ ] Extract input event handlers
    - [ ] Extract keyboard controls setup
    - [ ] Refactor BoardScene to use InputManager
  - [ ] Create AnimationController
    - [ ] Define IAnimationController interface
    - [ ] Create AnimationController class
    - [ ] Extract animation state management
    - [ ] Extract unit movement animation
    - [ ] Extract unit displacement logic
    - [ ] Extract tweening and animation completion handlers
    - [ ] Refactor BoardScene to use AnimationController
  - [ ] Create CameraManager
    - [ ] Define ICameraManager interface
    - [ ] Create CameraManager class
    - [ ] Extract camera setup and controls
    - [ ] Extract zoom and pan functionality
    - [ ] Refactor BoardScene to use CameraManager

  #### Phase 6: Refine State Management
  - [ ] Centralize State Subscription Logic
    - [ ] Create StateSubscriptionManager
    - [ ] Extract all subscription setup from BoardScene
    - [ ] Organize subscriptions by component
    - [ ] Ensure proper cleanup of subscriptions
  - [ ] Connect Components with State
    - [ ] Establish clear data flow between state and renderers
    - [ ] Update subscription handlers to dispatch to appropriate components
    - [ ] Ensure renderers only receive data they need to render

  #### Phase 7: Refactor BoardScene Core
  - [ ] Simplify BoardScene Lifecycle Methods
    - [ ] Refactor `init()` to delegate to managers
    - [ ] Refactor `create()` to initialize components
    - [ ] Refactor `update()` to delegate to managers
    - [ ] Remove redundant code and properties
  - [ ] Establish Component Lifecycle
    - [ ] Implement scene shutdown cleanup for all components
    - [ ] Ensure proper initialization order
    - [ ] Add resource cleanup to prevent memory leaks

  #### Phase 8: Testing and Validation
  - [ ] Verify Functionality
    - [ ] Test each extracted component independently
    - [ ] Validate game behavior is identical after refactoring
    - [ ] Check for visual regressions
  - [ ] Performance Optimization
    - [ ] Add viewport culling in TileRenderer
    - [ ] Implement object pooling for frequently created objects
    - [ ] Add incremental updates instead of full re-renders

  #### Phase 9: Documentation and Code Health
  - [ ] Add Documentation
    - [ ] Document component interactions
    - [ ] Add JSDoc comments to all public methods
    - [ ] Create architecture diagrams
  - [ ] Clean Up Technical Debt
    - [ ] Remove commented code and console logs
    - [ ] Ensure consistent naming conventions
    - [ ] Check for proper typing throughout the codebase

  - [ ] Create dedicated renderer classes:
    - [ ] TileRenderer: Handle tile creation and updates
    - [ ] AnimalRenderer: Manage animal sprite lifecycle
    - [ ] HabitatRenderer: Handle habitat visuals 
  - [ ] Extract input handling to InputManager class
  - [ ] Move coordinate conversion logic to CoordinateUtils
  - [ ] Create AnimationController for movement animations
  - [ ] Split layer management into LayerManager


- [ ] Add fog of war
- [ ] Move Unit range to a new kind of structure where each animal has its abilities stored
- [ ] Fix the habitat generation to actually be one zone apart
