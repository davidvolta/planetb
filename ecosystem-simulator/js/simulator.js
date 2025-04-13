// js/simulator.js
import { EcosystemModel } from './ecosystem.js';

class Simulator {
  constructor() {
    this.ecosystem = new EcosystemModel();
    this.biomes = [];
    this.running = false;
    this.speed = 5;
    this.currentTurn = 0;
    this.maxHistoryLength = 100; // For charts
    this.syncBiomes = false; // Track whether biomes should be synced
    this.resourceCapability = 50; // Percentage of tiles capable of resource generation
    
    this.charts = {};
    
    this.initializeBiomes();
    this.renderBiomes();
    this.setupCharts();
    this.setupControls();
  }
  
  initializeBiomes() {
    // Clear existing biomes array
    this.biomes = [];
    
    // Initialize 5 biomes with different resource counts
    const resourceCounts = [30, 26, 22, 18, 15];
    
    for (let i = 0; i < 5; i++) {
      // Create the biome using ecosystem's initialization
      const biome = this.ecosystem.initializeBiome(
        `biome-${i}`, 
        `Biome ${i+1}`, 
        resourceCounts[i], 
        8.0 // All start with lushness 8.0
      );
      
      // Determine how many tiles should have resources based on resourceCapability
      const resourceTileCount = Math.round(resourceCounts[i] * (this.resourceCapability / 100));
      
      // Arrange resources in order: active resources first (after habitat), then blank tiles
      for (let j = 0; j < resourceCounts[i]; j++) {
        if (j < resourceTileCount) {
          // First tiles are active with value 10
          biome.resources[j].active = true;
          biome.resources[j].value = 10;
        } else {
          // Remaining tiles are inactive (blank) with value 0
          biome.resources[j].active = false;
          biome.resources[j].value = 0;
        }
      }
      
      // Update the history with the correct initial total
      biome.history[0].resourceTotal = this.ecosystem.calculateTotalResourceValue(biome);
      
      this.biomes.push(biome);
    }
  }
  
