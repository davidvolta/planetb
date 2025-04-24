# Development Checklist

## Future Tasks
- [ ] Refactor unit movement/displacement into `UnitMovementController`
  - [ ] Create `UnitMovementController` with `moveUnit()` and `displaceUnit()` methods
  - [ ] Delegate BoardScene's `startUnitMovement` and `handleDisplacementEvent` to `UnitMovementController`
  - [ ] Move animation logic into `AnimationController`, focusing it solely on visuals
  - [ ] Extract displacement logic from `evolveAnimal()` into `UnitMovementController`
  - [ ] Integrate `UnitMovementController` into `TileInteractionController` for both AI and UI usage
  - [ ] Remove obsolete movement code from `BoardScene` after migration

- [ ] Refactor game init

- [ ] Convert to immer/immutable state instead of subscribers
  - [ ] First remove all subscribers. Especially UI BIOME!

- [ ] Change tinting mechanism
- [ ] Flip unit when moving

- [ ] Now its kind of boring that eggs appear in the same place always

- [ ] Style edges of owned biomes (flood fill with stroke)

- [ ] Refactor for GameController and lessen the load on Gamestore

- [ ] Implement a play function
  - [ ] Calls next turn (do we need to rebuild it for the play function?)
  - [ ] Similar to how the simulator does it. Let the game board run.
  - [ ] Speed function (1x, 2x, 5x)
  - [ ] Pause button 

