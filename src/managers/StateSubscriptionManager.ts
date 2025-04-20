import { StateObserver } from '../utils/stateObserver';
import { Animal, GameState, ValidMove, Habitat, Biome, Board } from '../store/gameStore';
import { useGameStore } from '../store/gameStore';
import * as actions from '../store/actions';
import BoardScene from '../scenes/BoardScene';
import { SelectionRenderer } from '../renderers/SelectionRenderer';
import { TileRenderer } from '../renderers/TileRenderer';
import { AnimalRenderer } from '../renderers/AnimalRenderer';
import { HabitatRenderer } from '../renderers/HabitatRenderer';
import { ResourceRenderer } from '../renderers/ResourceRenderer';
import { MoveRangeRenderer } from '../renderers/MoveRangeRenderer';
import { AnimationController } from '../controllers/AnimationController';
import Phaser from "phaser";
import * as CoordinateUtils from "../utils/CoordinateUtils";

// Component interfaces: These define the contracts that components must fulfill to receive state updates

// Interface for a component that can render animals
interface IAnimalRenderer {
  renderAnimals(animals: Animal[], onUnitClicked?: (animalId: string, gridX: number, gridY: number) => void): void;
}

// Interface for a component that can render habitats
interface IHabitatRenderer {
  renderHabitats(habitats: Habitat[]): void;
  updateHabitatOwnership(biomeId: string): void;
  updateHabitatTotalLushness(biomeId: string, newValue: number): void;
}

// Interface for a component that can render move ranges
interface IMoveRangeRenderer {
  showMoveRange(validMoves: ValidMove[], moveMode: boolean): void;
  clearMoveHighlights(): void;
}

// Interface for a component that can handle animations
interface IAnimationController {
  moveUnit(
    unitId: string,
    sprite: Phaser.GameObjects.Sprite,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    options?: {
      onBeforeMove?: () => void;
      onAfterMove?: () => void;
    }
  ): Promise<void>;
  
  displaceUnit(
    unitId: string,
    sprite: Phaser.GameObjects.Sprite,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    options?: {
      onBeforeDisplace?: () => void;
      onAfterDisplace?: () => void;
    }
  ): Promise<void>;
}

// Interface for a component that can update the board
interface ITileRenderer {
  createBoardTiles(
    board: { width: number, height: number, tiles: any[][] },
    centerX?: number, 
    centerY?: number
  ): Phaser.GameObjects.GameObject[];
}

// This manager centralizes all state subscriptions for the BoardScene and its components.
export class StateSubscriptionManager {
  // Scene reference
  private scene: Phaser.Scene;
  
  // Renderers and controllers
  private animalRenderer!: AnimalRenderer;
  private habitatRenderer!: HabitatRenderer;
  private resourceRenderer!: ResourceRenderer;
  private moveRangeRenderer!: MoveRangeRenderer;
  private animationController!: AnimationController;
  private tileRenderer!: TileRenderer;
  
  // Track initialization and subscription state
  private initialized: boolean = false;
  private subscriptionsSetup: boolean = false;
  
  // Define subscription keys to ensure consistency
  public static readonly SUBSCRIPTIONS = {
    // Board state subscriptions
    BOARD: 'StateSubscriptionManager.board',
    
    // Entity state subscriptions
    ANIMALS: 'StateSubscriptionManager.animals',
    HABITATS: 'StateSubscriptionManager.habitats',
    RESOURCE_TILES: 'StateSubscriptionManager.resourceTiles',
    
    // Interaction state subscriptions
    VALID_MOVES: 'StateSubscriptionManager.validMoves',
    DISPLACEMENT: 'StateSubscriptionManager.displacement',
    SPAWN: 'StateSubscriptionManager.spawn',
    BIOME_CAPTURE: 'StateSubscriptionManager.biomeCapture',
    
    // UI state subscriptions
    SELECTED_UNIT: 'StateSubscriptionManager.selectedUnit',
    SELECTED_HABITAT: 'StateSubscriptionManager.selectedHabitat',
    TURN: 'StateSubscriptionManager.turn',
  };
  
