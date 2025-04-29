# Development Checklist

## Next up: Add second player as AI
- [x] Define GameController facade with command methods (move, evolve, harvest, capture)
- [X] Add explicit state update for unit movement (actions.moveUnit) in GameController.moveUnit so the state change isn't buried in AnimationController
- [x] Refactor actions to enforce validation and return Promises for each command
- [x] Refactor UIScene to dispatch through GameController instead of raw actions
- [X] Create TurnController service to sequence human and AI turns
- [X] Refactor TurnController.handleHumanTurn to use an explicit end-turn API instead of the StateObserver hack
- [ ] Extend AnimationController to expose completion hooks/promises for mastering timing
- [X] Build second player model
- [ ] Build a basic AI agent that emits JSON commands (unit, action, target)
- [ ] Integrate AI agent into TurnController loop
- [ ] Validate end-to-end command execution pipeline

## Visibility & Fog of War Refactor

Phase 1: Lift FOW state into the store
- [ ] Add new actions in s`src/store/actions.ts`:
  - `revealPlayerTiles(playerId: number, coords: { x: number; y: number }[])`
  - `clearPlayerVisible(playerId: number)`
- [ ] Add corresponding setters in `gameStore.ts`, populating each `Player`'s `visibleTiles` and `exploredTiles` sets
- [ ] Update `addPlayer` and `initializeBoard` to initialize and seed these sets for each player's starting regions

Phase 2: Build the `VisibilityManager` service
- [ ] Create `src/managers/VisibilityManager.ts` that:
  - Subscribes to `activePlayerId` changes via the store or `StateObserver`
  - Calls `clearPlayerVisible` then `revealPlayerTiles` based on unit positions, habitats, etc.
  - Uses public getters on `BoardScene` to update tile and unit sprite visibility/alpha
- [ ] Expose necessary public APIs on `BoardScene` (e.g. `getTileSprite(x, y)`, `getUnitSpriteById(id)`, `setTileVisibility`, etc.)
- [ ] Remove residual fog logic from `FogOfWarRenderer` and related renderers

Phase 3: Wire in visibility updates
- [ ] Hook `VisibilityManager.updateVisibilityForPlayer(activePlayerId)` into key events:
  - End of turn (after `nextTurn()` completes in UI)
  - Unit movement and displacement completions
  - Biome capture (`captureBiome`)
  - Egg spawning (`evolveAnimal` + `recordSpawnEvent`)
- [ ] Adjust input handlers and controllers to only allow interactions on tiles in the `visibleTiles` set
- [ ] Migrate or remove legacy per-tile `visible` and `explored` fields in the store and renderers
- [ ] Write unit and integration tests for `VisibilityManager` covering edge cases (reveal, hide, exploration persistence, multi-player scenarios)

## Future Tasks

- [ ] Change tinting mechanism to be clearer when unit can't move.

- [ ] Style edges of owned biomes (flood fill with stroke)
  - [ ] Determine graphical approach

- [ ] Rewrite TileInteractionController to fully route all click handling through the GameController facade
