# Development Checklist


## The Great Animal/Egg Refactor
- [ ] Fix Rendering issue of it being offset vertically
- [ ] Create EggRenderer and move it out of animalrenderer
- [ ] Solve subscription problem of spawning eggs not immediately updating lushness (but having to wait until the next turn to do so)
- [ ] Fix TileInteractionController Case 5 DormantUnit Selction needs to be selectedEggID
- [ ] Refactor namespace to that Spawn = Evolve


1.  Game store selection logic  
    - File: `src/store/gameStore.ts`  
    - What to do: introduce a `selectedEggId` alongside (or in place of) `selectedUnitIsDormant`. Swap out every occurrence of `selectedUnitIsDormant` for a more explicit egg-ID check.

2.  Tile interaction controller  
    - File: `src/controllers/TileInteractionController.ts`  
    - What to do: Case 5 currently routes dormant-unit clicks. Refactor it to use your new `selectedEggId` and fire an “egg selected” action instead of treating it like a hidden animal state.

3.  Renderer split-out  
    - File: `src/renderers/AnimalRenderer.ts`  
    - What to do: carve out all the egg‐rendering logic into a new `EggRenderer`. This gives you a clear boundary—animals just render themselves; eggs live in their own renderer.

4.  Subscription manager  
    - File: `src/managers/StateSubscriptionManager.ts`  
    - What to do: you’ve already got an eggs subscription. Rename and tighten it to only deliver an `Egg[]` payload, and drop any DOM/data plumbing that still thinks eggs are “dormant animals.”

5.  UI scene tweaks  
    - File: `src/scene/UIScene.ts`  
    - What to do: switch your “eggCount” and “selectedIsDormant” labels/handlers over to use the new egg-centric store fields.

Once these smaller refactors are in place, you can progressively remove `AnimalState.DORMANT` from controllers such as `MovementController` and `AIController`, then revisit `GameController.evolve` to consume pure `Egg` objects instead of animal states.

Which of these would you like to tackle first? (I’ll walk you through the code edits step-by-step.)





## Future Tasks

- [ ] Change tinting mechanism to be clearer when unit can't move.
- [ ] Really fix the displacement issue
- [ ] Buffalo can harvest more

- [ ] Style edges of owned biomes (flood fill with stroke)
  - [ ] Determine graphical approach

- [ ] Rewrite TileInteractionController to fully route all click handling through the GameController facade

- [ ] Refactor namespace so that Unit = Animal
- Make Animals a Record, not an Array // Use the Animal Registry Approach to Sidechain it
- Make Biomes a Record, not a Map

- [ ] Combat
- [ ] Evolution
- [ ] LLM 


Bridge step towards refactoring Animals will be that I can do this because no DORMANT exists
export function getActiveAnimals(): Animal[] {
  return useGameStore.getState().animals.filter(a => a.state === AnimalState.ACTIVE);
}