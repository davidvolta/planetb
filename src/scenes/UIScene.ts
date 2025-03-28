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
          // Update background size when button visibility changes
          this.updateBackgroundSize();
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
    
    // Store reference to background for later resizing
    this.background = uiBackground;
    
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
    if (this.input && this.input.keyboard) {
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
    }

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
    
    // Position the button below the turn indicator and center horizontally
    // Background width is 200, button width is 150, so position at (25, 60) to center
    this.nextTurnButton.setPosition(25, 60);
    
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
    
    // Position the button directly below the next turn button and center horizontally
    // Background width is 200, button width is 150, so position at (25, 110) to center
    this.spawnButton.setPosition(25, 110);
    
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
   */
  handleTileClicked(eventData: any) {
    // Check if the tile contains a dormant unit
    if (eventData.contents && eventData.contents.dormantUnits.length > 0) {
      const dormantUnit = eventData.contents.dormantUnits[0];
      
      // Instead of setting local variables, call an action function
      actions.selectUnit(dormantUnit.id);
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
    if (this.input && this.input.keyboard) {
      this.input.keyboard.off('keydown-S');
      this.input.keyboard.off('keydown-N');
    }
    
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