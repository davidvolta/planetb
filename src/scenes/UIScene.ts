import Phaser from 'phaser';
import { StateObserver } from '../utils/stateObserver';
import * as actions from '../store/actions';
import { GameState } from '../store/gameStore';
import { EVENTS } from '../scenes/BoardScene';

export default class UIScene extends Phaser.Scene {
  private turnText: Phaser.GameObjects.Text | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private background: Phaser.GameObjects.Rectangle | null = null;
  private spawnButton: Phaser.GameObjects.Container | null = null;
  private nextTurnButton: Phaser.GameObjects.Container | null = null;
  private selectedUnitId: string | null = null;
  private selectedUnitIsDormant: boolean = false;
  

  
  private subscriptionKeys = {
    TURN: 'UIScene.turn',
    SELECTED_UNIT: 'UIScene.selectedUnit',
    SELECTED_UNIT_DORMANT: 'UIScene.selectedUnitDormant'
  };

  constructor() {
    super({ key: 'UIScene', active: true });
  }

  init() {  
    // Subscribe to turn changes
    StateObserver.subscribe(
      'ui-turn',
      (state: GameState) => ({ 
        turn: state.turn,
        selectedUnit: state.selectedUnitId ? state.animals.find(a => a.id === state.selectedUnitId) : null,
        selectedIsDormant: state.selectedUnitIsDormant,
      }),
      (data) => {
        // Update turn display
        if (this.turnText) {
          this.turnText.setText(`Turn: ${data.turn}`);
        }
        
        // Update selected unit details
        this.selectedUnitId = data.selectedUnit?.id || null;
        
        // Show/hide spawn button based on selection
        if (this.spawnButton) {
          this.spawnButton.setVisible(data.selectedUnit !== null && data.selectedIsDormant);
        }
      }
    );

    // Listen for the resize event to reposition the UI
    this.scale.on('resize', this.resizeUI, this);
  }

  create() {
    // Create a container for UI elements that will be positioned in the top left
    this.container = this.add.container(0, 0);
    
    // Add a semi-transparent black background
    const uiBackground = this.add.rectangle(0, 0, 200, 100, 0x000000, 0.5);
    uiBackground.setOrigin(0, 0);
    this.container.add(uiBackground);
    
    // Add turn text
    this.turnText = this.add.text(100, 10, 'Turn: 1', { 
      fontSize: '24px',
      color: '#FFFFFF'
    });
    this.turnText.setOrigin(0.5, 0);
    this.container.add(this.turnText);

    // Position the UI in the top left corner
    this.container.setPosition(10, 10);
    
    // Create next turn button
    this.createNextTurnButton();
    
    // Create spawn button (initially hidden)
    this.createSpawnButton();
    
    // Set up keyboard shortcuts
    // The 'S' key for spawn
    this.input.keyboard.on('keydown-S', () => {
      // Only handle if spawn button is visible
      if (this.spawnButton && this.spawnButton.visible) {
        this.handleSpawnUnit();
      }
    });
    
    // The 'N' key for next turn
    this.input.keyboard.on('keydown-N', () => {
      this.handleNextTurn();
    });

    // PHASE 3: Connect UIScene to tile click system
    // Add event listener for tile clicks from BoardScene
    const boardScene = this.scene.get('BoardScene');
    if (boardScene && boardScene.events) {
      // Listen for tile clicked events with enhanced tile contents data
      boardScene.events.on(EVENTS.TILE_CLICKED, this.handleTileClicked, this);
    }
  }

  createNextTurnButton() {
    // Create a container for the next turn button
    this.nextTurnButton = this.add.container(0, 0);
    
    // Create button background - changed to medium gray
    const buttonBg = this.add.rectangle(0, 0, 150, 40, 0x808080, 1);
    buttonBg.setOrigin(0);
    buttonBg.setInteractive({ useHandCursor: true })
      .on('pointerdown', this.handleNextTurn, this)
      .on('pointerover', () => buttonBg.setFillStyle(0xA0A0A0))
      .on('pointerout', () => buttonBg.setFillStyle(0x808080));
    
    // Create button text with keyboard shortcut
    const buttonText = this.add.text(75, 20, 'Next Turn', {
      fontFamily: 'Raleway',
      fontSize: '16px',
      color: '#FFFFFF'
    });
    buttonText.setOrigin(0.5);
    
    // Add to container
    this.nextTurnButton.add(buttonBg);
    this.nextTurnButton.add(buttonText);
    
    // Position the button below the turn indicator
    this.nextTurnButton.setPosition(0, 60);
    
    // Add to main container
    this.container?.add(this.nextTurnButton);
  }

