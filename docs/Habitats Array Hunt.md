Habitats Array Hunt

We're still using the `habitats` array instead of accessing habitats directly from biomes:

1. **In gameStore.ts**:
   - Line 843: `const habitat = state.habitats.find(h => h.id === id);` in the `selectHabitat` function

2. **In BoardScene.ts**:
   - Line 385: `const clickedHabitat = contents.habitats[0];` when handling tile clicks
   - Line 318-319: `const hasImprovedHabitat = contents.habitats.some(habitat => {...});` 
   - Line 356: `const hasHabitat = contents.habitats.length > 0;` for checking if a tile has a habitat

3. **In HabitatRenderer.ts**:
   - In the `renderHabitats` method which accepts an array of habitats

4. **In StateSubscriptionManager.ts**:
   - Line 351-353: `const allHabitats = Array.from(state.biomes.values()).map((biome: Biome) => biome.habitat);` - This is already getting habitats from biomes but it's creating an array instead of working with biomes directly

5. **In any place that calls `actions.selectHabitat()`**:
   - InputManager.ts
   - BoardScene.ts
   - UIScene.ts