  setupControls() {
    // Formula parameter sliders
    document.getElementById('param-a').addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      document.getElementById('param-a-value').textContent = value.toFixed(4);
      this.ecosystem.params.resourceGeneration.a = value;
    });
    
    document.getElementById('param-b').addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      document.getElementById('param-b-value').textContent = value.toFixed(3);
      this.ecosystem.params.resourceGeneration.b = value;
    });
    
    document.getElementById('param-c').addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      document.getElementById('param-c-value').textContent = value.toFixed(2);
      this.ecosystem.params.resourceGeneration.c = value;
    });
    
    document.getElementById('param-d').addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      document.getElementById('param-d-value').textContent = value.toFixed(2);
      this.ecosystem.params.resourceGeneration.d = value;
    });
    
    // Sync biomes checkbox
    document.getElementById('sync-biomes').addEventListener('change', (e) => {
      this.syncBiomes = e.target.checked;
      console.log(`Biome sync ${this.syncBiomes ? 'enabled' : 'disabled'}`);
    });
    
    // Resource capability slider
    document.getElementById('resource-capability').addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      document.getElementById('resource-capability-value').textContent = value;
      this.resourceCapability = value;
      
      // Reset the simulation to apply the new resource capability
      this.reset();
      
      console.log(`Resource capability set to ${value}%`);
    });
    
    // Lushness calculation weight sliders
    document.getElementById('resource-value-weight').addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      document.getElementById('resource-value-weight-value').textContent = value.toFixed(2);
      this.ecosystem.params.lushnessCalculation.resourceValueWeight = value;
      
      // Update the complementary weight to ensure they sum to 1.0
      const complementaryWeight = Math.round((1.0 - value) * 100) / 100;
      document.getElementById('non-depleted-weight').value = complementaryWeight;
      document.getElementById('non-depleted-weight-value').textContent = complementaryWeight.toFixed(2);
      this.ecosystem.params.lushnessCalculation.nonDepletedWeight = complementaryWeight;
    });
    
    document.getElementById('non-depleted-weight').addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      document.getElementById('non-depleted-weight-value').textContent = value.toFixed(2);
      this.ecosystem.params.lushnessCalculation.nonDepletedWeight = value;
      
      // Update the complementary weight to ensure they sum to 1.0
      const complementaryWeight = Math.round((1.0 - value) * 100) / 100;
      document.getElementById('resource-value-weight').value = complementaryWeight;
      document.getElementById('resource-value-weight-value').textContent = complementaryWeight.toFixed(2);
      this.ecosystem.params.lushnessCalculation.resourceValueWeight = complementaryWeight;
    });
    
    // Note: Harvest rate sliders are now set up in renderBiomes
    
    // Simulation controls
    document.getElementById('btn-step').addEventListener('click', () => this.step());
    document.getElementById('btn-play').addEventListener('click', () => this.togglePlay());
    document.getElementById('btn-reset').addEventListener('click', () => this.reset());
    
    document.getElementById('simulation-speed').addEventListener('change', (e) => {
      this.speed = parseInt(e.target.value);
    });
  }
  
  setupCharts() {
    // Common chart options
    const chartOptions = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 10, // Smaller legend boxes
            padding: 6    // Less padding between items
          }
        }
      }
    };

    // Lushness chart for all biomes
    const lushnessCtx = document.getElementById('lushness-chart').getContext('2d');
    this.charts.lushness = new Chart(lushnessCtx, {
      type: 'line',
      data: {
        labels: Array(this.maxHistoryLength).fill().map((_, i) => i),
        datasets: this.biomes.map((biome, i) => ({
          label: biome.name,
          data: [biome.lushness],
          borderColor: this.getBiomeColor(i),
          fill: false,
          tension: 0.1
        }))
      },
      options: {
        ...chartOptions,
        scales: {
          y: {
            min: 0,
            max: 8.0,
            title: {
              display: true,
              text: 'Lushness'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Turn'
            },
            ticks: {
              callback: function(value) {
                return value % 5 === 0 ? value : '';
              }
            }
          }
        }
      }
    });
    
    // Resources chart
    const resourcesCtx = document.getElementById('resources-chart').getContext('2d');
    this.charts.resources = new Chart(resourcesCtx, {
      type: 'line',
      data: {
        labels: Array(this.maxHistoryLength).fill().map((_, i) => i),
        datasets: this.biomes.map((biome, i) => ({
          label: biome.name,
          data: [this.ecosystem.calculateTotalResourceValue(biome)],
          borderColor: this.getBiomeColor(i),
          fill: false,
          tension: 0.1
        }))
      },
      options: {
        ...chartOptions,
        scales: {
          y: {
            title: {
              display: true,
              text: 'Total Resource Value'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Turn'
            },
            ticks: {
              callback: function(value) {
                return value % 5 === 0 ? value : '';
              }
            }
          }
        }
      }
    });
  }
  
  renderBiomes() {
    const container = document.getElementById('biomes-container');
    container.innerHTML = '';
    
    this.biomes.forEach((biome, index) => {
      const biomeElement = document.createElement('div');
      biomeElement.className = 'biome';
      biomeElement.id = biome.id;
      
      // Calculate max harvest units for this biome
      const maxHarvestUnits = biome.resources.length;
      
      // Biome header
      const header = document.createElement('div');
      header.className = 'biome-header';
      header.innerHTML = `
        <div class="biome-stats">
          <div>Lushness: <span id="${biome.id}-lushness">${biome.lushness.toFixed(2)}</span></div>
          <div>Total: <span id="${biome.id}-total">${Math.round(this.ecosystem.calculateTotalResourceValue(biome))}</span>/${Math.round(biome.initialResourceCount * 10)}</div>
          <div>Harvested: <span id="${biome.id}-harvested">${Math.round(biome.totalHarvested)}</span></div>
        </div>
        <div class="harvest-controls">
          <div class="harvest-control">
            <label for="harvest-percent-${index}"><span id="harvest-percent-${index}-value">0</span>%</label>
            <input type="range" id="harvest-percent-${index}" min="0" max="100" step="1" value="0">
          </div>
          <div class="harvest-control">
            <label for="harvest-units-${index}"><span id="harvest-units-${index}-value">0</span></label>
            <input type="range" id="harvest-units-${index}" min="0" max="${maxHarvestUnits}" step="1" value="0">
          </div>
          <div class="harvest-strategy">
            <select id="harvest-strategy-${index}">
              <option value="preservation" selected>Preservation</option>
              <option value="realistic">Realistic</option>
              <option value="abusive">Abusive</option>
            </select>
          </div>
        </div>
      `;
      
      // Resource grid
      const resourceGrid = document.createElement('div');
      resourceGrid.className = 'resource-grid';
      
      // Create habitat tile (black square at the beginning)
      const habitatElement = document.createElement('div');
      habitatElement.className = 'habitat';
      habitatElement.textContent = 'H';
      resourceGrid.appendChild(habitatElement);
      
      // Create resource squares
      biome.resources.forEach((resource, i) => {
        const resourceElement = document.createElement('div');
        resourceElement.id = `${biome.id}-resource-${i}`;
        
        if (resource.active) {
          // Active resource tile
          resourceElement.className = 'resource';
          // Set color intensity based on value
          const intensity = resource.value / 10;
          resourceElement.style.backgroundColor = `rgba(0, 128, 0, ${intensity})`;
          resourceElement.textContent = Math.round(resource.value);
        } else {
          // Inactive/blank resource tile
          resourceElement.className = 'resource inactive';
          // No content for blank tiles
        }
        
        resourceGrid.appendChild(resourceElement);
      });
      
      biomeElement.appendChild(header);
      biomeElement.appendChild(resourceGrid);
      container.appendChild(biomeElement);
      
      // Initialize harvest rate
      biome.harvestRate = 0;
      biome.harvestPercent = 0;
      biome.harvestStrategy = "preservation";
      biome.turnsCount = 0; // For tracking turns for "realistic" strategy
    });
    
    // Set up the harvest rate sliders AFTER the DOM elements exist
    this.biomes.forEach((biome, index) => {
      const percentSlider = document.getElementById(`harvest-percent-${index}`);
      const unitsSlider = document.getElementById(`harvest-units-${index}`);
      const strategySelect = document.getElementById(`harvest-strategy-${index}`);
      const maxHarvestUnits = biome.resources.length;
      
      // Strategy dropdown event listener
      strategySelect.addEventListener('change', (e) => {
        biome.harvestStrategy = e.target.value;
        console.log(`Biome ${index} harvest strategy set to ${biome.harvestStrategy}`);
      });
      
      // Percentage slider event listener
      percentSlider.addEventListener('input', (e) => {
        const percentValue = parseInt(e.target.value);
        document.getElementById(`harvest-percent-${index}-value`).textContent = percentValue;
        
        // Calculate equivalent units based on percentage
        const unitValue = Math.round((percentValue / 100) * maxHarvestUnits);
        unitsSlider.value = unitValue;
        document.getElementById(`harvest-units-${index}-value`).textContent = unitValue;
        
        // Update biome harvest values
        biome.harvestPercent = percentValue;
        biome.harvestRate = unitValue;
        
        // If sync is enabled, update all other biomes to the same percentage
        if (this.syncBiomes) {
          this.biomes.forEach((otherBiome, otherIndex) => {
            if (otherIndex !== index) {
              // Update the other biome's percentage and unit values
              const otherMaxUnits = otherBiome.resources.length;
              const otherUnitValue = Math.round((percentValue / 100) * otherMaxUnits);
              
              // Update the biome object
              otherBiome.harvestPercent = percentValue;
              otherBiome.harvestRate = otherUnitValue;
              
              // Update the UI elements
              const otherPercentSlider = document.getElementById(`harvest-percent-${otherIndex}`);
              const otherUnitsSlider = document.getElementById(`harvest-units-${otherIndex}`);
              
              if (otherPercentSlider && otherUnitsSlider) {
                otherPercentSlider.value = percentValue;
                document.getElementById(`harvest-percent-${otherIndex}-value`).textContent = percentValue;
                
                otherUnitsSlider.value = otherUnitValue;
                document.getElementById(`harvest-units-${otherIndex}-value`).textContent = otherUnitValue;
              }
            }
          });
        }
        
        console.log(`Biome ${index} harvest set to ${percentValue}% (${unitValue} units)`);
      });
      
      // Units slider event listener
      unitsSlider.addEventListener('input', (e) => {
        const unitValue = parseInt(e.target.value);
        document.getElementById(`harvest-units-${index}-value`).textContent = unitValue;
        
        // Calculate equivalent percentage based on units
        const percentValue = Math.round((unitValue / maxHarvestUnits) * 100);
        percentSlider.value = percentValue;
        document.getElementById(`harvest-percent-${index}-value`).textContent = percentValue;
        
        // Update biome harvest values
        biome.harvestRate = unitValue;
        biome.harvestPercent = percentValue;
        
        // If sync is enabled, update all other biomes to the same percentage
        if (this.syncBiomes) {
          this.biomes.forEach((otherBiome, otherIndex) => {
            if (otherIndex !== index) {
              // Update the other biome's percentage and unit values (based on percentage)
              const otherMaxUnits = otherBiome.resources.length;
              const otherUnitValue = Math.round((percentValue / 100) * otherMaxUnits);
              
              // Update the biome object
              otherBiome.harvestPercent = percentValue;
              otherBiome.harvestRate = otherUnitValue;
              
              // Update the UI elements
              const otherPercentSlider = document.getElementById(`harvest-percent-${otherIndex}`);
              const otherUnitsSlider = document.getElementById(`harvest-units-${otherIndex}`);
              
              if (otherPercentSlider && otherUnitsSlider) {
                otherPercentSlider.value = percentValue;
                document.getElementById(`harvest-percent-${otherIndex}-value`).textContent = percentValue;
                
                otherUnitsSlider.value = otherUnitValue;
                document.getElementById(`harvest-units-${otherIndex}-value`).textContent = otherUnitValue;
              }
            }
          });
        }
        
        console.log(`Biome ${index} harvest set to ${unitValue} units (${percentValue}%)`);
      });
    });
  }
  
  updateBiomeDisplay(biome) {
    // Update stats
    document.getElementById(`${biome.id}-lushness`).textContent = biome.lushness.toFixed(2);
    document.getElementById(`${biome.id}-total`).textContent = Math.round(this.ecosystem.calculateTotalResourceValue(biome));
    document.getElementById(`${biome.id}-harvested`).textContent = Math.round(biome.totalHarvested);
    
    // Update resource display
    biome.resources.forEach((resource, i) => {
      const resourceElement = document.getElementById(`${biome.id}-resource-${i}`);
      
      if (resource.active) {
        // Active resource tile
        resourceElement.className = 'resource';
        const intensity = resource.value / 10;
        resourceElement.style.backgroundColor = `rgba(0, 128, 0, ${intensity})`;
        resourceElement.textContent = Math.round(resource.value);
      } else {
        // Inactive/blank resource tile
        resourceElement.className = 'resource inactive';
        resourceElement.style.backgroundColor = '';
        resourceElement.textContent = '';
      }
    });
  }
  
  updateCharts() {
    // Update with turn and lushness data
    this.biomes.forEach((biome, index) => {
      // Get history data for this biome
      const historyData = biome.history.map(h => h.lushness);
      const resourceData = biome.history.map(h => h.resourceTotal);
      
      // Add most recent data point
      this.charts.lushness.data.datasets[index].data = historyData;
      this.charts.resources.data.datasets[index].data = resourceData;
    });
    
    // Update labels for turns
    const turnLabels = Array(this.currentTurn + 1).fill().map((_, i) => i);
    this.charts.lushness.data.labels = turnLabels;
    this.charts.resources.data.labels = turnLabels;
    
    // Update the charts
    this.charts.lushness.update();
    this.charts.resources.update();
  }
  
  step() {
    // Simulate one turn for each biome
    this.biomes.forEach(biome => {
      this.ecosystem.simulateTurn(biome, biome.harvestRate);
      this.updateBiomeDisplay(biome);
    });
    
    // Update current turn
    this.currentTurn++;
    document.getElementById('current-turn').textContent = this.currentTurn;
    
    // Update charts
    this.updateCharts();
  }
  
  togglePlay() {
    this.running = !this.running;
    const playBtn = document.getElementById('btn-play');
    
    if (this.running) {
      playBtn.textContent = 'Pause';
      this.runSimulation();
    } else {
      playBtn.textContent = 'Play';
    }
  }
  
  runSimulation() {
    if (!this.running) return;
    
    this.step();
    setTimeout(() => this.runSimulation(), 1000 / this.speed);
  }
  
  reset() {
    // Stop any running simulation
    if (this.running) {
      this.togglePlay();
    }
    
    // Reset turn counter
    this.currentTurn = 0;
    document.getElementById('current-turn').textContent = this.currentTurn;
    
    // Clean up old charts
    if (this.charts.lushness) {
      this.charts.lushness.destroy();
    }
    if (this.charts.resources) {
      this.charts.resources.destroy();
    }
    
    // Reinitialize biomes and charts
    this.initializeBiomes();
    this.renderBiomes();
    this.setupCharts();
    
    // Reset all biome turn counters
    this.biomes.forEach(biome => {
      biome.turnsCount = 0;
    });
    
    console.log("Simulation reset");
  }
  
  updateFormulaPreview() {
    // No longer needed - formula preview element was removed
  }
  
  getBiomeColor(index) {
    const colors = [
      'rgba(75, 192, 192, 1)',
      'rgba(255, 99, 132, 1)',
      'rgba(255, 205, 86, 1)',
      'rgba(54, 162, 235, 1)',
      'rgba(153, 102, 255, 1)'
    ];
    return colors[index % colors.length];
  }
}

// Initialize simulator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.simulator = new Simulator();
});
