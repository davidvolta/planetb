# Development Checklist

## Next up:
- [ ] Add second player as AI
- [ ] Define GameController facade with command methods (move, evolve, harvest, capture)
- [ ] Refactor actions to enforce validation and return Promises for each command
- [ ] Refactor UIScene to dispatch through GameController instead of raw actions
- [ ] Create TurnController service to sequence human and AI turns
- [ ] Extend AnimationController to expose completion hooks/promises for mastering timing
- [ ] Write headless unit tests for GameController command methods
- [ ] Build a basic AI agent that emits JSON commands (unit, action, target)
- [ ] Integrate AI agent into TurnController loop
- [ ] Validate end-to-end command execution pipeline

## Future Tasks

- [ ] Change tinting mechanism to be clearer when unit can't move.

- [ ] Style edges of owned biomes (flood fill with stroke)
  - [ ] Determine graphical approach
