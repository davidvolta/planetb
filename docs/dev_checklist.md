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

# Upcoming Tasks
  
## BoardScene Refactoring Plan

### Phase 1: Preparation and Structure Setup
- [x] Create Folder Structure
  - [x] Create `/src/scenes/board` directory for all extracted components
  - [x] Create subdirectories: `/renderers`, `/managers`, `/utils`
- [x] Define Component Contracts
  - [x] Document responsibilities and APIs for each planned component
  - [x] Establish naming conventions for methods and properties
- [x] Phase 1 Validation
  - [x] Verify project structure is set up correctly
  - [x] Ensure no code changes have been made yet that could affect functionality

### Phase 2: Extract Coordinate Utilities
- [x] Create CoordinateUtils Module
- [x] Create `CoordinateUtils.ts` in `/utils` directory
- [x] Identify all coordinate conversion methods in BoardScene
- [x] Extract isometric conversions (`gridToScreen`, `screenToGrid`, etc.)
- [x] Add documentation for each utility method
- [x] Update references in BoardScene to use the utility
- [x] Validate Coordinate System
- [x] Create validation method to ensure conversions are correct
- [x] Verify extracted methods produce identical results to original
- [x] Phase 2 Validation
  - [x] Test tile selection with coordinate utilities
  - [x] Verify unit positioning is correct
  - [x] Check that habitat placement is visually identical to before
  - [x] Ensure mouse interactions work correctly with grid/screen conversions

### Phase 3: Extract Layer Management
- [x] Create LayerManager Class
- [x] Extract layer initialization from BoardScene
- [x] Move all layer-related properties to the manager
- [x] Create accessor methods for each layer type
- [x] Add layer manipulation methods (clear, removeAll, etc.)
- [x] Integrate LayerManager with BoardScene
- [x] Initialize LayerManager in BoardScene constructor
- [x] Replace direct layer access with manager methods
- [x] Update BoardScene to delegate layer management
- [x] Phase 3 Validation
  - [x] Verify all layers are visible after refactoring
  - [x] Check z-ordering of game elements (tiles beneath units, etc.)
  - [x] Ensure layer clearing/resetting works during re-renders
  - [x] Test scene reinitialization to confirm layers set up correctly

### Phase 4: Extract Renderers (One at a time)
- [x] Create TileRenderer
  - [x] Create TileRenderer class in `/renderers`
  - [x] Extract tile creation logic from BoardScene
  - [x] Extract terrain tile rendering methods
  - [x] Implement render and update methods
  - [x] Refactor BoardScene to use TileRenderer
  - [x] Test TileRenderer
    - [x] Verify all terrain types render correctly
    - [x] Check board initialization creates correct tiles
    - [x] Ensure tile click interactions still work

- [x] Create SelectionRenderer
  - [x] Create SelectionRenderer class
  - [x] Extract selection indicator methods
  - [x] Extract hover state management
  - [x] Move indicator creation and update logic
  - [x] Refactor BoardScene to use SelectionRenderer
  - [x] Test SelectionRenderer
    - [x] Verify hover visual effects work correctly
    - [x] Check selection indicator appears on correct tiles
    - [x] Ensure selection state changes update visuals properly

- [x] Create MoveRangeRenderer
  - [x] Create MoveRangeRenderer class
  - [x] Extract move range highlight methods
  - [x] Extract methods for creating and clearing highlights
  - [x] Refactor BoardScene to use MoveRangeRenderer
  - [x] Test MoveRangeRenderer
    - [x] Verify move range highlights appear correctly
    - [x] Check that highlights clear when selection changes
    - [x] Ensure range is calculated and displayed accurately

- [x] Create HabitatRenderer
  - [x] Create HabitatRenderer class
  - [x] Extract habitat graphics creation
  - [x] Extract habitat rendering and update methods
  - [x] Refactor BoardScene to use HabitatRenderer
  - [x] Test HabitatRenderer
    - [x] Verify all habitat states render correctly 
    - [x] Check that habitat state changes update visuals
    - [x] Ensure habitat click interactions work properly

- [x] Create AnimalRenderer
  - [x] Create AnimalRenderer class
  - [x] Extract animal sprite creation and management
  - [x] Extract sprite positioning and state logic
  - [x] Extract animal depth calculation methods
  - [x] Refactor BoardScene to use AnimalRenderer
  - [x] Test AnimalRenderer
    - [x] Verify all animal types render correctly
    - [x] Check state changes (active/dormant) update visuals
    - [x] Ensure unit selection and movement work properly

