# Development Checklist

## Future Tasks
- [ ] Refactor all unit movement/displacement. Put it all into a controller.
  - [ ] Fix ineligble spawning moves on terrain

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

