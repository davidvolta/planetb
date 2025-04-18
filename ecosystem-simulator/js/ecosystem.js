// js/ecosystem.js

// Constants
export const MAX_LUSHNESS = 8.0;

export class EcosystemModel {
  constructor(params = {}) {
    // Default parameters
    this.params = {
      // Resource generation formula parameters (polynomial)
      resourceGeneration: {
        a: -0.0015,  // cubic term (reduced negative impact)
        b: 0.043,    // quadratic term (increased to boost mid-high ranges)
        c: 0.04,    // linear term (increased for overall boost)
        d: 0.1     // constant term (slightly increased baseline)
      },
      
      // Egg production parameters
      eggProduction: {
        initialCount: 0,
        turnInterval: 2 // Produce eggs every 2 turns
      },
      
      ...params
    };
  }
  
  // Calculate resource generation rate based on lushness
  calculateResourceGenerationRate(lushness) {
    const p = this.params.resourceGeneration;

    // Use the polynomial formula to calculate generation rate
    return Math.max(0, 
      p.a * Math.pow(lushness, 3) + 
      p.b * Math.pow(lushness, 2) + 
      p.c * lushness + 
      p.d
    );
  }
  
  // Find the leftmost blank tile in a biome
  findLeftmostBlankTile(biome) {
    for (let i = 0; i < biome.tiles.length; i++) {
      if (!biome.tiles[i].active && !biome.tiles[i].hasEgg) {
        return i;
      }
    }
    return -1; // No blank tiles available
  }
  
  // Produce eggs for a biome
  produceEggs(biome, turn) {
    // Only produce eggs every X turns (default: every 2 turns)
    if (turn % this.params.eggProduction.turnInterval !== 0) {
      return 0;
    }
    
    // Get total lushness (base + boost)
    const totalLushness = biome.lushness;
    
    // Only produce eggs if total lushness is 7.0 or above
    if (totalLushness < 7.0) {
      return 0;
    }
    
    // Find the leftmost blank tile
    const tileIndex = this.findLeftmostBlankTile(biome);
    
    // If no blank tile is available, don't produce an egg
    if (tileIndex === -1) {
      return 0;
    }
    
    // Place an egg on this tile
    biome.tiles[tileIndex].hasEgg = true;
    biome.eggCount += 1;
    
    return 1; // Return the number of eggs produced
  }
  
  // Simulate a single turn for a biome with controlled harvest rate
  simulateTurn(biome, harvestRate = 0) {
    // Calculate resource regeneration
    const generationRate = this.calculateResourceGenerationRate(biome.lushness);
    let regeneratedAmount = 0;
    
    const eligibleTiles = biome.tiles.filter(tile => 
      tile.active && tile.value > 0 && tile.value < 10
    );
    
    if (eligibleTiles.length > 0) {
      // Calculate total expected regeneration based on original formula
      const totalExpectedRegeneration = eligibleTiles.reduce((sum, tile) => {
        return sum + (generationRate * (1 - tile.value / 10));
      }, 0);
      
      // Assign random weights to each tile with resources
      const tilesWithWeights = eligibleTiles.map(tile => {
        // Random weight between 0.5 and 2.5 (significantly varied)
        const randomWeight = 0.5 + (Math.random() * 2.0);
        return { tile, randomWeight };
      });
      
      // Calculate total random weights
      const totalRandomWeight = tilesWithWeights.reduce((sum, item) => 
        sum + item.randomWeight, 0
      );
      
      // Distribute total regeneration based on random weights
      tilesWithWeights.forEach(item => {
        const { tile, randomWeight } = item;
        
        // Proportion of total regeneration for this tile's resource
        const regenerationProportion = randomWeight / totalRandomWeight;
        
        // Allocate regeneration amount proportionally
        const regenerationAmount = totalExpectedRegeneration * regenerationProportion;
        
        // Apply regeneration
        tile.value = Math.min(10, tile.value + regenerationAmount);
        regeneratedAmount += regenerationAmount;
      });
    }
    
    // Apply harvesting based on harvestRate (units per turn)
    let harvestedAmount = 0;
    if (harvestRate > 0) {
      harvestedAmount = this.harvestResources(biome, harvestRate);
      biome.totalHarvested += harvestedAmount;
    }
    
    // Recalculate base lushness based on new tile state
    biome.baseLushness = this.calculateBiomeLushness(biome);
    
    // Calculate lushness boost from eggs for next turn
    const eggPercentage = this.calculateEggPercentage(biome);
    biome.lushnessBoost = this.calculateLushnessBoost(eggPercentage);
    
    // Set total lushness (base + boost)
    biome.lushness = biome.baseLushness + biome.lushnessBoost;
    
    // NOW produce eggs based on total lushness AFTER all calculations
    const eggsProduced = this.produceEggs(biome, biome.history.length);
    
    // Track historical data
    biome.history.push({
      turn: biome.history.length,
      lushness: biome.lushness,
      baseLushness: biome.baseLushness,
      lushnessBoost: biome.lushnessBoost,
      resourceTotal: this.calculateTotalResourceValue(biome),
      harvestedAmount,
      regeneratedAmount,
      eggsProduced: eggsProduced,
      eggCount: biome.eggCount
    });
    
    return {
      generationRate,
      lushness: biome.lushness,
      baseLushness: biome.baseLushness,
      lushnessBoost: biome.lushnessBoost,
      resourceTotal: this.calculateTotalResourceValue(biome),
      harvestedAmount,
      regeneratedAmount,
      eggsProduced,
      eggCount: biome.eggCount
    };
  }
  
