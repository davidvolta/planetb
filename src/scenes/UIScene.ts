import Phaser from 'phaser';
import { StateObserver } from '../utils/stateObserver';
import * as actions from '../store/actions';
import { GameState } from '../store/gameStore';
import { HabitatState } from '../store/gameStore';

export default class UIScene extends Phaser.Scene {
  private turnText: Phaser.GameObjects.Text | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private background: Phaser.GameObjects.Rectangle | null = null;
  private spawnButton: Phaser.GameObjects.Container | null = null;
  private nextTurnButton: Phaser.GameObjects.Container | null = null;
  private selectedUnitId: string | null = null;
  private improveHabitatButton: Phaser.GameObjects.Container | null = null;
  

  constructor() {
    super({ key: 'UIScene', active: true });
  }

  init() {  
    // Subscribe to state changes
    StateObserver.subscribe(
      'ui-turn',
      (state: GameState) => {
        return { 
          turn: state.turn,
          selectedUnit: state.selectedUnitId ? state.animals.find(a => a.id === state.selectedUnitId) : null,
          selectedIsDormant: state.selectedUnitIsDormant,
          selectedHabitatId: state.selectedHabitatId,
          selectedHabitatIsPotential: state.selectedHabitatIsPotential
        };
      },
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
        
        // Show/hide improve habitat button based on habitat selection and unit presence
        if (this.improveHabitatButton) {
          const canImprove = data.selectedHabitatId !== null && 
                           data.selectedHabitatIsPotential && 
                           actions.canImproveHabitat(data.selectedHabitatId);
          
          this.improveHabitatButton.setVisible(canImprove);
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
    
    // Create improve habitat button (initially hidden)
    this.createImproveHabitatButton();
    
    // Update background size and position buttons correctly
    this.updateBackgroundSize();
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
    
    // Position the button directly below the next turn button
    this.spawnButton.setPosition(25, 110);
    
    // Add to main container
    this.container?.add(this.spawnButton);
  }

  createImproveHabitatButton() {
    // Create a container for the improve habitat button
    this.improveHabitatButton = this.add.container(0, 0);
    this.improveHabitatButton.setVisible(false);
    
    // Create button background - medium gray
    const buttonBg = this.add.rectangle(0, 0, 150, 40, 0x808080, 1);
    buttonBg.setOrigin(0);
    buttonBg.setInteractive({ useHandCursor: true })
      .on('pointerdown', this.handleImproveHabitat, this)
      .on('pointerover', () => buttonBg.setFillStyle(0xA0A0A0))
      .on('pointerout', () => buttonBg.setFillStyle(0x808080));
    
    // Create button text
    const buttonText = this.add.text(75, 20, 'Improve Habitat', {
      fontFamily: 'Raleway',
      fontSize: '16px',
      color: '#FFFFFF'
    });
    buttonText.setOrigin(0.5);
    
    // Add to container
    this.improveHabitatButton.add(buttonBg);
    this.improveHabitatButton.add(buttonText);
    
    // Position will be set dynamically in updateBackgroundSize
    
    // Add to main container
    this.container?.add(this.improveHabitatButton);
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

  handleImproveHabitat() {
    const selectedHabitatId = actions.getSelectedHabitatId();
    if (selectedHabitatId && actions.canImproveHabitat(selectedHabitatId)) {
      // Call the improve habitat action
      actions.improveHabitat(selectedHabitatId);
      actions.selectHabitat(null); // Deselect the habitat after improving
      
      // Let the player decide when to end their turn
    }
  }

  updateBackgroundSize() {
    if (this.background) {
      // Base height includes Turn indicator and Next Turn button
      let height = 110;
      
      // Position both buttons in the same spot (only one will be visible at a time)
      if (this.improveHabitatButton) {
        this.improveHabitatButton.setPosition(25, 110);
      }
      
      if (this.spawnButton) {
        this.spawnButton.setPosition(25, 110);
      }
      
      // Add height for one button if either is visible
      if ((this.spawnButton && this.spawnButton.visible) || 
          (this.improveHabitatButton && this.improveHabitatButton.visible)) {
        height += 50;
      }
      
      // Add a small padding at the bottom
      height += 10;
      
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

  // Clean up when scene is shut down
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
    
    if (this.improveHabitatButton) {
      this.improveHabitatButton.destroy();
      this.improveHabitatButton = null;
    }
    
    // Clean up references
    this.turnText = null;
    this.selectedUnitId = null;
  }
} 