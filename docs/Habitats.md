# Habitats Implementation CURRENT FOCUS


## Non-Overlapping Habitat Zones Implementation Plan

### Concept
Each habitat has a "zone" consisting of its location and the 8 adjacent tiles (including diagonals). No habitat zones can overlap, and we want to maintain one habitat per terrain type.

### Step-by-Step Implementation

#### 1. Create Habitat Zone Utility Functions
- Define `isInAnyZone(x, y, zonedTiles)` function to check if a position falls within any habitat's zone
- Define `markZone(x, y, zonedTiles)` function to mark a habitat's zone (its position + 8 adjacent tiles)

#### 2. Set Up the Ordered Terrain Processing
- Create an ordered array of terrain types: `[TerrainType.BEACH, TerrainType.GRASS, TerrainType.MOUNTAIN, TerrainType.WATER, TerrainType.UNDERWATER]`
- This enforces the "in from beaches" and "out from beaches" habitat placement pattern

#### 3. Implement the Non-Overlapping Algorithm
- Initialize an empty Set to track all zoned tiles: `const zonedTiles = new Set<string>()`
- For each terrain type in the ordered array:
  1. Find all tiles of this terrain type
  2. Filter out tiles that are in any habitat's zone
  3. If valid tiles remain, randomly select one
  4. Create a habitat at the selected position
  5. Mark the habitat's zone in the `zonedTiles` Set
  6. Continue to the next terrain type

#### 4. Update the Store's initializeBoard Method
- Modify the existing habitat generation code to use our new algorithm
- Replace the current terrain iteration with our ordered processing
- Implement the zone checking and marking logic

#### 5. Integration
- Ensure the updated algorithm still works with the `forceHabitatGeneration` parameter
- Make sure habitats are still rendered correctly on the board

#### 6. Testing
- Test with new map generation to verify that:
  - Habitats are placed on correct terrain types
  - No habitat zones overlap
  - The terrain processing order is maintained


# NOT THE CURRENT FOCUS: DO NOT CODE BELOW HERE

## Zustand State Implementation Approach


1. **Resource Generation**: Add a method to update habitat resources during turn changes:
   ```typescript
   nextTurn: () => set((state) => {
     // Update habitat resources
     const updatedHabitats = state.habitats.map(habitat => {
       if (habitat.state === HabitatState.SHELTER) {
         return {
           ...habitat,
           resources: habitat.resources + getResourceRate(habitat.shelterType)
         };
       }
       return habitat;
     });
     
     return { 
       turn: state.turn + 1,
       habitats: updatedHabitats
     };
   }),
   ```
