# Habitats Implementation CURRENT FOCUS

## Overview
Habitats are the core production centers in Planet B. Unlike traditional strategy games where units are spawned from cities or bases, habitats produce eggs (dormant animals) that grow naturally in their surrounding areas.

## Production Mechanics

### Production Rate
- Each habitat has a production rate that determines how many eggs are created per turn
- Production is tied to the player who controls the habitat
- When a habitat is first created, it will immediately produce eggs based on its production rate

### Production Zone
- Eggs can only be placed in the 8 adjacent tiles surrounding a habitat
- This area represents the fertile zone where new life can develop
- Production is limited by available space in this zone

### Egg Placement Rules
- Eggs (dormant animals) can only be placed on tiles that don't already have eggs
- Eggs can coexist with active units on the same tile
- Eggs can be placed on any terrain type without restrictions
- When all 8 adjacent tiles already contain eggs, production will pause until spaces become available

### Turn Processing
- Each turn, habitats produce new eggs based on their production rate
- Eggs are placed randomly in valid adjacent tiles
- The game tracks when each habitat last produced eggs to ensure consistent production

### Egg Development
- Over time, eggs will hatch into active units
- The hatching process is separate from the production mechanics

## Strategic Considerations
- Controlling multiple habitats increases your total production capacity
- Keeping the area around habitats clear allows for continuous production
- Balancing egg production with hatching and unit movement creates a natural growth cycle


# Step-by-Step Implementation Guide: Habitat Production Feature

## 1. Replace "Resources" with "Production"

- Search the codebase for all instances of "resources"
- Remove or replace these references with the production concept
- Update any related variables, functions, or comments

## 2. Update Habitat Model

- Add a `productionRate` property to the Habitat interface (eggs produced per turn)
- Add a `lastProductionTurn` property to track when we last produced eggs

## 3. Define Habitat Zone Logic

- Create a function to identify the 8 adjacent tiles around a habitat
- This function will return all valid neighboring tiles where eggs can be placed

## 4. Implement Egg Placement Validation

- Create a validation function to check if a tile is suitable for egg placement
- Ensure tiles don't already have eggs or units on them
- Check for appropriate terrain types (no water, mountains, etc.)
- If all adjacent tiles already have eggs, production should stop

## 5. Initial Board Setup

- When initializing the board, identify each habitat
- For each habitat, find its valid zone tiles
- Place initial eggs based on the habitat's productionRate
- Use the existing createAnimal function with isDormant=true
- Set the lastProductionTurn to the current turn

## 6. Turn-Based Production Processing

- Create a function to run during each turn that processes production for all habitats
- For each habitat, calculate turns since last production
- Calculate eggs to create based on productionRate × turns passed
- Find valid zone tiles without existing eggs
- Place new eggs using the existing createAnimal function
- Update the lastProductionTurn to current turn

## 7. Integration with Turn System

- Add the production processing function to the main turn processing flow
- Ensure it's called at the appropriate time in the turn sequence

## 8. Testing

- Verify that eggs are correctly created during initialization
- Confirm that new eggs appear each turn based on productionRate
- Test that production stops when all zone tiles are filled
- Validate that eggs belong to the correct player based on habitat ownership



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
