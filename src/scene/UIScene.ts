import Phaser from 'phaser';
import { StateObserver } from '../utils/stateObserver';
import * as actions from '../store/actions';
import { GameState, Biome } from '../store/gameStore';
import type BoardScene from './BoardScene';
import { TurnController } from '../game/TurnController';
import type { GameController } from '../game/GameController';
import { CommandExecutor } from '../game/CommandExecutor';

export default class UIScene extends Phaser.Scene {
  private turnText: Phaser.GameObjects.Text | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private background: Phaser.GameObjects.Rectangle | null = null;
  private spawnButton: Phaser.GameObjects.Container | null = null;
  private nextTurnButton: Phaser.GameObjects.Container | null = null;
  private nextTurnText: Phaser.GameObjects.Text | null = null;
  private nextTurnButtonBg: Phaser.GameObjects.Rectangle | null = null;
  private selectedAnimalID: string | null = null;
  private selectedEggId: string | null = null;
  private captureBiomeButton: Phaser.GameObjects.Container | null = null;
  private harvestButton: Phaser.GameObjects.Container | null = null;
  private energyText: Phaser.GameObjects.Text | null = null;
  private gameController!: GameController;
  private turnController!: TurnController;
  private isProcessingNextTurn: boolean = false;
  
  // Biome info panel properties
  private biomeInfoPanel: Phaser.GameObjects.Container | null = null;
  private biomeInfoBackground: Phaser.GameObjects.Rectangle | null = null;
  private biomeInfoTexts: { [key: string]: Phaser.GameObjects.Text } = {};
  private selectedBiomeId: string | null = null;
  

  constructor() {
    super({ key: 'UIScene', active: true });
  }

