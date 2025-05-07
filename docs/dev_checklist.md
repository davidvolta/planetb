# Development Checklist


## The Great Animal/Egg Refactor
- [ ] Fix Rendering issue of it being offset vertically
- [ ] Create EggRenderer and move it out of animalrenderer
- [ ] Solve subscription problem of spawning eggs not immediately updating lushness (but having to wait until the next turn to do so)
- [ ] Fix TileInteractionController Case 5 DormantUnit Selction needs to be selectedEggID
- [ ] Refactor namespace to that Spawn = Evolve

- [ ] Remove SelectedUnitIsDormant
- [ ] Actually generate animals when spawning units

- [ ] Replace all `AnimalState.DORMANT` checks with egg lookups; swap `selectedUnitIsDormant` for `selectedEggId`; update renderers, controllers, UI, and subscriptions.
- [ ] Remove `AnimalState` enum and `state` field.

- Make Animals a Record, not an Array // Use the Animal Registry Approach to Sidechain it
- Make Biomes a Record, not a Map




## Future Tasks

- [ ] Change tinting mechanism to be clearer when unit can't move.
- [ ] Really fix the displacement issue
- [ ] Buffalo can harvest more

- [ ] Style edges of owned biomes (flood fill with stroke)
  - [ ] Determine graphical approach

- [ ] Rewrite TileInteractionController to fully route all click handling through the GameController facade

- [ ] Refactor namespace so that Unit = Animal

- [ ] Combat
- [ ] Evolution
- [ ] LLM 


Bridge step towards refactoring Animals will be that I can do this because no DORMANT exists
export function getActiveAnimals(): Animal[] {
  return useGameStore.getState().animals.filter(a => a.state === AnimalState.ACTIVE);
}