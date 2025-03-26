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

- [] Implement Dynamic Depth Unit Rendering
  ### Dynamic Depth Rendering Plan

  #### Phase 1: Create Depth Management Utility
  - [ ] Add a depth calculation function:
    - [ ] Create method to calculate unit depth based on Y-position and state
    - [ ] Use unitsLayer's base depth (5) as starting point 
    - [ ] Apply Y-coordinate fraction (gridY/1000) for isometric perspective
    - [ ] Add small offset for active units to appear above eggs
    - [ ] Test: Log calculated depths for different positions/states

  #### Phase 2: Apply Depth Calculation to Unit Rendering
  - [ ] Update existing sprites depth:
    - [ ] Apply depth calculation when updating sprite properties
    - [ ] Ensure active units get higher depth than eggs at same position
    - [ ] Test: Visual check that existing units are ordered correctly
  - [ ] Apply to new sprites:
    - [ ] Set calculated depth when creating new unit sprites
    - [ ] Maintain consistency between new and updated sprites
    - [ ] Test: New units should have proper rendering order immediately

  #### Phase 3: Update Depth During Movement
  - [ ] Update depth during movement animation:
    - [ ] Recalculate depth as unit Y-position changes during movement
    - [ ] Apply dynamic depth updates during animation tweens
    - [ ] Test: Units maintain correct rendering order during movement
  - [ ] Update depth after movement completes:
    - [ ] Set final depth value when unit reaches destination
    - [ ] Test: Units have correct depth at final position

  #### Phase 4: Handle Egg Production
  - [ ] Ensure new eggs have correct depth:
    - [ ] Apply depth calculation to newly produced eggs
    - [ ] Test: New eggs should appear behind existing units on same tile
    - [ ] Verify eggs maintain proper isometric perspective relative to units on other tiles

  #### Phase 5: Testing and Validation
  - [ ] Create visual test scenarios:
    - [ ] Test with various unit arrangements and movement patterns
    - [ ] Verify correct rendering when units and eggs overlap
    - [ ] Ensure isometric perspective is maintained correctly
    - [ ] Check for any edge cases or visual glitches

- [] Egg Hatching and Unit Displacement
  ### Unit Spawning & Displacement Implementation Plan

  #### Phase 4: Displacement Mechanics
  - [ ] Add displacement logic when a unit spawns underneath an active unit:
    - [ ] Check if active unit exists at spawn location
    - [ ] Determine displacement direction based on unit's move status:
      - [ ] If unit has already moved: attempt to continue in previous direction
        - [ ] Validate displacement location is valid
        - [ ] Fall back to adjacent tile if invalid
      - [ ] If unit has not moved: choose random valid adjacent tile
        - [ ] Ensure displaced unit remains in "not moved" state
  - [ ] Implement visual feedback for displacement

  #### Phase 5: Bug Fix for Dormant Unit Preservation
  - [ ] Identify where eggs are being removed when active units move onto them
  - [ ] Modify movement logic to allow active units to coexist with dormant units
  - [ ] Ensure dormant units remain in game state when active units occupy same tile
  - [ ] Add visual indication that both units occupy same tile

  #### Testing Scenarios
  - [ ] Test displacement in various scenarios
  - [ ] Test units can move onto eggs without destroying them

  #### Edge Cases to Handle
  - [ ] No valid displacement location available
  - [ ] Multiple units needing displacement simultaneously
  - [ ] Displacement chain reactions
  - [ ] UI state when selecting units at different stages
  - [ ] Interaction with other game mechanics

- [] Fix Rendering order of initial/produced eggs so its south to north
- [ ] Implement habitat improvement
- [ ] Add player 1 to game board
- [ ] Add fog of war

- [ ] Move Unit range to a new kind of structure where each animal has its abilities stored

- [] Simplify Selection System Implementation
  ### Selection System Simplification Plan

  #### Phase 1: Remove Interactivity from Eggs and Habitats
  - [ ] Modify renderAnimalSprites method:
    - [ ] Update to explicitly disable interactivity for dormant units (eggs)
    - [ ] Test: Eggs should no longer respond to clicks
  - [ ] Update createHabitatGraphic method:
    - [ ] Remove the setInteractive() code for habitat containers
    - [ ] Test: Habitats should no longer respond to clicks

  #### Phase 2: Cleanup Core Click Handling
  - [ ] Create a checkTileContents helper method:
    - [ ] Add method to check what entities exist at specific coordinates
    - [ ] Should return dormant units, active units, and habitats at the location
    - [ ] Test: Verify logging shows correct detection
  - [ ] Simplify setupClickEventDelegation:
    - [ ] Remove habitat click handling block (first condition)
    - [ ] Remove unit click handling block (second condition)
    - [ ] Keep only the tile click handling (third condition)
    - [ ] Test: Ensure only tiles can be clicked

  #### Phase 3: Update Tile Click Handler
  - [ ] Update tile click handler logic:
    - [ ] Remove dormant unit special handling
    - [ ] When a tile is clicked, check for move mode or just show selection indicator
    - [ ] Test: Clicking on tiles should show selection indicator
  - [ ] Enhance the tile clicked event:
    - [ ] Update to include complete information about what's at the tile
    - [ ] Test: Log event data to verify complete information is being emitted

  #### Phase 4: Connect UIScene to New System
  - [ ] Update UIScene to handle tile clicks:
    - [ ] Add event listener for TILE_CLICKED in create()
    - [ ] Implement handleTileClicked method to process tile contents
    - [ ] Show spawn button when dormant unit is detected
    - [ ] Test: Clicking tile with egg should show spawn button
  - [ ] Cleanup UIScene event handling:
    - [ ] Ensure proper event listener cleanup in shutdown()
    - [ ] Test: No memory leaks or duplicate listeners

  #### Phase 5: Active Unit Handling
  - [ ] Refine active unit click handling:
    - [ ] Keep click interactivity only for unmoved active units
    - [ ] Ensure click handler directly selects the unit
    - [ ] Test: Active units still selectable, moved units not selectable
  - [ ] Connect active unit selection to UI:
    - [ ] Ensure UIScene updates based on unit selection
    - [ ] Test: Unit selection should update UI appropriately

  #### Phase 6: Final Cleanup
  - [ ] Remove any remaining duplicate logic:
    - [ ] Check for redundant selection code
    - [ ] Ensure consistent state updates
    - [ ] Test: All selection paths work as expected
  - [ ] Polish selection indicator behavior:
    - [ ] Ensure it appears/disappears at appropriate times
    - [ ] Test: Selection indicator shows up correctly

## Technical Debt / Refactoring
- [ ] Refactor BoardScene (currently too large at 1400+ lines):
  - [ ] Create dedicated renderer classes:
    - [ ] TileRenderer: Handle tile creation and updates
    - [ ] AnimalRenderer: Manage animal sprite lifecycle
    - [ ] HabitatRenderer: Handle habitat visuals 
  - [ ] Extract input handling to InputManager class
  - [ ] Move coordinate conversion logic to CoordinateUtils
  - [ ] Create AnimationController for movement animations
  - [ ] Split layer management into LayerManager

- [ ] Performance optimizations
  - [ ] Add viewport culling to only render visible tiles
  - [ ] Tile Object Pooling
  - [ ] Implement texture-based rendering for terrain tiles
  - [ ] Create incremental updates to avoid full board recreation
  - [ ] Optimize event listeners with event delegation

