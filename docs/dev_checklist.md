# Development Checklist

## Ecosystem Integration Plan

### Phase 6: Implement Harvesting System
  - [ ] Harvest button that ONLY appears when a tile with resources is selected
  - [ ] Track totalHarvested when resources are harvested
  - [ ] Add end-of-harvest update lushness through new nonDepletedCount recalculation
  

- [ ] Implement the harvest logic in gameStore:
  - [ ] Update tile resource values based on the harvested amount
  - [ ] When resourceValue reaches 0, immediately set active=false (permanent conversion)
  - [ ] Update the biome's lushness based on the new tile state

- [ ] Implement resource regeneration based on biome lushness
  - [ ] Helper function for the polynomial resource generation formula with fixed coefficient values


### Phase 7: Refactor Simulator to Use Shared Code
- [ ] Update simulator.js to use the shared EcosystemUtils functions
- [ ] Ensure both the game and simulator use exactly the same calculation methods


---------------

## Future Tasks
- [ ] Change tinting mechanism
- [ ] Fix double clicking bug on spawn units
- [ ] Fix ineligble spawning moves on terrain
- [ ] Now its kind of boring that eggs appear in the same place always
- [ ] Fix Raley Font (lost during architecture update)
- [ ] Style edges of owned biomes (flood fill with stroke)
  - [ ] Refactor for GameController and lessen the load on BoardScene and Gamestore
