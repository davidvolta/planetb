# Habitats Implementation

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