  // Create a new StateSubscriptionManager
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  // Initialize all renderers and controllers
  public initialize(renderers: {
    animalRenderer: AnimalRenderer;
    habitatRenderer: HabitatRenderer;
    moveRangeRenderer: MoveRangeRenderer;
    animationController: AnimationController;
    tileRenderer: TileRenderer;
    resourceRenderer: ResourceRenderer;
  }): void {
    this.animalRenderer = renderers.animalRenderer;
    this.habitatRenderer = renderers.habitatRenderer;
    this.moveRangeRenderer = renderers.moveRangeRenderer;
    this.animationController = renderers.animationController;
    this.tileRenderer = renderers.tileRenderer; 
    this.resourceRenderer = renderers.resourceRenderer;
    
    // Mark as initialized
    this.initialized = true;
    console.log("StateSubscriptionManager initialized with all renderers");
  }
  
  // Set up all state subscriptions
  setupSubscriptions(onUnitClicked?: (animalId: string, gridX: number, gridY: number) => void): void {
    // Check if properly initialized
    if (!this.initialized) {
      console.error("Cannot set up subscriptions: renderers not initialized");
      return;
    }
    
    // Check if subscriptions are already set up
    if (this.subscriptionsSetup) {
      console.log("Subscriptions already set up, skipping setupSubscriptions()");
      return;
    }
    
    this.setupBoardSubscriptions();
    this.setupEntitySubscriptions(onUnitClicked);
    this.setupResourceSubscriptions();
    this.setupInteractionSubscriptions();
    this.subscriptionsSetup = true;  // Mark subscriptions as set up
    console.log("StateSubscriptionManager subscriptions set up successfully");
  }
  
