// js/simulator.js
import { EcosystemModel, MAX_LUSHNESS } from './ecosystem.js';

class Simulator {
  constructor() {
    this.ecosystem = new EcosystemModel();
    this.biomes = [];
    this.running = false;
    this.speed = 5;
    this.currentTurn = 1;
    this.maxHistoryLength = 100; // For charts
    this.syncBiomes = false; // Track whether biomes should be synced
    this.resourceCapability = 50; // Percentage of tiles capable of resource generation
    
    // Check for dark mode preference
    const darkModePreference = localStorage.getItem('darkMode');
    if (darkModePreference === 'enabled') {
      document.body.classList.add('dark-mode');
      // Update button will be handled in setupControls
    }
    
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
    const resourceCounts = [30, 24, 20, 18, 15];
    
    for (let i = 0; i < 5; i++) {
      // Create the biome using ecosystem's initialization
      const biome = this.ecosystem.initializeBiome(
        `biome-${i}`, 
        `Biome ${i+1}`, 
        resourceCounts[i], 
        MAX_LUSHNESS // All start with max lushness
      );
      
      // Determine how many tiles should have resources based on resourceCapability
      const resourceTileCount = Math.round(resourceCounts[i] * (this.resourceCapability / 100));
      
      // Clear any existing eggs (since we'll place them after setting active/inactive)
      biome.eggCount = 0;
      biome.resources.forEach(resource => {
        resource.hasEgg = false;
      });
      
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
      
      // Now place initial egg(s) on blank tiles
      const initialEggCount = this.ecosystem.params.eggProduction.initialCount;
      for (let j = 0; j < initialEggCount; j++) {
        const tileIndex = this.ecosystem.findLeftmostBlankTile(biome);
        if (tileIndex !== -1) {
          biome.resources[tileIndex].hasEgg = true;
          biome.eggCount += 1;
        }
      }
      
      // Update the history with the correct initial values
      biome.history[0].resourceTotal = this.ecosystem.calculateTotalResourceValue(biome);
      biome.history[0].eggCount = biome.eggCount;
      
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
    
    // Simulation controls
    document.getElementById('btn-step').addEventListener('click', () => this.step());
    document.getElementById('btn-play').addEventListener('click', () => this.togglePlay());
    document.getElementById('btn-reset').addEventListener('click', () => this.reset());
    
    document.getElementById('simulation-speed').addEventListener('change', (e) => {
      this.speed = parseInt(e.target.value);
    });
    
    // Dark mode toggle
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const body = document.body;
    
    // Check if user preference exists in localStorage
    const darkModePreference = localStorage.getItem('darkMode');
    if (darkModePreference === 'enabled') {
      body.classList.add('dark-mode');
      darkModeToggle.innerHTML = '☀️ Light Mode';
    }
    
    darkModeToggle.addEventListener('click', () => {
      // Toggle dark mode
      body.classList.toggle('dark-mode');
      
      // Update button text
      if (body.classList.contains('dark-mode')) {
        darkModeToggle.innerHTML = '☀️ Light Mode';
        localStorage.setItem('darkMode', 'enabled');
      } else {
        darkModeToggle.innerHTML = '🌙 Dark Mode';
        localStorage.setItem('darkMode', 'disabled');
      }
      
      // Update charts to match the theme
      this.updateChartsTheme();
    });
  }
  
  setupCharts() {
    // Determine if dark mode is active
    const isDarkMode = document.body.classList.contains('dark-mode');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDarkMode ? '#e0e0e0' : '#666';
    
    // Common chart options
    const chartOptions = {
      responsive: true,
      plugins: {
        legend: {
          display: false // Hide the legend
        }
      }
    };

    // Lushness chart for all biomes
    const lushnessCtx = document.getElementById('lushness-chart').getContext('2d');
    this.charts.lushness = new Chart(lushnessCtx, {
      type: 'line',
      data: {
        labels: Array(this.maxHistoryLength).fill().map((_, i) => i + 1),
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
            max: MAX_LUSHNESS,
            title: {
              display: true,
              text: 'Lushness',
              color: textColor
            },
            ticks: {
              color: textColor
            },
            grid: {
              color: gridColor
            }
          },
          x: {
            title: {
              display: true,
              text: 'Turn',
              color: textColor
            },
            ticks: {
              callback: function(value) {
                return value % 5 === 0 ? value : '';
              },
              color: textColor
            },
            grid: {
              color: gridColor
            }
          }
        }
      }
    });
    
