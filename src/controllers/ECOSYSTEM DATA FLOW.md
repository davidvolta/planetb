ECOSYSTEM DATA FLOW

FOR BIOME-UI VALUES

1. **Data Storage**: Biome data is stored in the `biomes` Map within the game state, which includes properties like:
   - `baseLushness`: Calculated from the health of resources in the biome
   - `lushnessBoost`: Derived from egg placement
   - `totalLushness`: The sum of base lushness and boost
   - `initialResourceCount`: Total resources when the biome was created
   - `nonDepletedCount`: Current active resources
   - `eggCount`: Number of eggs in the biome
   - `totalHarvested`: Resources harvested from the biome

2. **Value Calculation**: 
   - `EcosystemController.calculateBiomeLushness()` computes biome lushness values based on resource health
   - This is called from the `calculateBiomeLushness()` action function in actions.ts
   - These calculations account for resource depletion, harvesting, and egg placement

3. **UI Display**:
   - The `UIScene.ts` handles displaying biome information through a biome info panel
   - The UI subscribes to state changes using `StateObserver.subscribe('ui-biome-info')`
   - When a biome is selected, the observer calls `updateBiomeInfoPanel(biome)` which refreshes all text fields with current values

4. **Value Updates**:
   - Lushness updates occur through `updateBiomeLushness()` function, called during key game events:
     - After adding/removing eggs
     - When resources are harvested
     - At the end of each turn
   - The `nextTurn()` function calls `biomeEggProduction()` and `updateAllBiomesLushness()`
   - Resource depletion through harvesting triggers updates to `nonDepletedCount` and recalculates lushness
