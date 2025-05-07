# Development Checklist


## The Great Animal/Egg Refactor
- [ ] Fix Rendering issue of it being offset vertically
- [ ] Solve subscription problem of spawning eggs not immediately updating lushness (but having to wait until the next turn to do so)

### Phase Plan (incremental removal of AnimalState)
1. **Phase 1 – Data Dual-Wield**
   - Add `state.eggs` record & egg helpers (`getEggsAt`, etc.).
   - EcosystemController produces eggs into the new record **and** still creates `DORMANT` animals for backwards-compatibility.
   - StateSubscriptionManager + EggRenderer updated to read from the record.
   - No removals yet; game remains fully functional.

2. **Phase 2 – Selection & Hatching Shift**
   - TileInteractionController switches to egg helpers for selection/highlighting.
   - Evolve flow converts Egg → Animal (marks newborn `hasMoved = true`).
   - AIController gains egg-hatching logic.
   - Dormant-animal path present but considered deprecated.

3. **Phase 3 – Controller & Movement Cleanup**
   - MovementController, CameraManager, BoardScene, etc. stop checking `AnimalState`.
   - AnimalRenderer no longer special-cases dormant.
   - All egg filters rely solely on `state.eggs` helpers.

4. **Phase 4 – Purge Time**
   - Delete `AnimalState` enum and `state` property from `Animal` interface.
   - Remove all lingering imports / references.
   - Update GameInitializer seed data.

5. **Phase 5 – Docs & Polish**
   - Update architecture docs to reflect the new Egg entity.
   - Final lint, tests, and checklist tidy-up.


## FUTURE TASKS
- [ ] Change tinting mechanism to be clearer when unit can't move.
- [ ] Really fix the displacement issue
- [ ] Buffalo can harvest more

- [ ] Style edges of owned biomes (flood fill with stroke)
  - [ ] Determine graphical approach

- [ ] Rewrite TileInteractionController to fully route all click handling through the GameController facade

- [ ] Refactor namespace to that Spawn/hatch = Evolve

- [ ] Refactor namespace so that Unit = Animal
- Make Animals a Record, not an Array // Use the Animal Registry Approach to Sidechain it
- Make Biomes a Record, not a Map

- [ ] Combat
- [ ] Evolution
- [ ] LLM 