- [x] Phase 4 Complete Validation
  - [x] Perform full game test with all renderers
  - [x] Verify end-to-end gameplay flows are intact
  - [x] Check for any visual regressions across all elements

### Phase 5: Extract Managers and Controllers
- [ ] Create InputManager
  - [ ] Create InputManager class
  - [ ] Extract click event delegation
  - [ ] Extract input event handlers
  - [ ] Extract keyboard controls setup
  - [ ] Refactor BoardScene to use InputManager
  - [ ] Test InputManager
    - [ ] Verify click interactions work for tiles and units
    - [ ] Check keyboard shortcuts function correctly
    - [ ] Ensure event propagation works as expected

- [ ] Create AnimationController
  - [ ] Create AnimationController class
  - [ ] Extract animation state management
  - [ ] Extract unit movement animation
  - [ ] Extract unit displacement logic
  - [ ] Extract tweening and animation completion handlers
  - [ ] Refactor BoardScene to use AnimationController
  - [ ] Test AnimationController
    - [ ] Verify unit movement animations play correctly
    - [ ] Check displacement animations display properly
    - [ ] Ensure animation states complete and trigger callbacks

- [ ] Create CameraManager
  - [ ] Create CameraManager class
  - [ ] Extract camera setup and controls
  - [ ] Extract zoom and pan functionality
  - [ ] Refactor BoardScene to use CameraManager
  - [ ] Test CameraManager
    - [ ] Verify camera panning works correctly
    - [ ] Check zooming functionality
    - [ ] Ensure camera bounds are properly maintained

- [ ] Phase 5 Complete Validation
  - [ ] Test all user interactions end-to-end
  - [ ] Verify animations and transitions are smooth
  - [ ] Check that camera controls work in all game states

### Phase 6: Refine State Management
- [ ] Centralize State Subscription Logic
  - [ ] Create StateSubscriptionManager
  - [ ] Extract all subscription setup from BoardScene
  - [ ] Organize subscriptions by component
  - [ ] Ensure proper cleanup of subscriptions
- [ ] Connect Components with State
  - [ ] Establish clear data flow between state and renderers
  - [ ] Update subscription handlers to dispatch to appropriate components
  - [ ] Ensure renderers only receive data they need to render
- [ ] Phase 6 Validation
  - [ ] Verify state changes trigger appropriate rendering
  - [ ] Test game state transitions (turn changes, etc.)
  - [ ] Ensure components receive only necessary updates
  - [ ] Check memory usage for subscription leaks

### Phase 7: Refactor BoardScene Core
- [ ] Simplify BoardScene Lifecycle Methods
  - [ ] Refactor `init()` to delegate to managers
  - [ ] Refactor `create()` to initialize components
  - [ ] Refactor `update()` to delegate to managers
  - [ ] Remove redundant code and properties
- [ ] Establish Component Lifecycle
  - [ ] Implement scene shutdown cleanup for all components
  - [ ] Ensure proper initialization order
  - [ ] Add resource cleanup to prevent memory leaks
- [ ] Phase 7 Validation
  - [ ] Test scene initialization and shutdown
  - [ ] Verify component initialization order works correctly
  - [ ] Check for memory leaks during scene transitions
  - [ ] Ensure all game features still function properly

### Phase 8: Performance Optimization
- [ ] Implement Viewport Culling
  - [ ] Add logic to only render visible tiles
  - [ ] Optimize off-screen object handling
- [ ] Implement Object Pooling
  - [ ] Create pools for frequently created objects
  - [ ] Update renderers to use object pools
- [ ] Add Incremental Updates
  - [ ] Implement delta updates instead of full re-renders
  - [ ] Optimize state subscription efficiency
- [ ] Phase 8 Validation
  - [ ] Measure and compare performance metrics
  - [ ] Test with large maps to verify scaling improvements
  - [ ] Ensure no visual glitches from optimizations
  - [ ] Verify game still runs smoothly on target hardware

### Phase 9: Documentation and Code Health
- [ ] Add Documentation
  - [ ] Document component interactions
  - [ ] Add JSDoc comments to all public methods
  - [ ] Create architecture diagrams
- [ ] Clean Up Technical Debt
  - [ ] Remove commented code and console logs
  - [ ] Ensure consistent naming conventions
  - [ ] Check for proper typing throughout the codebase
- [ ] Final Validation
  - [ ] Conduct comprehensive playtest of all game features
  - [ ] Verify code quality with static analysis tools
  - [ ] Ensure documentation is complete and accurate
  - [ ] Check performance across different devices/browsers

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
