# Development Checklist

## Ecosystem Integration Plan

###PHASE 1
- [ ] Implement resource regeneration based on biome lushness
  - [ ] Helper function for the polynomial resource generation formula with fixed coefficient values
  - [ ] Update resourcevalues in all biomes based on the biomelushess at the start of  nextTurn() before eggs are produced.

###PHASE 2
- [ ] Implement a play function
  - [ ] Calls next turn (do we need to rebuild it for the play function?)
  - [ ] Similar to how the simulator does it. Let the game board run.
  - [ ] Speed function (1x, 2x, 5x)
  - [ ] Pause button 



---------------

## Future Tasks
- [ ] Refactor all unit movement/displacement. Put it all into a controller.
- [ ] Refactor game init
- [ ] Convery to immer/immutable state instead of subscribers
  - [ ] First remove all subscribers except UI. BIOME!
- [ ] Change tinting mechanism
- [ ] Fix ineligble spawning moves on terrain
- [ ] Now its kind of boring that eggs appear in the same place always
- [ ] Fix Raley Font (lost during architecture update)
- [ ] Style edges of owned biomes (flood fill with stroke)
- [ ] Refactor for GameController and lessen the load on Gamestore
