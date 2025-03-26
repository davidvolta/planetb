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
- [ ] Implement habitat improvement
- [ ] Add player 1 to game board
- [ ] Add fog of war
- [ ] Move Unit range to a new kind of structure where each animal has its abilities stored


- ### Selection System Simplification Plan
  #### Phase 1: Cleanup Core Click Handling
  - [ ] Create a checkTileContents helper method:
    - [ ] Add method to check what entities exist at specific coordinates
    - [ ] Should return dormant units, active units, and habitats at the location
    - [ ] Test: Verify logging shows correct detection
  - [ ] Simplify setupClickEventDelegation:
    - [ ] Remove habitat click handling block (first condition)
    - [ ] Keep only the tile click handling (second condition)
    - [ ] Test: Ensure only tiles can be clicked

  #### Phase 2: Update Tile Click Handler
  - [ ] Update tile click handler logic:
    - [ ] Remove dormant unit special handling
    - [ ] When a tile is clicked, check for move mode or just show selection indicator
    - [ ] Test: Clicking on tiles should show selection indicator
  - [ ] Enhance the tile clicked event:
    - [ ] Update to include complete information about what's at the tile
    - [ ] Test: Log event data to verify complete information is being emitted

  #### Phase 3: Connect UIScene to New System
  - [ ] Update UIScene to handle tile clicks:
    - [ ] Add event listener for TILE_CLICKED in create()
    - [ ] Implement handleTileClicked method to process tile contents
    - [ ] Show spawn button when dormant unit is detected
    - [ ] Test: Clicking tile with egg should show spawn button
  - [ ] Cleanup UIScene event handling:
    - [ ] Ensure proper event listener cleanup in shutdown()
    - [ ] Test: No memory leaks or duplicate listeners

  #### Phase 4: Final Cleanup
  - [ ] Remove any remaining duplicate logic:
    - [ ] Check for redundant selection code
    - [ ] Ensure consistent state updates
    - [ ] Test: All selection paths work as expected
  - [ ] Polish selection indicator behavior:
    - [ ] Ensure it appears/disappears at appropriate times
    - [ ] Test: Selection indicator shows up correctly

- ### Technical Debt / Refactoring
- [ ] Refactor BoardScene (currently too large at 1400+ lines):
  - [ ] Create dedicated renderer classes:
    - [ ] TileRenderer: Handle tile creation and updates
    - [ ] AnimalRenderer: Manage animal sprite lifecycle
    - [ ] HabitatRenderer: Handle habitat visuals 
  - [ ] Extract input handling to InputManager class
  - [ ] Move coordinate conversion logic to CoordinateUtils
  - [ ] Create AnimationController for movement animations
  - [ ] Split layer management into LayerManager

- ### Performance optimizations
  - [ ] Add viewport culling to only render visible tiles
  - [ ] Tile Object Pooling
  - [ ] Implement texture-based rendering for terrain tiles
  - [ ] Create incremental updates to avoid full board recreation
  - [ ] Optimize event listeners with event delegation

