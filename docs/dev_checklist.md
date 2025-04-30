# Development Checklist

## Next up: Add second player as AI
- [x] Define GameController facade with command methods (move, evolve, harvest, capture)
- [X] Add explicit state update for unit movement (actions.moveUnit) in GameController.moveUnit so the state change isn't buried in AnimationController
- [x] Refactor actions to enforce validation and return Promises for each command
- [x] Refactor UIScene to dispatch through GameController instead of raw actions
- [X] Create TurnController service to sequence human and AI turns
- [X] Refactor TurnController.handleHumanTurn to use an explicit end-turn API instead of the StateObserver hack
- [X] Extend AnimationController to expose completion hooks/promises for mastering timing
- [X] Build second player model

**AI Agent Implementation Steps:**
- [ ] Create `AIController` in `src/controllers/` to generate an array of commands for all eligible AI units (move/capture)
- [ ] Implement logic: for each unit, if on a capturable biome, emit a capture command; else, move as close as possible to the nearest capturable biome
- [ ] Integrate AIController with `TurnController.handleAITurn` to generate and execute commands in sequence, waiting for animations between each
- [ ] Ensure all AI commands use GameController methods for validation, animation, and state updates
- [ ] Test in-game: AI should visibly move/capture with all units, then end its turn and trigger camera pan
- [ ] Structure AIController for easy future extension (e.g., harvesting, evolving, prioritization)
- [ ] Update checklist and documentation after implementation

- [ ] Integrate AI agent into TurnController loop
- [ ] Validate end-to-end command execution pipeline


## Future Tasks

- [ ] Change tinting mechanism to be clearer when unit can't move.
- [ ] Really fix the displacement issue
- [ ] Buffalo can harvest more

- [ ] Style edges of owned biomes (flood fill with stroke)
  - [ ] Determine graphical approach

- [ ] Rewrite TileInteractionController to fully route all click handling through the GameController facade