  init() {
    // Grab controllers from the BoardScene
    const boardScene = this.scene.get('BoardScene') as BoardScene;
    this.gameController = boardScene.getGameController();
    this.turnController = boardScene.getTurnController();

    // Subscribe to state changes
    StateObserver.subscribe(
      'ui-turn',
      (state: GameState) => {
        const player = state.players.find(p => p.id === state.activePlayerId);
        return {
          turn: state.turn,
          selectedAnimal: state.selectedAnimalID ? state.animals.find(a => a.id === state.selectedAnimalID) : null,
          selectedEggId: state.selectedEggId,
          selectedBiomeId: state.selectedBiomeId,
          activePlayerName: player ? player.name : `Player ${state.activePlayerId}`
        };
      },
      (data) => {
        // Update turn display
        if (this.turnText) {
          this.turnText.setText(`Turn: ${data.turn}`);
        }
        
        // Update End Turn button label
        if (this.nextTurnText) {
          this.nextTurnText.setText(`End ${data.activePlayerName} Turn`);
        }
        
        // Update selected animal details
        this.selectedAnimalID = data.selectedAnimal?.id || null;
        this.selectedEggId = data.selectedEggId || null;
        
        // Show/hide spawn button based on selection
        if (this.spawnButton) {
          this.spawnButton.setVisible(!!data.selectedEggId);
          // Update background size when button visibility changes
          this.updateBackgroundSize();
        }
        
        // Show/hide biome capture button based on biome selection and animal presence
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

    // Subscribe to energy updates (no immediate initial callback)
    StateObserver.subscribe(
      'ui-energy',
      (state: GameState) => ({ energy: state.players[state.activePlayerId]?.energy ?? 0 }),
      (data) => {
        this.energyText?.setText(`Energy: ${Math.floor(data.energy)}`);
      },
      { immediate: false }
    );

    // Subscribe to biome selection changes for info panel
    StateObserver.subscribe(
      'ui-biome-info',
      (state: GameState) => {
        // Return the selected biome if available
        if (state.selectedBiomeId) {
          const biome = state.biomes.get(state.selectedBiomeId);
          return {
            biomeId: state.selectedBiomeId,
            biome: biome || null
          };
        }
        return {
          biomeId: null,
          biome: null
        };
      },
      (data) => {
        // Update biome info panel based on selection
        this.selectedBiomeId = data.biomeId;
        
        if (data.biomeId && data.biome) {
          // Update and show the biome info panel
          this.updateBiomeInfoPanel(data.biome);
          if (this.biomeInfoPanel) {
            this.biomeInfoPanel.setVisible(true);
          }
        } else {
          // Hide the biome info panel
          if (this.biomeInfoPanel) {
            this.biomeInfoPanel.setVisible(false);
          }
        }
      }
    );

    // Listen for the resize event to reposition the UI
    this.scale.on('resize', this.resizeUI, this);

    // Subscribe to resource selection and resourceValue to show/hide Harvest button
    StateObserver.subscribe(
      'ui-resource',
      (state: GameState) => {
        const coord = state.selectedResource;
        if (!coord || !state.board) {
          return { hasResource: false };
        }
        const tile = state.board.tiles[coord.y][coord.x];
        const hasResource = tile.active && tile.resourceValue > 0;
        return { hasResource };
      },
      (data) => {
        // Always hide biome info when resource selection changes
        if (this.biomeInfoPanel) {
          this.biomeInfoPanel.setVisible(false);
        }
        this.harvestButton?.setVisible(data.hasResource);
        this.updateBackgroundSize();
      },
      { immediate: false }
    );
  }

  create() {
    // Create a container for UI elements that will be positioned in the top left
    this.container = this.add.container(0, 0);
    // Instantiate GameController facade
    const boardScene = this.scene.get('BoardScene') as BoardScene;    
    
    // Add a semi-transparent black background
    const uiBackground = this.add.rectangle(0, 0, 275, 100, 0x000000, 0.5);
    uiBackground.setOrigin(0, 0);
    this.container.add(uiBackground);
    
    // Store reference to background for later resizing
    this.background = uiBackground;
    
    // Add turn text
    this.turnText = this.add.text(25, 10, 'Turn: 1', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#FFFFFF'
    }).setOrigin(0, 0);
    this.container.add(this.turnText);

    // Position the UI in the top left corner
    this.container.setPosition(10, 10);    
    this.createNextTurnButton();    
    this.createSpawnButton();    
    this.createCaptureBiomeButton();    
    this.createBiomeInfoPanel();    
    this.createEnergyText();
    this.createHarvestButton();
    
    // Update background size and position buttons correctly
    this.updateBackgroundSize();
    
    // Add input listener to hide biome info when clicking elsewhere
    //this.input.on('pointerdown', this.hideBiomeInfoIfClickedOutside, this);
    this.input.keyboard?.on('keydown-H', this.handleHarvest, this);
    this.input.keyboard?.on('keydown-S', this.handleSpawnUnit, this);
    this.input.keyboard?.on('keydown-N', this.handleNextTurn, this);
    this.input.keyboard?.on('keydown-C', this.handleCaptureBiome, this);
  }

  createNextTurnButton() {
    // Create a container for the next turn button
    this.nextTurnButton = this.add.container(0, 0);
    
    // Create button background - changed to medium gray
    const buttonBg = this.add.rectangle(0, 0, 150, 40, 0x808080, 1);
    this.nextTurnButtonBg = buttonBg;
    buttonBg.setOrigin(0);
    buttonBg.setInteractive({ useHandCursor: true })
      .on('pointerdown', this.handleNextTurn, this)
      .on('pointerover', () => buttonBg.setFillStyle(0xA0A0A0))
      .on('pointerout', () => buttonBg.setFillStyle(0x808080));
    
    // Create button text with keyboard shortcut and active player
    const players = actions.getPlayers();
    const currentId = actions.getActivePlayerId();
    const currentPlayer = players.find(p => p.id === currentId);
    const currentName = currentPlayer ? currentPlayer.name : `Player ${currentId}`;
    const buttonText = this.add.text(75, 20, `End ${currentName} Turn`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#FFFFFF'
    });
    buttonText.setOrigin(0.5);
    this.nextTurnText = buttonText;
    
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
    const buttonText = this.add.text(75, 20, 'Hatch Egg', {
      fontFamily: 'Arial',
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
      fontFamily: 'Arial',
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

  createEnergyText() {
    // Create energy display next to the turn counter on the same line
    this.energyText = this.add.text(0, 0, 'Energy: 0', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#FFFFFF'
    }).setOrigin(0, 0);
    this.container?.add(this.energyText);
    // Position energy text to the right of turnText
    if (this.turnText) {
      // Place energy text to the right of turnText with increased padding
      const turnRight = this.turnText.x + this.turnText.width;
      const padding = 40;
      this.energyText.setPosition(turnRight + padding, this.turnText.y);
    } else {
      // Fallback position if turnText is unavailable
      this.energyText.setPosition(25 + this.energyText.width + 20, 10);
    }
  }

  createHarvestButton() {
    this.harvestButton = this.add.container(0, 0);
    const bg = this.add.rectangle(0, 0, 150, 40, 0x808080, 1);
    bg.setOrigin(0);
    bg.setInteractive({ useHandCursor: true })
      .on('pointerdown', this.handleHarvest, this)
      .on('pointerover', () => bg.setFillStyle(0xA0A0A0))
      .on('pointerout', () => bg.setFillStyle(0x808080));
    const text = this.add.text(75, 20, 'Harvest', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#FFFFFF'
    });
    text.setOrigin(0.5);
    this.harvestButton.add(bg);
    this.harvestButton.add(text);
    this.container?.add(this.harvestButton);
    // Hide harvest button until a resource is selected
    this.harvestButton.setVisible(false);
  }

  async handleNextTurn(): Promise<void> {
    if (this.isProcessingNextTurn) return;
    this.isProcessingNextTurn = true;
    this.nextTurnButtonBg?.disableInteractive();
    // Capture the player whose turn is ending
    const prevPlayerId = actions.getActivePlayerId();
    // Execute one full turn (human and optional AI)
    const boardScene = this.scene.get('BoardScene') as BoardScene;
    await boardScene.getTurnController().next();

    // Pan camera to the next active player's closest active animal
    const camMgr = boardScene.getCameraManager();
    await camMgr.centerCameraOnClosestAnimal(
      boardScene.getTileSize(),
      boardScene.getTileHeight(),
      boardScene.getAnchorX(),
      boardScene.getAnchorY()
    );
    this.nextTurnButtonBg?.setInteractive({ useHandCursor: true });
    this.isProcessingNextTurn = false;
  }

  public async handleSpawnUnit(): Promise<void> {
    if (!this.selectedEggId) return;
  
    const boardScene = this.scene.get('BoardScene') as BoardScene;
    const gameController = boardScene.getGameController();
    const executor = new CommandExecutor(gameController);
  
    await executor.execute({
      type: 'spawn',
      animalId: this.selectedEggId,
    });
  }

  public async handleCaptureBiome(): Promise<void> {
    const selectedBiomeId = actions.getSelectedBiomeId();
    if (!selectedBiomeId) return;
  
    const boardScene = this.scene.get('BoardScene') as BoardScene;
    const gameController = boardScene.getGameController();
    const executor = new CommandExecutor(gameController);
  
    await executor.execute({
      type: 'capture',
      biomeId: selectedBiomeId,
    });
  }

  public async handleHarvest(): Promise<void> {
    const coord = actions.getSelectedResource();
    if (!coord) return;
  
    const boardScene = this.scene.get('BoardScene') as BoardScene;
    const gameController = boardScene.getGameController();
    if (!gameController) {
      console.warn('[UIScene] GameController not available yet');
      return;
    }
  
    const executor = new CommandExecutor(gameController);
    await executor.execute({
      type: 'harvest',
      x: coord.x,
      y: coord.y,
      amount: 3,
    });
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
      
      // Position harvest button below action buttons
      if (this.harvestButton) {
        const hasButtons = (this.spawnButton && this.spawnButton.visible) ||
                           (this.captureBiomeButton && this.captureBiomeButton.visible);
        const yPos = hasButtons ? 160 : 110;
        this.harvestButton.setPosition(25, yPos);
      }
      
      // Add height for one button if either is visible
      if ((this.spawnButton && this.spawnButton.visible) || 
          (this.captureBiomeButton && this.captureBiomeButton.visible)) {
        height += 50;
      }
      
      // Add height for harvest button row
      if (this.harvestButton && this.harvestButton.visible) {
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
    
    // Reposition biome info panel in the top right corner
    if (this.biomeInfoPanel) {
      this.biomeInfoPanel.setPosition(width - 320 - padding, padding);
    }
  }

  // Create the biome info panel
  createBiomeInfoPanel() {
    // Create a container for the biome info panel
    this.biomeInfoPanel = this.add.container(0, 0);
    
    // Create panel background
    const panelBg = this.add.rectangle(0, 0, 320, 320, 0x000000, 0.5);
    panelBg.setOrigin(0, 0);
    this.biomeInfoPanel.add(panelBg);
    this.biomeInfoBackground = panelBg;
    
    // Create title
    const titleText = this.add.text(160, 15, 'Biome Information', {
      fontFamily: 'Arial',
      fontSize: '26px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    });
    titleText.setOrigin(0.5, 0);
    this.biomeInfoPanel.add(titleText);
    
    // Create text fields for biome properties
    const textFields = [
      { key: 'id', label: 'Biome ID' },
      { key: 'baseLushness', label: 'Base Lushness' },
      { key: 'lushnessBoost', label: 'Lushness Boost' },
      { key: 'totalLushness', label: 'Total Lushness' },
      { key: 'initialResourceCount', label: 'Initial Resources' },
      { key: 'nonDepletedCount', label: 'Active Resources' },
      { key: 'totalHarvested', label: 'Resources Harvested' },
      { key: 'eggCount', label: 'Egg Count' },
      { key: 'owner', label: 'Owner' }
    ];
    
    // Create and position text fields
    textFields.forEach((field, index) => {
      const y = 55 + (index * 30);
      const labelText = this.add.text(15, y, `${field.label}:`, {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#FFFFFF'
      });
      labelText.setOrigin(0, 0);
      
      const valueText = this.add.text(305, y, '-', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#FFFFFF'
      });
      valueText.setOrigin(1, 0);
      
      if (this.biomeInfoPanel) {
        this.biomeInfoPanel.add(labelText);
        this.biomeInfoPanel.add(valueText);
      }
      
      // Store reference to value text for updating
      this.biomeInfoTexts[field.key] = valueText;
    });
    
    // Position the panel in the top right corner
    const padding = 20;
    this.biomeInfoPanel.setPosition(this.scale.width - 320 - padding, padding);
    
    // Initially hide the panel
    this.biomeInfoPanel.setVisible(false);
  }

  // Update the biome info panel with current biome data
  updateBiomeInfoPanel(biome: Biome) {
    if (!this.biomeInfoPanel || !biome) return;
    
    // Update all text fields with biome data
    // ID (shortened if too long)
    const shortId = biome.id.length > 10 ? biome.id.substring(0, 8) + '...' : biome.id;
    if (this.biomeInfoTexts['id']) {
      this.biomeInfoTexts['id'].setText(shortId);
    }
    
    // Lushness values
    if (this.biomeInfoTexts['baseLushness']) {
      this.biomeInfoTexts['baseLushness'].setText(biome.baseLushness.toFixed(1));
    }
    
    if (this.biomeInfoTexts['lushnessBoost']) {
      this.biomeInfoTexts['lushnessBoost'].setText(biome.lushnessBoost.toFixed(1));
    }
    
    // Set color for total lushness based on threshold
    const totalLushnessText = this.biomeInfoTexts['totalLushness'];
    if (totalLushnessText) {
      totalLushnessText.setText(biome.totalLushness.toFixed(1));
      totalLushnessText.setColor(biome.totalLushness >= 7.0 ? '#00FF00' : '#FF0000');
    }
    
    // Resource counts
    if (this.biomeInfoTexts['initialResourceCount']) {
      this.biomeInfoTexts['initialResourceCount'].setText(Math.floor(biome.initialResourceCount).toString());
    }
    
    if (this.biomeInfoTexts['nonDepletedCount']) {
      this.biomeInfoTexts['nonDepletedCount'].setText(Math.floor(biome.nonDepletedCount).toString());
    }
    
    if (this.biomeInfoTexts['totalHarvested']) {
      this.biomeInfoTexts['totalHarvested'].setText(Math.floor(biome.totalHarvested).toString());
    }
    
    // Egg count
    if (this.biomeInfoTexts['eggCount']) {
      this.biomeInfoTexts['eggCount'].setText(actions.getEggCountForBiome(biome.id).toString());
    }
    
    // Owner info
    if (this.biomeInfoTexts['owner']) {
      const ownerText = biome.ownerId !== null ? `Player ${biome.ownerId}` : 'None';
      this.biomeInfoTexts['owner'].setText(ownerText);
      this.biomeInfoTexts['owner'].setColor(biome.ownerId !== null ? '#00FF00' : '#AAAAAA');
    }
  }


  // Clean up when scene is shut down
  shutdown() {
    // Clean up subscriptions
    StateObserver.unsubscribe('ui-turn');
    StateObserver.unsubscribe('ui-biome-info');
    StateObserver.unsubscribe('ui-energy');
    
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
    
    if (this.harvestButton) {
      this.harvestButton.destroy();
      this.harvestButton = null;
    }
    
    if (this.energyText) {
      this.energyText.destroy();
      this.energyText = null;
    }
    
    // Clean up biome info panel
    if (this.biomeInfoPanel) {
      this.biomeInfoPanel.destroy();
      this.biomeInfoPanel = null;
      this.biomeInfoBackground = null;
      this.biomeInfoTexts = {};
    }
    
    this.turnText = null;
    this.selectedAnimalID = null;
    this.selectedEggId = null;
    this.selectedBiomeId = null;
  }
  
} 