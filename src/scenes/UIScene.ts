import Phaser from 'phaser';
import { StateObserver } from '../utils/stateObserver';
import * as actions from '../store/actions';
import { GameState } from '../store/gameStore';

export default class UIScene extends Phaser.Scene {
  private turnText: Phaser.GameObjects.Text | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private background: Phaser.GameObjects.Rectangle | null = null;
  private spawnButton: Phaser.GameObjects.Container | null = null;
  private nextTurnButton: Phaser.GameObjects.Container | null = null;
  private selectedUnitId: string | null = null;
  private captureBiomeButton: Phaser.GameObjects.Container | null = null;
  private regenerateResourcesButton: Phaser.GameObjects.Container | null = null;
  

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
          selectedBiomeId: state.selectedBiomeId
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
        
        // Show/hide biome capture button based on biome selection and unit presence
        if (this.captureBiomeButton) {
          const selectedBiomeId = data.selectedBiomeId;
          const isAvailable = selectedBiomeId !== null && actions.isSelectedBiomeAvailableForCapture();
          const canCapture = isAvailable && actions.canCaptureBiome(selectedBiomeId);
          this.captureBiomeButton.setVisible(canCapture);
          
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
    
    // Create capture biome button (initially hidden)
    this.createCaptureBiomeButton();
    
    // Create regenerate resources button
    this.createRegenerateResourcesButton();
    
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

  createCaptureBiomeButton() {
    // Create a container for the capture biome button
    this.captureBiomeButton = this.add.container(0, 0);
    this.captureBiomeButton.setVisible(false);
    
    // Create button background - medium gray
    const buttonBg = this.add.rectangle(0, 0, 150, 40, 0x808080, 1);
    buttonBg.setOrigin(0);
    buttonBg.setInteractive({ useHandCursor: true })
      .on('pointerdown', this.handleCaptureBiome, this)
      .on('pointerover', () => buttonBg.setFillStyle(0xA0A0A0))
      .on('pointerout', () => buttonBg.setFillStyle(0x808080));
    
    // Create button text
    const buttonText = this.add.text(75, 20, 'Capture Biome', {
      fontFamily: 'Raleway',
      fontSize: '16px',
      color: '#FFFFFF'
    });
    buttonText.setOrigin(0.5);
    
    // Add to container
    this.captureBiomeButton.add(buttonBg);
    this.captureBiomeButton.add(buttonText);
    
    // Position will be set dynamically in updateBackgroundSize
    
    // Add to main container
    this.container?.add(this.captureBiomeButton);
  }

  createRegenerateResourcesButton() {
    // Create a container for the regenerate resources button
    this.regenerateResourcesButton = this.add.container(0, 0);
    
    // Create button background - use a green color for the regenerate button
    const buttonBg = this.add.rectangle(0, 0, 150, 40, 0x2E8B57, 1);
    buttonBg.setOrigin(0);
    buttonBg.setInteractive({ useHandCursor: true })
      .on('pointerdown', this.handleRegenerateResources, this)
      .on('pointerover', () => buttonBg.setFillStyle(0x3CB371))
      .on('pointerout', () => buttonBg.setFillStyle(0x2E8B57));
    
    // Create button text
    const buttonText = this.add.text(75, 20, 'Regenerate Resources', {
      fontFamily: 'Raleway',
      fontSize: '14px',
      color: '#FFFFFF'
    });
    buttonText.setOrigin(0.5);
    
    // Add to container
    this.regenerateResourcesButton.add(buttonBg);
    this.regenerateResourcesButton.add(buttonText);
    
    // Position will be set in updateBackgroundSize
    
    // Add to main container
    this.container?.add(this.regenerateResourcesButton);
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

  handleCaptureBiome() {
    const selectedBiomeId = actions.getSelectedBiomeId();
    
    if (selectedBiomeId && actions.canCaptureBiome(selectedBiomeId)) {
      // Call the capture biome action
      actions.captureBiome(selectedBiomeId);
      
      actions.selectBiome(null); // Deselect the biome after capturing
    }
  }

  handleRegenerateResources() {
    // Get the BoardScene instance
    const boardScene = this.scene.get('BoardScene');
    
    // Call regenerateResources on BoardScene if it exists
    if (boardScene && typeof (boardScene as any).regenerateResources === 'function') {
      (boardScene as any).regenerateResources();
    } else {
      console.warn("BoardScene or regenerateResources method not found");
    }
  }

  updateBackgroundSize() {
    if (this.background) {
      // Start with a base height
      let height = 110;
      
      // Position buttons - these positions may need to be adjusted
      if (this.captureBiomeButton) {
        this.captureBiomeButton.setPosition(25, 110);
      }
      
      if (this.spawnButton) {
        this.spawnButton.setPosition(25, 110);
      }
      
      // Add height for one button if either is visible
      if ((this.spawnButton && this.spawnButton.visible) || 
          (this.captureBiomeButton && this.captureBiomeButton.visible)) {
        height += 50;
      }
      
      // Position and add height for the regenerate resources button
      if (this.regenerateResourcesButton) {
        this.regenerateResourcesButton.setPosition(25, height);
        height += 50;
      }
      
      // Add some padding
      height += 10;
      
      // Update background height
      this.background.height = height;
      
      // Reposition UI after height change
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
    // Clean up subscriptions
    StateObserver.unsubscribe('ui-turn');
    
    // Clean up resize listener
    this.scale.off('resize', this.resizeUI, this);
    
    // Clean up references to UI components
    this.container = null;
    this.background = null;
    
    if (this.nextTurnButton) {
      this.nextTurnButton.destroy();
      this.nextTurnButton = null;
    }
    
    if (this.spawnButton) {
      this.spawnButton.destroy();
      this.spawnButton = null;
    }
    
    if (this.captureBiomeButton) {
      this.captureBiomeButton.destroy();
      this.captureBiomeButton = null;
    }
    
    if (this.regenerateResourcesButton) {
      this.regenerateResourcesButton.destroy();
      this.regenerateResourcesButton = null;
    }
    
    this.turnText = null;
    this.selectedUnitId = null;
  }
} 