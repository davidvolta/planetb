# Development Checklist

## Upcoming Tasks
- [ ] Change tinting mechanism
- [ ] Fix double clicking bug on spawn units
- [ ] Fix ineligble spawning moves on terrain
- [ ] Now its kind of boring that eggs appear in the same place always
- [ ] Fix Raley Font (lost during architecture update)

### Phase 3: Full Lushness Ecosystem
  
1. Refactor egg production to respond to lushness
   - Replace hardcoded rate (1 egg/2 turns)
   - Link egg production rate to current lushness value
   - Implement "unspawned eggs increase lushness" mechanic

2. Balance testing and tuning
   - Test recovery rates at different lushness values
   - Ensure strategic trade-offs for different playstyles
   - Validate ecological balance mechanics
   - Fine-tune the resilience curve and impact reduction values

3. Implement Lushness Boost from Eggs
   - [ ] Modify Biome Data Structure: Add lushnessBoost and baseLushness properties
   - [ ] Create Egg Percentage Calculation: Count ratio of eggs to blank tiles
   - [ ] Implement Diminishing Returns Boost Function: Convert egg % to boost (0-2.0)
   - [ ] Modify SimulateTurn: Calculate boost at end of turn for next turn
   - [ ] Update Resource Generation Logic: Use boosted lushness values
   - [ ] Update UI: Show base lushness and boost separately
   - [ ] Adapt MAX_LUSHNESS Usage: Change from hard cap to reference value
   - [ ] Testing: Verify edge cases and resource generation scaling
   - [ ] Ensure Compatibility: Design for easy portability to core game

- [ ] Style edges of owned biomes (flood fill with stroke)

- [ ] Implement harvesting
    - Selecting a resource tile (double click behavior for units/eggs)
     - Allow partial harvesting (0-10 scale per resource)
    
- [ ] Implement energy counter (UI and gamestore)

- [ ] Refactor for GameController and lessen the load on BoardScene and Gamestore


