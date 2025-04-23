# Development Checklist

## Ecosystem Integration Plan

### Phase 6: Implement Harvesting System
- [ ] Implement resource regeneration based on biome lushness
  - [ ] When resourceValue reaches 0 do we immediately set active=false (permanent conversion)
  - [ ] Helper function for the polynomial resource generation formula with fixed coefficient values
  - [ ] Update resourcevalues in all biomes based on the biomelushess at the start of  nextTurn() before eggs are produced.


### Phase 7: Refactor Simulator to Use Shared Code
- [ ] Update simulator.js to use the shared EcosystemUtils functions
- [ ] Ensure both the game and simulator use exactly the same calculation methods


---------------

## Future Tasks
- [ ] Change tinting mechanism
- [ ] Fix ineligble spawning moves on terrain
- [ ] Now its kind of boring that eggs appear in the same place always
- [ ] Fix Raley Font (lost during architecture update)
- [ ] Style edges of owned biomes (flood fill with stroke)
  - [ ] Refactor for GameController and lessen the load on Gamestore