  // Set up subscriptions related to the game board
  private setupBoardSubscriptions(): void {
    // Keep track of previous board state to compare
    let previousBoardHash = ''; // this is a hack and one day you'll need to fix board state updates for real      
    
    // Subscribe to board changes
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.BOARD,
      (state) => state.board,
      (board) => {
        if (board) {
          // Create a simple hash representing the essential board properties
          // We only care about dimensions and tiles, not unit positions
          const currentBoardHash = `${board.width}-${board.height}`;
          
          // Only recreate board if this is the first time or if essential properties changed
          if (previousBoardHash !== currentBoardHash) {
            console.log("Board dimensions changed, recreating tiles");
            // Update board using tile renderer
            this.tileRenderer.createBoardTiles(board);
            // Update the hash
            previousBoardHash = currentBoardHash;
          } else {
            // Board dimensions haven't changed, skip recreation
            console.log("Skipping board recreation - only unit positions changed");
          }
        }
      },
      { immediate: false, debug: false } // Changed from true to false to prevent duplicate creation
    );
  }
  
  // Set up subscriptions related to game entities (animals, habitats)
  private setupEntitySubscriptions(onUnitClicked?: (animalId: string, gridX: number, gridY: number) => void): void {
    // Subscribe to animal changes
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.ANIMALS,
      (state) => state.animals,
      (animals) => {
        if (animals) {
          // Render animals using animal renderer
          this.animalRenderer.renderAnimals(animals, onUnitClicked);
        }
      },
      { immediate: true, debug: false } // Set immediate: true to render on subscription
    );
    
    // Subscribe to habitat changes (via biomes)
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.HABITATS,
      (state) => state.biomes,
      (biomes, previousBiomes) => {
        if (!biomes) return;
        
        // First render: do a full render of all habitats
        if (!previousBiomes) {
          const habitats = Array.from(biomes.values()).map((biome: Biome) => biome.habitat);
          this.habitatRenderer.renderHabitats(habitats);
          return;
        }
        
        // Update mode: check for biomes with changed lushness
        biomes.forEach((biome, biomeId) => {
          const previousBiome = previousBiomes.get(biomeId);
          
          // If lushness changed, update just that habitat's lushness display
          if (previousBiome && biome.totalLushness !== previousBiome.totalLushness) {
            this.habitatRenderer.updateHabitatTotalLushness(biomeId, biome.totalLushness);
          }
        });
      },
      { immediate: true, debug: false } // Set immediate: true to render on subscription
    );
  }
  
  // Set up subscriptions related to resources
  private setupResourceSubscriptions(): void {
    // Subscribe to resource tile changes
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.RESOURCE_TILES,
      (state) => {
        // If the board isn't initialized yet, return null
        if (!state.board) return null;
        
        // Return an object containing ONLY the properties we care about
        return {
          // Create a hash of resource tiles that ignores unit positions and visibility
          resourceHash: this.calculateResourceHash(state.board)
        };
      },
      (resourceState, prevResourceState) => {
        // Only update if this is the first time or if resources actually changed
        if (resourceState && (!prevResourceState || resourceState.resourceHash !== prevResourceState.resourceHash)) {
          // Get resource tiles and render them
          const resourceTiles = actions.getResourceTiles();
          if (this.resourceRenderer) {
            this.resourceRenderer.renderResourceTiles(resourceTiles);
          }
        }
      },
      { immediate: true, debug: false }
    );
  }
  
  // Helper method to calculate a hash that only considers resource properties
  private calculateResourceHash(board: Board): string {
    // Create a hash that only considers resource properties, not positions or visibility
    let hash = '';
    
    // Loop through the board once to build a string representing just resource states
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const tile = board.tiles[y][x];
        // Only include resource-related properties in the hash
        if (tile.resourceType || tile.active || tile.resourceValue > 0) {
          hash += `${x},${y}:${tile.resourceType || 'none'}:${tile.resourceValue}:${tile.active ? 1 : 0};`;
        }
      }
    }
    
    return hash;
  }
  
  // et up subscriptions related to user interactions and gameplay events
  private setupInteractionSubscriptions(): void {
    // Subscribe to valid moves changes
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.VALID_MOVES,
      (state) => ({ 
        validMoves: state.validMoves, 
        moveMode: state.moveMode 
      }),
      (moveState) => {
        if (moveState.moveMode) {
          this.moveRangeRenderer.showMoveRange(moveState.validMoves, moveState.moveMode);
        } else {
          this.moveRangeRenderer.clearMoveHighlights();
        }
      }
    );
    
    // Subscribe to displacement events
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.DISPLACEMENT,
      (state) => state.displacementEvent,
      (displacementEvent) => {
        // Only animate if displacement actually occurred and all required values are present
        if (
          displacementEvent && 
          displacementEvent.occurred && 
          displacementEvent.unitId &&
          typeof displacementEvent.fromX === 'number' &&
          typeof displacementEvent.fromY === 'number' &&
          typeof displacementEvent.toX === 'number' &&
          typeof displacementEvent.toY === 'number'
        ) {
          console.log("Displacement event detected in StateSubscriptionManager");
          
          // Call the BoardScene's handleDisplacementEvent method
          if (this.scene instanceof BoardScene) {
            // Use the displacement event data to animate the displacement
            this.scene.handleDisplacementEvent(
              displacementEvent.unitId,
              displacementEvent.fromX,
              displacementEvent.fromY,
              displacementEvent.toX,
              displacementEvent.toY
            );
          } else {
            // If the scene isn't a BoardScene, just clear the event
            actions.clearDisplacementEvent();
          }
        } else if (displacementEvent && displacementEvent.occurred) {
          // If we have an incomplete displacement event, log an error and clear it
          console.error("Incomplete displacement event detected", displacementEvent);
          actions.clearDisplacementEvent();
        }
      }
    );
    
    // Subscribe to spawn events
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.SPAWN,
      (state) => state.spawnEvent,
      (spawnEvent) => {
        // Handle spawn events (mainly to update rendering)
        if (spawnEvent && spawnEvent.occurred) {
          console.log("Spawn event detected in StateSubscriptionManager");
          
          // If we have a valid unit ID and the scene is a BoardScene
          if (spawnEvent.unitId && this.scene instanceof BoardScene) {
            // Get the animal that was just spawned
            const animals = actions.getAnimals();
            const spawnedAnimal = animals.find(animal => animal.id === spawnEvent.unitId);
            
            // If we found the animal and fog of war is enabled, reveal tiles around it
            if (spawnedAnimal) {
              const fogOfWarRenderer = this.scene.getFogOfWarRenderer();
              // Check if fog of war is enabled before revealing tiles
              if (fogOfWarRenderer) {
                console.log(`Revealing fog of war around spawned unit at (${spawnedAnimal.position.x}, ${spawnedAnimal.position.y})`);
                
                // Get the board to check boundaries
                const board = actions.getBoard();
                if (board) {
                  // Get tiles around the new position that need to be revealed
                  const adjacentTiles = this.getAdjacentTiles(
                    spawnedAnimal.position.x, 
                    spawnedAnimal.position.y, 
                    board.width, 
                    board.height
                  );
                  
                  // Update visibility in game state
                  // Use batch update for better performance
                  actions.updateTilesVisibility(adjacentTiles.map(tile => ({
                    x: tile.x,
                    y: tile.y,
                    visible: true
                  })));
                  
                  // Remove duplicates and reveal visually
                  const uniqueTiles = this.removeDuplicateTiles(adjacentTiles);
                  fogOfWarRenderer.revealTiles(uniqueTiles);
                }
              }
            }
            
            // Clear the selection indicator
            this.scene.getSelectionRenderer().hideSelection();
          }
          
          // Clear the spawn event after handling it
          actions.clearSpawnEvent();
        }
      }
    );
    
    // Subscribe to biome capture events
    StateObserver.subscribe(
      StateSubscriptionManager.SUBSCRIPTIONS.BIOME_CAPTURE,
      (state) => state.biomeCaptureEvent,
      (biomeCaptureEvent) => {
        // Handle biome capture events
        if (biomeCaptureEvent && biomeCaptureEvent.occurred) {
          // Clear the selection indicator - cast scene to BoardScene to access the method
          if (this.scene instanceof BoardScene) {
            // Hide selection indicator
            this.scene.getSelectionRenderer().hideSelection();
            
            // Reveal the biome tiles for the captured biome
            if (biomeCaptureEvent.biomeId) {
              this.scene.revealBiomeTiles(biomeCaptureEvent.biomeId);
              
              // Update just the captured habitat's ownership status
              // This is more efficient than re-rendering all habitats
              this.habitatRenderer.updateHabitatOwnership(biomeCaptureEvent.biomeId);
            }
          }
          
          // Clear the biome capture event after handling it
          actions.clearBiomeCaptureEvent();
        }
      }
    );
  }
  
  // Clean up all subscriptions
  unsubscribeAll(): void {
    // Unsubscribe from all known subscriptions
    Object.values(StateSubscriptionManager.SUBSCRIPTIONS).forEach(key => {
      StateObserver.unsubscribe(key);
    });
    
    // Reset subscription setup flag
    this.subscriptionsSetup = false;
    
    console.log("All StateSubscriptionManager subscriptions unsubscribed");
  }
  
  // Check if manager is properly initialized
  isInitialized(): boolean {
    return this.initialized;
  }
  
  // Check if subscriptions are currently set up
  isSubscribed(): boolean {
    return this.subscriptionsSetup;
  }
  
  // Get a list of active subscription keys for debugging
  getActiveSubscriptions(): string[] {
    return StateObserver.getActiveSubscriptions();
  }
  
  // Clean up resources and unsubscribe from all state subscriptions
  destroy(): void {
    this.unsubscribeAll();
    this.initialized = false;
  }
  
  // Get the 8 adjacent tiles around a central position
  private getAdjacentTiles(x: number, y: number, boardWidth: number, boardHeight: number): { x: number, y: number }[] {
    const adjacentOffsets = [
      { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
      { x: -1, y: 0 }, /* Center */ { x: 1, y: 0 },
      { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }
    ];
    
    // Include the central tile itself
    const result = [{ x, y }];
    
    // Add all valid adjacent tiles
    adjacentOffsets.forEach(offset => {
      const newX = x + offset.x;
      const newY = y + offset.y;
      
      // Check if coordinates are within board boundaries
      if (newX >= 0 && newX < boardWidth && newY >= 0 && newY < boardHeight) {
        result.push({ x: newX, y: newY });
      }
    });
    
    return result;
  }
  
  // Remove duplicate tiles from an array
  private removeDuplicateTiles(tiles: { x: number, y: number }[]): { x: number, y: number }[] {
    const uniqueKeys = new Set<string>();
    const uniqueTiles: { x: number, y: number }[] = [];
    
    tiles.forEach(tile => {
      const key = `${tile.x},${tile.y}`;
      if (!uniqueKeys.has(key)) {
        uniqueKeys.add(key);
        uniqueTiles.push(tile);
      }
    });
    
    return uniqueTiles;
  }
} 