  // Harvest resources from a biome at specified rate
  harvestResources(biome, unitsPerTurn) {
    let amountHarvested = 0;
    let remainingToHarvest = unitsPerTurn;
    
    // Track biome's turn count for periodic behaviors
    biome.turnsCount++;
    
    // Get all active tiles with resources and their indices
    const activeTiles = biome.tiles
      .map((tile, index) => ({ tile, index }))
      .filter(item => item.tile.active);
    
    // FIRST PASS: Harvest resources with value > 1 down to 1 from right to left
    // Create a pool of tiles with resource value > 1
    let harvestPool = activeTiles
      .filter(item => item.tile.value > 1)
      .sort((a, b) => b.index - a.index); // Sort right to left (highest index first)
    
    // Calculate the maximum amount to harvest from any single resource in one selection
    // Use 20% of the resource's available value (down to 1) or 1 unit, whichever is higher
    const calculateMaxHarvestPerResource = (tile) => {
      const availableToHarvest = tile.value - 1; // Can only harvest down to 1
      return Math.max(1, Math.ceil(availableToHarvest * 0.2)); // At least 1 unit, at most 20% of available
    };
    
    // Iterate through resources from right to left, taking a limited amount from each
    for (let i = 0; i < harvestPool.length && remainingToHarvest > 0; i++) {
      const { tile } = harvestPool[i];
      
      // Calculate the maximum amount to harvest from this resource in this pass
      const maxHarvestFromResource = calculateMaxHarvestPerResource(tile);
      
      // Calculate how much we can safely harvest from this resource, limited by our max per-resource amount
      const harvestFromThis = Math.min(
        tile.value - 1,    // Don't go below 1
        maxHarvestFromResource, // Limit per selection
        remainingToHarvest     // Don't harvest more than requested
      );
      
      tile.value -= harvestFromThis;
      amountHarvested += harvestFromThis;
      remainingToHarvest -= harvestFromThis;
    }
    
    // SECOND PASS: Based on strategy, decide whether to harvest resources with value 1 down to 0
    
    // Strategy: Preservation (default)
    // Only harvest resources with value 1 if all resources are at value 1 or 0
    if (biome.harvestStrategy === "preservation" && remainingToHarvest > 0) {
      // Check if all active tiles with resources are at value 1 or 0
      const hasHigherValueResources = activeTiles.some(item => item.tile.value > 1);
      
      // If all active resources are at 1 or 0, we can start depleting them
      if (!hasHigherValueResources) {
        // Get tiles with resource value 1, sorted right to left
        const tilesAtValueOne = activeTiles
          .filter(item => item.tile.value === 1)
          .sort((a, b) => b.index - a.index); // Sort right to left
        
        // Calculate how many resources to deplete (limited to what's available)
        // For preservation, we'll deplete up to 25% of value-1 resources per turn
        const maxToDeplete = Math.min(
          Math.ceil(tilesAtValueOne.length * 0.25), // 25% of available resources
          remainingToHarvest // Can't deplete more than requested
        );
        
        // Deplete resources from right to left
        for (let i = 0; i < maxToDeplete && i < tilesAtValueOne.length; i++) {
          const { tile, index } = tilesAtValueOne[i];
          
          // Deplete this resource
          tile.value = 0;
          amountHarvested += 1;
          remainingToHarvest -= 1;
          
          // Convert depleted resource to blank tile
          tile.active = false;
        }
      }
    }
    // Strategy: Realistic
    else if (biome.harvestStrategy === "realistic" && remainingToHarvest > 0) {
      // With realistic strategy, we deplete tiles with value 1 gradually
      // but only if we've gone at least 3 turns without depleting any
      
      // We'll use a counter to track turns since last depletion
      
      // Every 3 turns, we'll allow some depletion
      if (biome.turnsCount % 3 === 0) {
        // Get tiles with resource value 1, sorted right to left
        const tilesAtValueOne = activeTiles
          .filter(item => item.tile.value === 1)
          .sort((a, b) => b.index - a.index); // Sort right to left
        
        // For realistic, we'll deplete up to 10% of value-1 resources per eligible turn
        const maxToDeplete = Math.min(
          Math.ceil(tilesAtValueOne.length * 0.1), // 10% of available resources
          remainingToHarvest // Can't deplete more than requested
        );
        
        // Deplete resources from right to left
        for (let i = 0; i < maxToDeplete && i < tilesAtValueOne.length; i++) {
          const { tile, index } = tilesAtValueOne[i];
          
          // Deplete this resource
          tile.value = 0;
          amountHarvested += 1;
          remainingToHarvest -= 1;
          
          // Convert depleted resource to blank tile
          tile.active = false;
        }
      }
    }
    // Strategy: Abusive
    else if (biome.harvestStrategy === "abusive" && remainingToHarvest > 0) {
      // Abusive strategy depletes tiles with value 1 aggressively
      const tilesAtValueOne = activeTiles
        .filter(item => item.tile.value === 1)
        .sort((a, b) => b.index - a.index); // Sort right to left
      
      // For abusive, we'll deplete up to 50% of value-1 resources per turn
      const maxToDeplete = Math.min(
        Math.ceil(tilesAtValueOne.length * 0.5), // 50% of available resources
        remainingToHarvest // Can't deplete more than requested
      );
      
      // Deplete resources from right to left
      for (let i = 0; i < maxToDeplete && i < tilesAtValueOne.length; i++) {
        const { tile, index } = tilesAtValueOne[i];
        
        // Deplete this resource
        tile.value = 0;
        amountHarvested += 1;
        remainingToHarvest -= 1;
        
        // Convert depleted resource to blank tile
        tile.active = false;
      }
    }
    
    return amountHarvested;
  }
  
