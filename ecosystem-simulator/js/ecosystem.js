// js/ecosystem.js

// Constants
export const MAX_LUSHNESS = 8.0;

export class EcosystemModel {
  constructor(params = {}) {
    // Default parameters
    this.params = {
      // Resource generation formula parameters (polynomial)
      resourceGeneration: {
        a: -0.0025, // cubic term
        b: 0.035,   // quadratic term
        c: 0.04,    // linear term
        d: 0.1      // constant term
      },
      
      // Lushness recovery parameters
      lushnessRecovery: {
        baseRate: 0.05,
        scaleFactor: 0.5
      },
      
      // Harvesting impact parameters
      harvestImpact: {
        lushnessDecrease: 0.01 // per unit harvested
      },
      
      // Egg production parameters
      eggProduction: {
        initialCount: 1,
        turnInterval: 2 // Produce eggs every 2 turns
      },
      
      ...params
    };
  }
  
  // Calculate resource generation rate based on lushness
  calculateResourceGenerationRate(lushness) {
    const p = this.params.resourceGeneration;
    
    // Cap lushness at MAX_LUSHNESS for consistent calculations
    const cappedLushness = Math.min(lushness, MAX_LUSHNESS);
    
    // Remove the cap on generation rate to allow faster regeneration at high lushness
    return Math.max(0, 
      p.a * Math.pow(cappedLushness, 3) + 
      p.b * Math.pow(cappedLushness, 2) + 
      p.c * cappedLushness + 
      p.d
    );
  }
  
  // Calculate lushness recovery amount per turn - modified to prevent recovery for fully depleted biomes
  calculateLushnessRecovery(biome) {
    // If fully depleted (all resources at 0), no recovery possible
    if (biome.nonDepletedCount === 0) return 0;
    
    const p = this.params.lushnessRecovery;
    const currentLushness = biome.lushness;
    
    // Non-depleted ratio affects recovery rate
    const nonDepletedRatio = biome.nonDepletedCount / biome.initialResourceCount;
    
    // No recovery beyond initial lushness (MAX_LUSHNESS)
    if (currentLushness >= MAX_LUSHNESS) return 0;
    
    // Calculate deficit from baseline (MAX_LUSHNESS)
    const deficit = MAX_LUSHNESS - currentLushness;
    
    // Recovery formula creates faster recovery in mid-range (3-7)
    // and slower as it approaches MAX_LUSHNESS
    return nonDepletedRatio * p.baseRate * Math.pow(deficit / MAX_LUSHNESS, p.scaleFactor);
  }
  
  // Calculate impact of harvesting on lushness
  calculateHarvestingImpact(harvestedAmount) {
    return harvestedAmount * this.params.harvestImpact.lushnessDecrease;
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
    
    // Recalculate lushness based on new resource state
    // This reflects both harvesting impact and regeneration benefits
    biome.lushness = this.calculateBiomeLushness(biome);
    
    // Produce eggs based on turn number
    const eggsProduced = this.produceEggs(biome, biome.history.length);
    
    // Track historical data
    biome.history.push({
      turn: biome.history.length,
      lushness: biome.lushness,
      resourceTotal: this.calculateTotalResourceValue(biome),
      harvestedAmount,
      regeneratedAmount,
      recoveryAmount: 0, // No separate recovery now
      eggsProduced: eggsProduced,
      eggCount: biome.eggCount
    });
    
    return {
      generationRate,
      lushness: biome.lushness,
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
    
    // Sort resources by index (highest first) to harvest from right to left
    activeResources.sort((a, b) => b.index - a.index);
    
    // FIRST PASS: Harvest resources with value > 1 down to 1
    for (let i = 0; i < activeResources.length && remainingToHarvest > 0; i++) {
      const { resource } = activeResources[i];
      
      // Skip resources that are already depleted (value 0)
      if (resource.value === 0) continue;
      
      // Skip resources that are already at minimum (value 1)
      if (resource.value <= 1) continue;
      
      // Calculate how much we can safely harvest from this resource down to 1
      const harvestFromThis = Math.min(resource.value - 1, remainingToHarvest);
      
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
        // Resources are already sorted by index (highest first)
        const resourcesAtValueOne = activeResources.filter(item => item.resource.value === 1);
        
        for (let i = 0; i < resourcesAtValueOne.length && remainingToHarvest > 0; i++) {
          const { resource } = resourcesAtValueOne[i];
          
          // Deplete this resource
          resource.value = 0;
          amountHarvested += 1;
          remainingToHarvest -= 1;
        }
      }
    } 
    // Strategy: Realistic
    // Every 3rd turn, harvest one resource with value 1 down to 0 if any exist
    else if (biome.harvestStrategy === "realistic" && biome.turnsCount % 3 === 0) {
      // Find a resource with value 1, starting from the highest index
      const resourcesAtValueOne = activeResources.filter(item => item.resource.value === 1);
      
      if (resourcesAtValueOne.length > 0) {
        // Deplete the first resource (which is the rightmost one due to our sorting)
        resourcesAtValueOne[0].resource.value = 0;
        amountHarvested += 1;
      }
    }
    // Strategy: Abusive
    // Every turn, harvest one resource with value 1 down to 0 if any exist
    else if (biome.harvestStrategy === "abusive") {
      // Find a resource with value 1, starting from the highest index
      const resourcesAtValueOne = activeResources.filter(item => item.resource.value === 1);
      
      if (resourcesAtValueOne.length > 0) {
        // Deplete the first resource (which is the rightmost one due to our sorting)
        resourcesAtValueOne[0].resource.value = 0;
        amountHarvested += 1;
      }
    }
    
    return amountHarvested;
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
      lushness,
      resources,
      initialResourceCount: resourceCount, // Track initial count
      nonDepletedCount: resourceCount, // Track number of non-depleted resources
      totalHarvested: 0,
      eggCount: 0, // Track total number of eggs
      history: [{
        turn: 1,
        lushness: lushness,
        resourceTotal: resourceCount * 10,
        harvestedAmount: 0,
        regeneratedAmount: 0,
        recoveryAmount: 0,
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
    
    // Direct linear mapping of resource ratio to lushness (max MAX_LUSHNESS)
    return resourceRatio * MAX_LUSHNESS;
  }
}
