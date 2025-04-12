# Development Checklist

## Upcoming Tasks
- [ ] Change tinting mechanism
- [ ] Fix double clicking bug on spawn units
- [ ] Fix ineligble spawning moves on terrain
- [ ] Now its kind of boring that eggs appear in the same place always
- [ ] Fix Raley Font (lost during architecture update)

- [ ] Populate biomes with resources (remove random function)
    - [ ] Update resource generation to be biome-specific instead of random based on lushness quotient of 8.0
    - [ ] Phase 1: Biome-Specific Resource Distribution
        - [ ] Modify resource generation to work per-biome (maintain terrain-resource mapping)
        - [ ] Use 80% chance for eligible terrain tiles within each biome
        - [ ] Add biome ID to resource tracking
    - [ ] Phase 2: Visual Calibration of "Stable" Lushness
        - [ ] Add debug slider to adjust resource generation percentage
        - [ ] Turn off fog of war and enable biome visualization for testing
        - [ ] Add lushness property to biome objects (default 8.0, decimal precision)
        - [ ] Visually determine what "stable" 8.0 lushness looks like

- [ ] Style edges of owned biomes (flood fill with stroke)

- [ ] Implement harvesting
    - Selecting a resource tile (double click behavior for units/eggs)
    
- [ ] Implement energy counter (UI and gamestore)

- [ ] Refactor for GameController and lessen the load on BoardScene and Gamestore