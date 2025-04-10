import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import BoardScene, { EVENTS } from '../scenes/BoardScene';
import DebugScene from '../scenes/DebugScene';
import UIScene from '../scenes/UIScene';
import { MapGenerationType } from '../store/gameStore';
import * as actions from '../store/actions';
import { StateObserver } from '../utils/stateObserver';

// Define prop types for the Game component
interface GameProps {
  onGameMount?: (game: Phaser.Game) => void;
}

const Game: React.FC<GameProps> = ({ onGameMount }) => {
  const gameContainerRef = React.useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const listenersAttachedRef = useRef<boolean>(false);
  
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
            width: 30,
            height: 30,
            mapType: MapGenerationType.ISLAND
          });
        } else {
          console.log('Board already initialized, skipping initialization');
        }
      });
      
      // Mark listeners as attached
      listenersAttachedRef.current = true;
    };

    // Calculate initial size
    const width = gameContainerRef.current.clientWidth;
    const height = gameContainerRef.current.clientHeight;

    // Create config
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width,
      height,
      backgroundColor: '#1c1117',
      parent: gameContainerRef.current,
      scene: [BoardScene, DebugScene, UIScene],
      antialias: false, // true (default) or false
      pixelArt: true, // Ensures sharp pixel rendering
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: '100%',
        height: '100%'
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

    // Set up window resize handler
    const handleResize = () => {
      if (gameRef.current) {
        const newWidth = gameContainerRef.current?.clientWidth || width;
        const newHeight = gameContainerRef.current?.clientHeight || height;
        gameRef.current.scale.resize(newWidth, newHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    // Wait for the board scene to be created, then set up event listeners
    const checkForBoardScene = () => {
      if (gameRef.current) {
        const boardScene = gameRef.current.scene.getScene('BoardScene') as BoardScene;
        if (boardScene) {
          attachSceneListeners(boardScene);
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
      // Clean up all resources when the component unmounts
      window.removeEventListener('resize', handleResize);
      
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
      
      // Reset the listeners attached flag for next mount
      listenersAttachedRef.current = false;
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