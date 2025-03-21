import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import BoardScene from '../scenes/BoardScene';
import DebugScene from '../scenes/DebugScene';
import { useGameStore } from '../store/gameStore';

interface GameProps {
  tileSize?: number;
}

const Game: React.FC<GameProps> = ({ tileSize = 64 }) => {
  const gameContainerRef = React.useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const boardState = useGameStore(state => state.board);
  const tileSizeRef = useRef<number>(tileSize);

  // Update the ref when tileSize changes
  useEffect(() => {
    tileSizeRef.current = tileSize;
    
    // If game exists and board scene is active, update tile size
    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene('BoardScene') as BoardScene;
      if (scene && scene.scene.isActive() && typeof (scene as any).setTileSize === 'function') {
        (scene as any).setTileSize(tileSize);
      }
    }
  }, [tileSize]);

  useEffect(() => {
    // Get the container dimensions
    const width = gameContainerRef.current?.clientWidth || 800;
    const height = gameContainerRef.current?.clientHeight || 600;

    if (!gameRef.current) {
      // Initialize Phaser game only once
      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        width,
        height,
        backgroundColor: '#344055',
        parent: gameContainerRef.current || undefined,
        scene: [BoardScene, DebugScene],
      });
      
      // Once the scene is created, set the initial tile size
      gameRef.current.scene.getScenes().forEach(scene => {
        if (scene.sys.settings.key === 'BoardScene' && typeof (scene as any).setTileSize === 'function') {
          (scene as any).setTileSize(tileSizeRef.current);
        }
      });
    }

    // Handle window resize to update camera
    const handleResize = () => {
      if (gameRef.current) {
        gameRef.current.scale.resize(
          gameContainerRef.current?.clientWidth || 800,
          gameContainerRef.current?.clientHeight || 600
        );
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      // Clean up the game when the component unmounts
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  // This effect runs when boardState changes
  useEffect(() => {
    if (gameRef.current && boardState) {
      const scene = gameRef.current.scene.getScene('BoardScene') as BoardScene;
      
      if (scene && scene.scene.isActive()) {
        // Try to use the updateBoard method for smooth transitions if available
        if (typeof (scene as any).updateBoard === 'function') {
          (scene as any).updateBoard();
        } else {
          // Fallback: restart the scene if updateBoard is not available
          scene.scene.restart();
        }
      }
    }
  }, [boardState]);

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