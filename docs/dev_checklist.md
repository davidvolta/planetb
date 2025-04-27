# Development Checklist

## Next up: Add second player as AI
- [x] Define GameController facade with command methods (move, evolve, harvest, capture)
- [ ] Add explicit state update for unit movement (actions.moveUnit) in GameController.moveUnit so the state change isn't buried in AnimationController
- [x] Refactor actions to enforce validation and return Promises for each command
- [x] Refactor UIScene to dispatch through GameController instead of raw actions
- [X] Create TurnController service to sequence human and AI turns
- [X] Refactor TurnController.handleHumanTurn to use an explicit end-turn API instead of the StateObserver hack
- [ ] Extend AnimationController to expose completion hooks/promises for mastering timing
- [ ] Build second player model
- [ ] Write headless unit tests for GameController command methods
- [ ] Build a basic AI agent that emits JSON commands (unit, action, target)
- [ ] Integrate AI agent into TurnController loop
- [ ] Validate end-to-end command execution pipeline

## Future Tasks

- [ ] Change tinting mechanism to be clearer when unit can't move.

- [ ] Style edges of owned biomes (flood fill with stroke)
  - [ ] Determine graphical approach

- [ ] Rewrite TileInteractionController to fully route all click handling through the GameController facade