  createSpawnButton() {
    // Create a container for the spawn button
    this.spawnButton = this.add.container(0, 0);
    this.spawnButton.setVisible(false);
    
    // Create button background - changed to medium gray
    const buttonBg = this.add.rectangle(0, 0, 150, 40, 0x808080, 1);
    buttonBg.setOrigin(0);
    buttonBg.setInteractive({ useHandCursor: true })
      .on('pointerdown', this.handleSpawnUnit, this)
      .on('pointerover', () => buttonBg.setFillStyle(0xA0A0A0))
      .on('pointerout', () => buttonBg.setFillStyle(0x808080));
    
    // Create button text with shortcut hint
    const buttonText = this.add.text(75, 20, 'Spawn Unit', {
      fontFamily: 'Raleway',
      fontSize: '16px',
      color: '#FFFFFF'
    });
    buttonText.setOrigin(0.5);
    
    // Add to container
    this.spawnButton.add(buttonBg);
    this.spawnButton.add(buttonText);
    
    // Position the button below the next turn button
    this.spawnButton.setPosition(0, 110);
    
    // Add to main container
    this.container?.add(this.spawnButton);
  }

  handleNextTurn() {
    const nextTurn = actions.getNextTurn();
    nextTurn();
  }

  handleSpawnUnit() {
    if (this.selectedUnitId) {
      actions.evolveAnimal(this.selectedUnitId);
      actions.deselectUnit();
      
      // Record the spawn event in state instead of emitting a direct event
      actions.recordSpawnEvent(this.selectedUnitId);
    }
  }

  updateSpawnButtonVisibility() {
    if (this.spawnButton) {
      this.spawnButton.setVisible(!!this.selectedUnitId && this.selectedUnitIsDormant);
      
      // Adjust background height based on button visibility
      this.updateBackgroundSize();
    }
  }

  updateBackgroundSize() {
    if (this.background) {
      // Base height includes Turn indicator and Next Turn button
      let height = 110;
      
      // Add height for Spawn button if visible
      if (this.spawnButton && this.spawnButton.visible) {
        height += 50;
      }
      
      this.background.height = height;
      
      // Update UI position to account for size change
      this.resizeUI();
    }
  }

  resizeUI() {
    if (!this.container || !this.background || !this.turnText) return;

    // Get the current game size
    const width = this.scale.width;
    const height = this.scale.height;
    
    // Position the container in the top left with some padding
    const padding = 20;
    this.container.setPosition(padding, padding);
  }

  /**
   * Handle tile clicked events from BoardScene
   * Uses the enhanced tile contents data from Phase 2
   */
  handleTileClicked(eventData: any) {
    console.log('UIScene received tile click at', eventData.x, eventData.y);
    
    // Check if the tile contains a dormant unit
    if (eventData.contents && eventData.contents.dormantUnits.length > 0) {
      const dormantUnit = eventData.contents.dormantUnits[0];
      
      // Set selected unit to the dormant unit
      this.selectedUnitId = dormantUnit.id;
      this.selectedUnitIsDormant = true;
      
      // Show the spawn button
      this.updateSpawnButtonVisibility();
      
      console.log('UIScene: Dormant unit selected, showing spawn button');
    } else {
      // If no dormant unit at the location, don't change anything
      // The state subscription will handle deselection if needed
    }
  }

  /**
   * Clean up when scene is shut down
   */
  shutdown() {
    // Clean up any resources
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
    
    if (this.spawnButton) {
      this.spawnButton.destroy();
      this.spawnButton = null;
    }
    
    if (this.nextTurnButton) {
      this.nextTurnButton.destroy();
      this.nextTurnButton = null;
    }
    
    // Clean up keyboard listeners
    this.input.keyboard.off('keydown-S');
    this.input.keyboard.off('keydown-N');
    
    // PHASE 3: Clean up event listeners
    // Remove tile click event listener to prevent memory leaks
    const boardScene = this.scene.get('BoardScene');
    if (boardScene && boardScene.events) {
      boardScene.events.removeListener(EVENTS.TILE_CLICKED, this.handleTileClicked, this);
    }
    
    // Clean up references
    this.turnText = null;
    this.selectedUnitId = null;
  }
} 