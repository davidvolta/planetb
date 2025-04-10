# Development Checklist

## Upcoming Tasks
- [ ] Change tinting mechanism
- [ ] Hide selector when move is done
- [ ] Habitat bug (Improving habitat auto forces next turn!)
- [ ] Resource graphics
  - [ ] Test resource placement at 0,0 with tile.png asset
  - [ ] Disable fog of war temporarily for testing
  - [ ] Center camera on 0,0 for testing
  - [ ] Verify alignment with terrain
  - [ ] Implement ResourceRenderer
    - [ ] Create Resource data structure in gameStore
    - [ ] Add ResourceType enum (FOREST, KELP)
    - [ ] Set up resource generation during board initialization
    - [ ] Create ResourceRenderer class extending BaseRenderer
    - [ ] Implement forest on grass, kelp on water constraints
    - [ ] Ensure 80/20 distribution of resources to empty tiles
    - [ ] Prevent resources from appearing on habitats
    - [ ] Load resource assets (forest, kelp)
    - [ ] Add fog of war integration for resources
    - [ ] Add resources array to state subscriptions

- [ ] Create concept of biomes (do zones exist already?)
- [ ] Init map to create biomes, not just habitats
- [ ] Populate biomes with resources (kelp for water and underwater, trees for grass, )

- [ ] Get rid of react!