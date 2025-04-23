# Development Checklist

## Ecosystem Integration Plan

### Phase 6: Implement Harvesting System
  - [ ] Track totalHarvested when resources are harvested

- [ ] Implement resource regeneration based on biome lushness
  - [ ] When resourceValue reaches 0 do we immediately set active=false (permanent conversion)
  - [ ] Helper function for the polynomial resource generation formula with fixed coefficient values
  - [ ] Update resourcevalues in all biomes based on the biomelushess at the start of  nextTurn() before eggs are produced.


### Phase 7: Refactor Simulator to Use Shared Code
- [ ] Update simulator.js to use the shared EcosystemUtils functions
- [ ] Ensure both the game and simulator use exactly the same calculation methods


### Phase 8: Tile Interaction Refactor Plan
- [x] Create `src/controllers/TileInteractionController.ts` with `handleClick(x, y)` and per-tile `toggleState`:
- [x] Import and instantiate `TileInteractionController` in `BoardScene.ts` constructor.
- [x] Remove legacy `handleTileClick` method and all related click logic from `BoardScene.ts`.
- [x] In `BoardScene.setupInputHandlers()`, replace `onTileClick` callback with `tileInteractionController.handleClick(gridX, gridY)`.
- [x] Remove `InputManager.onPointerMove` handler registration; keep hover logic only in `BoardScene.update()` via `selectionRenderer.updateFromPointer()`.
- [ ] Ensure `TileRenderer` attaches `gridX`/`gridY` data to each Phaser tile gameObject.
- [ ] Delete obsolete controllers: `src/controllers/ToggleSelectionController.ts` and update `controllers/index.ts` exports.
- [ ] Test click scenarios:
  - Moving units on valid targets
  - Selecting active vs. dormant units
  - Clicking unowned habitats
  - Clicking resources in owned biomes
  - Blank tile clear action
  - Repeated clicks cycle through handlers
- [ ] Verify UI panel button visibility updates correctly after each selection type.
- [ ] Update `docs/app_guide.md` to describe the new controller-based click/hover workflow.
- [ ] Plan removal of thin grey hover indicator code in `SelectionRenderer` as a follow-up task.


---------------

## Future Tasks
- [ ] Change tinting mechanism
- [ ] Fix double clicking bug on spawn units
- [ ] Fix ineligble spawning moves on terrain
- [ ] Now its kind of boring that eggs appear in the same place always
- [ ] Fix Raley Font (lost during architecture update)
- [ ] Style edges of owned biomes (flood fill with stroke)
  - [ ] Refactor for GameController and lessen the load on BoardScene and Gamestore
