import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import BoardScene, { EVENTS } from '../scenes/BoardScene';
import DebugScene from '../scenes/DebugScene';
import UIScene from '../scenes/UIScene';
import { MapGenerationType, useGameStore } from '../store/gameStore';
import * as actions from '../store/actions';
import { StateObserver } from '../utils/stateObserver';
import { GAME_WIDTH, GAME_HEIGHT, BOARD_WIDTH_TILES, BOARD_HEIGHT_TILES } from '../constants/gameConfig';

// Define prop types for the Game component
interface GameProps {
  onGameMount?: (game: Phaser.Game) => void;
}

const Game: React.FC<GameProps> = ({ onGameMount }) => {
  const gameContainerRef = React.useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const listenersAttachedRef = useRef<boolean>(false);
  const stateObserverSetupRef = useRef<boolean>(false);
  
  // Create and initialize the game
  useEffect(() => {
    // Don't create the game if the container doesn't exist
    if (!gameContainerRef.current) return;
    
    // Reset the listeners attached flag to ensure proper setup after hot reloads or StrictMode effects
    listenersAttachedRef.current = false;

    const attachSceneListeners = (scene: Phaser.Scene) => {
      // Don't attach listeners if already attached
      if (listenersAttachedRef.current) {
        console.log('Listeners already attached, skipping');
        return;
      }
      
      console.log('Setting up event listeners');
      
      // Remove any existing listeners first
      scene.events.removeAllListeners(EVENTS.ASSETS_LOADED);
      
      // Listen for assets loaded event
      scene.events.on(EVENTS.ASSETS_LOADED, () => {
        console.log('Assets loaded, checking initialization');
        // Only initialize if not already initialized
        if (!actions.isInitialized()) {
          console.log('Board not initialized, initializing now');
          actions.initializeBoard({
            width: BOARD_WIDTH_TILES,
            height: BOARD_HEIGHT_TILES,
            mapType: MapGenerationType.ISLAND
          });
        } else {
          console.log('Board already initialized, skipping initialization');
        }
      });
      
      // Mark listeners as attached
      listenersAttachedRef.current = true;
    };

    // Create config with fixed dimensions
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: '#1c1117',
      parent: gameContainerRef.current,
      scene: [BoardScene, DebugScene, UIScene],
      pixelArt: true,
      antialias: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_WIDTH, 
        height: GAME_HEIGHT
      }
    };

    // Create game instance only once
    if (!gameRef.current) {
      // Create the game
      gameRef.current = new Phaser.Game(config);
      
      // Pass the game instance to the parent component if onGameMount is provided
      if (onGameMount && gameRef.current) {
        onGameMount(gameRef.current);
      }
    }

    // Setup state observer to sync game state with Phaser registry
    const setupStateObserver = () => {
      if (stateObserverSetupRef.current || !gameRef.current) return;
      
      // Subscribe to the entire game state and update the registry
      StateObserver.subscribe(
        'Game.gameStateSync',
        (state) => state, // Select the entire state
        (gameState) => {
          // Update the registry with the current game state
          if (gameRef.current) {
            gameRef.current.registry.set('gameState', gameState);
            // Log with a note that this is a special case between React and Phaser
            console.log('Updated game registry with latest game state (React-Phaser bridge)');
          }
        },
        { immediate: true } // Immediately sync the current state
      );
      
      stateObserverSetupRef.current = true;
      console.log('State observer for game state sync is set up');
    };

    // We don't need the resize handler with FIT mode
    
    // Wait for the board scene to be created, then set up event listeners
    const checkForBoardScene = () => {
      if (gameRef.current) {
        const boardScene = gameRef.current.scene.getScene('BoardScene') as BoardScene;
        if (boardScene) {
          attachSceneListeners(boardScene);
          setupStateObserver(); // Set up state observer once board scene exists
          return true;
        }
      }
      return false;
    };

    let interval: number | null = null;
    if (!checkForBoardScene()) {
      interval = window.setInterval(() => {
        if (checkForBoardScene()) {
          if (interval !== null) {
            clearInterval(interval);
            interval = null;
          }
        }
      }, 100);
    }

    return () => {
      // Clear any pending intervals
      if (interval !== null) {
        clearInterval(interval);
      }
      
      // Clean up event listeners
      if (gameRef.current) {
        const boardScene = gameRef.current.scene.getScene('BoardScene') as BoardScene;
        if (boardScene) {
          boardScene.events.removeAllListeners(EVENTS.ASSETS_LOADED);
        }
        
        // Clean up the game when the component unmounts
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      
      // Unsubscribe from state observer
      StateObserver.unsubscribe('Game.gameStateSync');
      
      // Reset the flags for next mount
      listenersAttachedRef.current = false;
      stateObserverSetupRef.current = false;
    };
  }, [onGameMount]);

  return (
    <div
      ref={gameContainerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '500px',
        background: 'black',
      }}
    />
  );
};

export default Game;