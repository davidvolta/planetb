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
    for (let i = 0; i < biome.resources.length; i++) {
      if (!biome.resources[i].active && !biome.resources[i].hasEgg) {
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
    biome.resources[tileIndex].hasEgg = true;
    biome.eggCount += 1;
    
    return 1; // Return the number of eggs produced
  }
  
  // Simulate a single turn for a biome with controlled harvest rate
  simulateTurn(biome, harvestRate = 0) {
    // Calculate resource regeneration
    const generationRate = this.calculateResourceGenerationRate(biome.lushness);
    let regeneratedAmount = 0;
    
    const eligibleResources = biome.resources.filter(resource => 
      resource.active && resource.value > 0 && resource.value < 10
    );
    
    if (eligibleResources.length > 0) {
      // Calculate total expected regeneration based on original formula
      const totalExpectedRegeneration = eligibleResources.reduce((sum, resource) => {
        return sum + (generationRate * (1 - resource.value / 10));
      }, 0);
      
      // Assign random weights to each resource
      const resourcesWithWeights = eligibleResources.map(resource => {
        // Random weight between 0.5 and 2.5 (significantly varied)
        const randomWeight = 0.5 + (Math.random() * 2.0);
        return { resource, randomWeight };
      });
      
      // Calculate total random weights
      const totalRandomWeight = resourcesWithWeights.reduce((sum, item) => 
        sum + item.randomWeight, 0
      );
      
      // Distribute total regeneration based on random weights
      resourcesWithWeights.forEach(item => {
        const { resource, randomWeight } = item;
        
        // Proportion of total regeneration for this resource
        const regenerationProportion = randomWeight / totalRandomWeight;
        
        // Allocate regeneration amount proportionally
        const regenerationAmount = totalExpectedRegeneration * regenerationProportion;
        
        // Apply regeneration
        resource.value = Math.min(10, resource.value + regenerationAmount);
        regeneratedAmount += regenerationAmount;
      });
    }
    
    // Apply harvesting based on harvestRate (units per turn)
    let harvestedAmount = 0;
    if (harvestRate > 0) {
      harvestedAmount = this.harvestResources(biome, harvestRate);
      biome.totalHarvested += harvestedAmount;
    }
    
    // Recalculate base lushness based on new resource state
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
    
    // Get all active resources with their indices
    const activeResources = biome.resources
      .map((resource, index) => ({ resource, index }))
      .filter(item => item.resource.active);
    
    // FIRST PASS: Harvest resources with value > 1 down to 1 from right to left
    // Create a pool of resources with value > 1
    let harvestPool = activeResources
      .filter(item => item.resource.value > 1)
      .sort((a, b) => b.index - a.index); // Sort right to left (highest index first)
    
    // Calculate the maximum amount to harvest from any single resource in one selection
    // Use 20% of the resource's available value (down to 1) or 1 unit, whichever is higher
    const calculateMaxHarvestPerResource = (resource) => {
      const availableToHarvest = resource.value - 1; // Can only harvest down to 1
      return Math.max(1, Math.ceil(availableToHarvest * 0.2)); // At least 1 unit, at most 20% of available
    };
    
    // Iterate through resources from right to left, taking a limited amount from each
    for (let i = 0; i < harvestPool.length && remainingToHarvest > 0; i++) {
      const { resource } = harvestPool[i];
      
      // Calculate the maximum amount to harvest from this resource in this pass
      const maxHarvestFromResource = calculateMaxHarvestPerResource(resource);
      
      // Calculate how much we can safely harvest from this resource, limited by our max per-resource amount
      const harvestFromThis = Math.min(
        resource.value - 1,    // Don't go below 1
        maxHarvestFromResource, // Limit per selection
        remainingToHarvest     // Don't harvest more than requested
      );
      
      resource.value -= harvestFromThis;
      amountHarvested += harvestFromThis;
      remainingToHarvest -= harvestFromThis;
    }
    
    // SECOND PASS: Based on strategy, decide whether to harvest resources with value 1 down to 0
    
    // Strategy: Preservation (default)
    // Only harvest resources with value 1 if all resources are at value 1 or 0
    if (biome.harvestStrategy === "preservation" && remainingToHarvest > 0) {
      // Check if all active resources are at value 1 or 0
      const hasHigherValueResources = activeResources.some(item => item.resource.value > 1);
      
      // If all active resources are at 1 or 0, we can start depleting them
      if (!hasHigherValueResources) {
        // Get resources at value 1, sorted right to left
        const resourcesAtValueOne = activeResources
          .filter(item => item.resource.value === 1)
          .sort((a, b) => b.index - a.index); // Sort right to left
        
        // Calculate how many resources to deplete (limited to what's available)
        // For preservation, we'll deplete up to 25% of value-1 resources per turn
        const maxToDeplete = Math.min(
          Math.ceil(resourcesAtValueOne.length * 0.25), // 25% of available resources
          remainingToHarvest // Can't deplete more than requested
        );
        
        // Deplete resources from right to left
        for (let i = 0; i < maxToDeplete && i < resourcesAtValueOne.length; i++) {
          const { resource, index } = resourcesAtValueOne[i];
          
          // Deplete this resource
          resource.value = 0;
          amountHarvested += 1;
          remainingToHarvest -= 1;
          
          // Convert depleted resource to blank tile
          resource.active = false;
        }
      }
    } 
    // Strategy: Realistic
    // Every 3rd turn, harvest multiple resources with value 1 down to 0
    else if (biome.harvestStrategy === "realistic" && biome.turnsCount % 3 === 0) {
      // Find all resources with value 1, sorted right to left
      const resourcesAtValueOne = activeResources
        .filter(item => item.resource.value === 1)
        .sort((a, b) => b.index - a.index); // Sort right to left
      
      if (resourcesAtValueOne.length > 0) {
        // In realistic strategy, deplete up to 10% of value-1 resources every 3rd turn
        const maxToDeplete = Math.min(
          Math.ceil(resourcesAtValueOne.length * 0.1), // 10% of available resources
          remainingToHarvest, // Can't deplete more than requested
          3 // Hard limit of 3 resources per turn for realism
        );
        
        // Deplete resources from right to left
        for (let i = 0; i < maxToDeplete && i < resourcesAtValueOne.length; i++) {
          const { resource, index } = resourcesAtValueOne[i];
          
          // Deplete this resource
          resource.value = 0;
          amountHarvested += 1;
          remainingToHarvest -= 1;
          
          // Convert depleted resource to blank tile
          resource.active = false;
        }
      }
    }
    // Strategy: Abusive
    // Every turn, harvest multiple resources with value 1 down to 0
    else if (biome.harvestStrategy === "abusive") {
      // Find all resources with value 1, sorted right to left
      const resourcesAtValueOne = activeResources
        .filter(item => item.resource.value === 1)
        .sort((a, b) => b.index - a.index); // Sort right to left
      
      if (resourcesAtValueOne.length > 0) {
        // In abusive strategy, deplete up to 15% of value-1 resources every turn
        const maxToDeplete = Math.min(
          Math.ceil(resourcesAtValueOne.length * 0.15), // 15% of available resources
          remainingToHarvest // Can't deplete more than requested
        );
        
        // Deplete resources from right to left
        for (let i = 0; i < maxToDeplete && i < resourcesAtValueOne.length; i++) {
          const { resource, index } = resourcesAtValueOne[i];
          
          // Deplete this resource
          resource.value = 0;
          amountHarvested += 1;
          remainingToHarvest -= 1;
          
          // Convert depleted resource to blank tile
          resource.active = false;
        }
      }
    }
    
    return amountHarvested;
  }
  
  // Calculate the percentage of blank tiles with eggs
  calculateEggPercentage(biome) {
    // Count blank tiles (inactive tiles without eggs)
    const blankTiles = biome.resources.filter(r => !r.active && !r.hasEgg).length;
    
    // Count eggs
    const eggsCount = biome.eggCount;
    
    // Calculate total possible egg placement spaces
    const totalPossibleEggSpaces = blankTiles + eggsCount;
    
    // If there are no possible egg spaces, return 0
    if (totalPossibleEggSpaces === 0) return 0;
    
    // Calculate percentage
    return eggsCount / totalPossibleEggSpaces;
  }
  
  // Calculate lushness boost based on egg percentage with diminishing returns
  calculateLushnessBoost(eggPercentage) {
    // Use linear function instead of square root
    // At 100% eggs, boost = 2.0
    // At 50% eggs, boost = 1.0
    // At 25% eggs, boost = 0.5
    return 2.0 * eggPercentage;
  }
  
  // Get detailed egg statistics for a biome
  getEggStats(biome) {
    // Count blank tiles (inactive tiles without eggs)
    const blankTiles = biome.resources.filter(r => !r.active && !r.hasEgg).length;
    
    // Count eggs
    const eggsCount = biome.eggCount;
    
    // Calculate total possible egg placement spaces
    const totalPossibleEggSpaces = blankTiles + eggsCount;
    
    // Calculate percentage
    const percentage = totalPossibleEggSpaces > 0 ? eggsCount / totalPossibleEggSpaces : 0;
    
    // Calculate boost amount
    const boostAmount = this.calculateLushnessBoost(percentage);
    
    return {
      blankTiles,
      eggsCount,
      totalPossibleEggSpaces,
      percentage,
      boostAmount,
      formattedPercentage: `${Math.round(percentage * 100)}%`,
      formattedBoost: boostAmount.toFixed(2)
    };
  }
  
  // Calculate total resource value in a biome
  calculateTotalResourceValue(biome) {
    return biome.resources.reduce((sum, r) => r.active ? sum + r.value : sum, 0);
  }
  
  // Initialize a biome with resources
  initializeBiome(id, name, resourceCount, lushness = MAX_LUSHNESS) {
    const resources = [];
    
    // Create resources - all resources start with value 10
    for (let i = 0; i < resourceCount; i++) {
      resources.push({
        value: 10, // Start all resources at full value
        initialValue: 10, // Track initial value for each resource
        active: true, // All resources are active by default
        hasEgg: false // Track if this tile has an egg
      });
    }
    
    const biome = {
      id,
      name,
      lushness, // Total lushness (base + boost)
      baseLushness: lushness, // Lushness from resource state
      lushnessBoost: 0, // Additional lushness from eggs
      resources,
      initialResourceCount: resourceCount, // Track initial count
      nonDepletedCount: resourceCount, // Track number of non-depleted resources
      totalHarvested: 0,
      eggCount: 0, // Track total number of eggs
      history: [{
        turn: 1,
        lushness: lushness,
        baseLushness: lushness,
        lushnessBoost: 0,
        resourceTotal: resourceCount * 10,
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
    // Only consider active resources for lushness calculation
    const activeResources = biome.resources.filter(r => r.active);
    
    // Count non-depleted resources (only from active ones)
    const nonDepletedResources = activeResources.filter(r => r.value > 0).length;
    biome.nonDepletedCount = nonDepletedResources;
    
    // If all active resources are depleted, lushness is 0
    if (nonDepletedResources === 0) return 0;
    
    // Calculate total resource value ratio
    const currentTotal = activeResources.reduce((sum, r) => sum + r.value, 0);
    const initialTotal = activeResources.length * 10; // All active resources started at 10
    
    // Resource health ratio (how close to initial state)
    const resourceRatio = currentTotal / initialTotal;
    
    // Direct linear mapping of resource ratio to base lushness (max MAX_LUSHNESS)
    // Note: This calculates the BASE lushness only, not including egg boost
    return resourceRatio * MAX_LUSHNESS;
  }
}
