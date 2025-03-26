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
      this.subscriptionKeys.TURN,
      (state: GameState) => state.turn,
      (turn: number) => {
        if (this.turnText) {
          this.turnText.setText(`Turn ${turn}`);
        }
      },
      { immediate: true }
    );

    // Subscribe to selected unit changes
    StateObserver.subscribe(
      this.subscriptionKeys.SELECTED_UNIT,
      (state: GameState) => state.selectedUnitId,
      (unitId: string | null) => {
        this.selectedUnitId = unitId;
        this.updateSpawnButtonVisibility();
      },
      { immediate: true }
    );

    // Subscribe to selected unit dormant state
    StateObserver.subscribe(
      this.subscriptionKeys.SELECTED_UNIT_DORMANT,
      (state: GameState) => state.selectedUnitIsDormant,
      (isDormant: boolean) => {
        this.selectedUnitIsDormant = isDormant;
        this.updateSpawnButtonVisibility();
      },
      { immediate: true }
    );

    // Listen for the resize event to reposition the UI
    this.scale.on('resize', this.resizeUI, this);
  }

  create() {
    // Create a container for UI elements that will be positioned in the top left
    this.container = this.add.container(0, 0);
    
    // Create a semi-transparent background
    this.background = this.add.rectangle(0, 0, 150, 50, 0x000000, 0.7);
    this.background.setOrigin(0);
    this.container.add(this.background);

    // Create the turn text
    const turn = actions.getTurn();
    this.turnText = this.add.text(75, 10, `Turn ${turn}`, {
      fontFamily: 'Raleway',
      fontSize: '20px',
      color: '#FFFFFF'
    });
    this.turnText.setOrigin(0.5, 0);
    this.container.add(this.turnText);

    // Create next turn button
    this.createNextTurnButton();

    // Create spawn button (initially hidden)
    this.createSpawnButton();

    // Position the UI in the top left corner
    this.resizeUI();

    // Set this scene to be above the BoardScene
    this.scene.moveAbove('BoardScene');
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
    
    // Create button text
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
    
    // Create button text
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

  shutdown() {
    // Clean up subscriptions
    Object.values(this.subscriptionKeys).forEach(key => {
      StateObserver.unsubscribe(key);
    });

    // Remove resize event listener
    this.scale.off('resize', this.resizeUI, this);
    
    // Clean up text
    if (this.turnText) {
      this.turnText.destroy();
      this.turnText = null;
    }

    // Clean up spawn button
    if (this.spawnButton) {
      this.spawnButton.destroy();
      this.spawnButton = null;
    }

    // Clean up next turn button
    if (this.nextTurnButton) {
      this.nextTurnButton.destroy();
      this.nextTurnButton = null;
    }

    // Clean up container
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }
} 