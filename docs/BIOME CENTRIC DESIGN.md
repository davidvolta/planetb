### Phase 5: Refactor Initialization Logic
- [ ] Update `generateVoronoiBiomes` function:
  - [ ] Make it the primary mechanism for territory assignment
  - [ ] Remove the habitat-centric ID relationship (biomes should have their own IDs)
  - [ ] Simplify biome generation to be independent of habitats
- [ ] Modify habitat placement logic:
  - [ ] Place habitats within existing biomes rather than creating biomes from habitats
  - [ ] Update habitat-biome relationship to be parent-child (biome contains habitats)
  - [ ] Ensure habitats are properly positioned within their parent biome