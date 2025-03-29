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
- [ ] Add player 1 to game board on beach with habitat already under player control
  - Detailed Development Plan:
    - [ ] Step 1: Modify Animal Interface
      - Add `ownerId` property to the `Animal` interface in `gameStore.ts`
      - Make it `number | null` to match the habitat ownership model
    
    - [ ] Step 2: Implement Player Creation in Board Initialization
      - Update the `initializeBoard` implementation to check if `players.length === 0`
      - If no players exist, automatically create a default player
      - Use existing `addPlayer` function with default name/color values
      - Store the player ID for habitat and unit ownership
    
    - [ ] Step 3: Modify Beach Habitat State
      - In the habitat generation section:
        - When a beach habitat is created (no need to change terrain selection logic)
        - If it's during initial board setup (`!state.isInitialized`) and we have a player:
          - Set state to `HabitatState.IMPROVED` instead of `POTENTIAL`
          - Set `shelterType` to `ShelterType.TIDEPOOL`
          - Set `ownerId` to the player's ID
    
    - [ ] Step 4: Update Existing Unit Creation
      - After the animal is created during initialization (no need to create a new one):
        - Find the dormant unit near the beach habitat
        - Update its state to `AnimalState.ACTIVE`
        - Set the unit's `ownerId` to the player's ID
    
    - [ ] Step 5: Update UI Components (if needed)
      - Update any UI components to reflect player ownership on units and habitats
      - Ensure proper visual cues for player-owned units and habitats
    
    - [ ] Step 6: Testing
      - Test the initialization to verify:
        - Player is created automatically on first game launch
        - Beach habitat is improved and owned by the player
        - The existing unit is activated and owned by the player
        - The unit is properly associated with the player

- [ ] Add fog of war
- [ ] Move Unit range to a new kind of structure where each animal has its abilities stored
- [ ] Fix the habitat generation to actually be one zone apart

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