  // Calculate the egg percentage (for lushness boost)
  calculateEggPercentage(biome) {
    // Calculate percentage of blank tiles that have eggs
    const blankTiles = biome.tiles.filter(tile => !tile.active);
    
    // If no blank tiles, return 0 percentage
    if (blankTiles.length === 0) {
      return 0;
    }
    
    // Count eggs in blank tiles
    const eggsCount = blankTiles.filter(tile => tile.hasEgg).length;
    
    // Calculate percentage (0-1)
    return eggsCount / blankTiles.length;
  }
  
  // Calculate lushness boost based on egg percentage
  calculateLushnessBoost(eggPercentage) {
    // Linear boost: 0-50% coverage = 0-2.0 boost
    // Maximum boost of 2.0 at 50% or more egg coverage
    return Math.min(2.0, eggPercentage * 4.0);
  }
  
  // Get statistics about eggs in a biome
  getEggStats(biome) {
    // Count blank tiles
    const blankTiles = biome.tiles.filter(tile => !tile.active);
    const blankTileCount = blankTiles.length;
    
    // Count eggs
    const eggsCount = biome.eggCount;
    
    // Calculate percentage of blank tiles that have eggs
    const eggPercentage = blankTileCount > 0 ? eggsCount / blankTileCount : 0;
    
    // Calculate available blank tile
    const availableBlankTiles = blankTiles.filter(tile => !tile.hasEgg).length;
    
    return {
      blankTileCount,
      eggsCount,
      eggPercentage,
      availableBlankTiles
    };
  }
  
  // Calculate total resource value in a biome
  calculateTotalResourceValue(biome) {
    return biome.tiles.reduce((sum, tile) => tile.active ? sum + tile.value : sum, 0);
  }
  
  // Initialize a biome with tiles
  initializeBiome(id, name, tileCount, lushness = MAX_LUSHNESS) {
    const tiles = [];
    
    // Create tiles - all resources start with value 10
    for (let i = 0; i < tileCount; i++) {
      tiles.push({
        value: 10, // Start all resources at full value
        initialValue: 10, // Track initial value for each resource
        active: true, // All tiles have active resources by default
        hasEgg: false // Track if this tile has an egg
      });
    }
    
    const biome = {
      id,
      name,
      lushness, // Total lushness (base + boost)
      baseLushness: lushness, // Lushness from resource state
      lushnessBoost: 0, // Additional lushness from eggs
      tiles,
      initialTileCount: tileCount, // Track initial count
      nonDepletedCount: tileCount, // Track number of tiles with non-depleted resources
      totalHarvested: 0,
      eggCount: 0, // Track total number of eggs
      history: [{
        turn: 1,
        lushness: lushness,
        baseLushness: lushness,
        lushnessBoost: 0,
        resourceTotal: tileCount * 10,
        harvestedAmount: 0,
        regeneratedAmount: 0,
        eggsProduced: 0,
        eggCount: 0
      }]
    };
    
    // We no longer place eggs here - this is now handled in the simulator
    // after resource activity has been properly set up
    
    return biome;
  }
  
  // Calculate lushness based on resource state compared to initial state
  calculateBiomeLushness(biome) {
    // Only consider active tiles with resources for lushness calculation
    const activeTiles = biome.tiles.filter(tile => tile.active);
    
    // Count tiles with non-depleted resources (only from active ones)
    const nonDepletedTiles = activeTiles.filter(tile => tile.value > 0).length;
    biome.nonDepletedCount = nonDepletedTiles;
    
    // If all active tiles are depleted, lushness is 0
    if (nonDepletedTiles === 0) return 0;
    
    // Calculate total resource value ratio
    const currentTotal = activeTiles.reduce((sum, tile) => sum + tile.value, 0);
    const initialTotal = activeTiles.length * 10; // All resources started at 10
    
    // Resource health ratio (how close to initial state)
    const resourceRatio = currentTotal / initialTotal;
    
    // Direct linear mapping of resource ratio to base lushness (max MAX_LUSHNESS)
    // Note: This calculates the BASE lushness only, not including egg boost
    return resourceRatio * MAX_LUSHNESS;
  }
}
