import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import BoardScene, { EVENTS } from '../scenes/BoardScene';
import DebugScene from '../scenes/DebugScene';
import { useGameStore } from '../store/gameStore';

interface GameProps {
  tileSize?: number;
}

const Game: React.FC<GameProps> = ({ tileSize = 64 }) => {
  const gameContainerRef = React.useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const tileSizeRef = useRef<number>(tileSize);
  
  // Get state update functions from Zustand
  const evolveAnimal = useGameStore(state => state.evolveAnimal);

  // Update the ref when tileSize changes
  useEffect(() => {
    tileSizeRef.current = tileSize;
    
    // If game exists and board scene is active, update tile size
    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene('BoardScene') as BoardScene;
      if (scene && scene.scene.isActive() && typeof (scene as BoardScene).setTileSize === 'function') {
        (scene as BoardScene).setTileSize(tileSize);
      }
    }
  }, [tileSize]);

  // Create and initialize the game
  useEffect(() => {
    // Don't create the game if the container doesn't exist
    if (!gameContainerRef.current) return;

    // Setup event listeners for the board scene
    const setupEventListeners = (boardScene: BoardScene) => {
      // Listen for animal click events
      boardScene.events.on(EVENTS.ANIMAL_CLICKED, (animalId: string) => {
        console.log(`Animal clicked: ${animalId}`);
        evolveAnimal(animalId);
      });

      // Listen for tile click events
      boardScene.events.on(EVENTS.TILE_CLICKED, (coords: { x: number, y: number }) => {
        console.log(`Tile clicked at: ${coords.x}, ${coords.y}`);
      });
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
      scene: [BoardScene, DebugScene],
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
          setupEventListeners(boardScene);
          return true;
        }
      }
      return false;
    };

    if (!checkForBoardScene()) {
      const interval = setInterval(() => {
        if (checkForBoardScene()) {
          clearInterval(interval);
        }
      }, 100);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      // Clean up the game when the component unmounts
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [evolveAnimal]);

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