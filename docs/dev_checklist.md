# Development Checklist

## Ecosystem Integration Plan

### Phase 4:  Production with Biome-Based Ecosystem
- [ ] Eggs = lushnessboost

### Phase 6: Implement Harvesting System
- [ ] Create new action functions in actions.ts:
      - Selecting a tile with resources (double click behavior for units/eggs)
  - [ ] harvestTileResource(tileId, amount)
      - Allow partial harvesting (0-10 scale per tile's resource value)
  
- [ ] Add UI components for harvesting:
  - [ ] Harvest button that appears when a tile with resources is selected
  - [ ] Amount slider for selecting harvest amount (0-10 scale)
  - [ ] Implement energy counter (UI and gamestore)

- [ ] Track Resource Harvesting
  - [ ] Track totalHarvested when resources are harvested
  - [ ] Add end-of-turn nonDepletedCount recalculation
  

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