    // Harvested resources chart
    const harvestedCtx = document.getElementById('resources-chart').getContext('2d');
    this.charts.harvested = new Chart(harvestedCtx, {
      type: 'line',
      data: {
        labels: Array(this.maxHistoryLength).fill().map((_, i) => i + 1),
        datasets: this.biomes.map((biome, i) => ({
          label: biome.name,
          data: [0], // Start with zero harvested
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
            title: {
              display: true,
              text: 'Harvested Resources',
              color: textColor
            },
            ticks: {
              color: textColor
            },
            grid: {
              color: gridColor
            }
          },
          x: {
            title: {
              display: true,
              text: 'Turn',
              color: textColor
            },
            ticks: {
              callback: function(value) {
                return value % 5 === 0 ? value : '';
              },
              color: textColor
            },
            grid: {
              color: gridColor
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
      
      // Add border with biome color
      const biomeColor = this.getBiomeColor(index);
      biomeElement.style.border = `2px solid ${biomeColor}`;
      biomeElement.style.borderRadius = '6px';
      
      // Calculate max harvest units for this biome
      const maxHarvestUnits = biome.resources.length;
      
      // Biome header
      const header = document.createElement('div');
      header.className = 'biome-header';
      header.style.backgroundColor = biomeColor + '22'; // Add slight background color with transparency
      header.innerHTML = `
        <div class="biome-stats">
          <div style="font-weight: bold; color: ${biomeColor}; margin-bottom: 3px;">${biome.name}</div>
          <div style="color: ${biome.lushness >= 6.0 ? 'green' : 'red'}" title="${biome.lushness >= 6.0 ? 'Egg production active (lushness ≥ 6.0)' : 'Egg production inactive (requires lushness ≥ 6.0)'}">Lushness: <span id="${biome.id}-lushness">${biome.lushness.toFixed(2)}</span></div>
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
          
          // If the resource has an egg, add a black circle
          if (resource.hasEgg) {
            // Create an egg indicator (black circle)
            const eggIndicator = document.createElement('div');
            eggIndicator.className = 'egg-indicator';
            eggIndicator.style.width = '10px';
            eggIndicator.style.height = '10px';
            eggIndicator.style.borderRadius = '50%';
            eggIndicator.style.backgroundColor = '#000';
            eggIndicator.style.margin = 'auto';
            eggIndicator.style.cursor = 'pointer'; // Add pointer cursor to indicate it's clickable
            
            // Add click event listener to remove the egg
            eggIndicator.addEventListener('click', (e) => {
              e.stopPropagation(); // Prevent event bubbling
              
              // Remove the egg from the model
              resource.hasEgg = false;
              biome.eggCount -= 1;
              
              // Clear the egg indicator from the UI
              resourceElement.innerHTML = '';
              
              // Update the latest history entry
              if (biome.history.length > 0) {
                biome.history[biome.history.length - 1].eggCount = biome.eggCount;
              }
              
              console.log(`Egg removed from ${biome.name}, tile ${i}. Remaining eggs: ${biome.eggCount}`);
            });
            
            resourceElement.appendChild(eggIndicator);
          }
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
    
    // Update lushness indicator color
    const canProduceEggs = biome.lushness >= 6.0;  // Updated to 6.0 to match the ecosystem.js change
    const lushnessElement = document.getElementById(`${biome.id}-lushness`).parentElement;
    
    if (canProduceEggs) {
      lushnessElement.style.color = 'green';
      lushnessElement.title = 'Egg production active (lushness ≥ 6.0)';  // Updated to 6.0
    } else {
      lushnessElement.style.color = 'red';
      lushnessElement.title = 'Egg production inactive (requires lushness ≥ 6.0)';  // Updated to 6.0
    }
    
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
        
        // Check if this tile has an egg
        if (resource.hasEgg) {
          // Clear existing egg indicator if any
          resourceElement.innerHTML = '';
          
          // Create an egg indicator (black circle)
          const eggIndicator = document.createElement('div');
          eggIndicator.className = 'egg-indicator';
          eggIndicator.style.width = '10px';
          eggIndicator.style.height = '10px';
          eggIndicator.style.borderRadius = '50%';
          eggIndicator.style.backgroundColor = '#000';
          eggIndicator.style.margin = 'auto';
          eggIndicator.style.cursor = 'pointer'; // Add pointer cursor to indicate it's clickable
          
          // Add click event listener to remove the egg
          eggIndicator.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            
            // Remove the egg from the model
            resource.hasEgg = false;
            biome.eggCount -= 1;
            
            // Clear the egg indicator from the UI
            resourceElement.innerHTML = '';
            
            // Update the latest history entry
            if (biome.history.length > 0) {
              biome.history[biome.history.length - 1].eggCount = biome.eggCount;
            }
            
            console.log(`Egg removed from ${biome.name}, tile ${i}. Remaining eggs: ${biome.eggCount}`);
          });
          
          resourceElement.appendChild(eggIndicator);
        } else {
          // Clear any existing content
          resourceElement.innerHTML = '';
        }
      }
    });
  }
  
  updateCharts() {
    // Update with turn and lushness data
    this.biomes.forEach((biome, index) => {
      // Get history data for this biome
      const lushnessHistory = biome.history.map(h => h.lushness);
      const harvestedHistory = biome.history.map(h => h.harvestedAmount);
      
      // Add most recent data point
      this.charts.lushness.data.datasets[index].data = lushnessHistory;
      this.charts.harvested.data.datasets[index].data = harvestedHistory;
    });
    
    // Update labels for turns
    const turnLabels = Array(this.currentTurn).fill().map((_, i) => i + 1);
    this.charts.lushness.data.labels = turnLabels;
    this.charts.harvested.data.labels = turnLabels;
    
    // Update the charts
    this.charts.lushness.update();
    this.charts.harvested.update();
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
    
    // Reset turn counter to 1 (not 0)
    this.currentTurn = 1;
    document.getElementById('current-turn').textContent = this.currentTurn;
    
    // Clean up old charts
    if (this.charts.lushness) {
      this.charts.lushness.destroy();
    }
    if (this.charts.harvested) {
      this.charts.harvested.destroy();
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
  
  // Update chart colors based on current theme
  updateChartsTheme() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    // Grid line color for charts
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDarkMode ? '#e0e0e0' : '#666';
    
    // Update all charts
    [this.charts.lushness, this.charts.harvested].forEach(chart => {
      if (!chart) return;
      
      // Update grid lines
      chart.options.scales.x.grid.color = gridColor;
      chart.options.scales.y.grid.color = gridColor;
      
      // Update text color
      chart.options.scales.x.ticks.color = textColor;
      chart.options.scales.y.ticks.color = textColor;
      // Legend is now hidden, so no need to update its color
      chart.options.scales.x.title.color = textColor;
      chart.options.scales.y.title.color = textColor;
      
      chart.update();
    });
  }
}

// Initialize simulator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.simulator = new Simulator();
});
