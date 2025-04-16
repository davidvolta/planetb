# Development Checklist

## Upcoming Tasks
- [ ] Change tinting mechanism
- [ ] Fix double clicking bug on spawn units
- [ ] Fix ineligble spawning moves on terrain
- [ ] Now its kind of boring that eggs appear in the same place always
- [ ] Fix Raley Font (lost during architecture update)

### Phase 3: Full Lushness Ecosystem
1. Implement resource harvesting mechanics
   - Allow partial harvesting (0-10 scale per resource)
   - Calculate lushness impact based on harvesting amount
2. Create lushness-to-resource-generation formula
   - Non-linear relationship between lushness and regeneration
   - Faster recovery near stable point (7.5-8.0)
   - Slower recovery at extreme depletion (0.0-1.0)
   - Replace fixed 50% resource generation with dynamic lushness-based system
   - Map lushness 8.0 to approximately 50% resource density for consistent initial experience
3. Refactor egg production to respond to lushness
   - Replace hardcoded rate (1 egg/2 turns)
   - Link egg production rate to current lushness value
   - Implement "unspawned eggs increase lushness" mechanic
4. Implement Biome Resilience System
   - Add eggs as "ecological guardians" that protect biomes
   - Reduce harvesting impact based on egg count (3-5% reduction per egg)
   - Implement diminishing returns curve to prevent exploitation
   - Cap maximum reduction (50%) to ensure harvesting always has impact
   - Add visual feedback showing current resilience level
   - Track resilience property in biome statistics
   - Create meaningful strategic tradeoff between hatching eggs and maintaining resilience
5. Balance testing and tuning
   - Test recovery rates at different lushness values
   - Ensure strategic trade-offs for different playstyles
   - Validate ecological balance mechanics
   - Fine-tune the resilience curve and impact reduction values

- [ ] Style edges of owned biomes (flood fill with stroke)

- [ ] Implement harvesting
    - Selecting a resource tile (double click behavior for units/eggs)
    
- [ ] Implement energy counter (UI and gamestore)

- [ ] Refactor for GameController and lessen the load on BoardScene and Gamestore


