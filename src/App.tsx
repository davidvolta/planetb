import React, { useState, useEffect, useRef } from 'react';
import Game from "./components/Game";
import State from "./components/State";
import { useGameStore, MapGenerationType } from "./store/gameStore";
import { Routes, Route } from "react-router-dom";
import * as actions from './store/actions';

function App() {
  // Track map size
  const [mapWidth, setMapWidth] = useState(30);
  const [mapHeight, setMapHeight] = useState(30);
  
  // Reference to the Phaser game instance
  const gameRef = useRef<any>(null);
  
  // Handle width slider change with immediate map update
  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = parseInt(e.target.value);
    setMapWidth(newWidth);
    // Immediately update the map
    actions.initializeBoard({
      width: newWidth,
      height: mapHeight,
      mapType: MapGenerationType.ISLAND,
      forceHabitatGeneration: true
    });
  };
  
  // Handle height slider change with immediate map update
  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeight = parseInt(e.target.value);
    setMapHeight(newHeight);
    // Immediately update the map
    actions.initializeBoard({
      width: mapWidth,
      height: newHeight,
      mapType: MapGenerationType.ISLAND,
      forceHabitatGeneration: true
    });
  };
  
  // Store game reference when Game component mounts
  const setGameInstance = (game: any) => {
    gameRef.current = game;
  };
  
  return (
    <Routes>
      <Route path="/state" element={
        <div style={{ padding: '20px', height: '100%', overflow: 'auto' }}>
          <State />
        </div>
      } />
      
      <Route path="/" element={
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
          {/* Game canvas takes the full screen */}
          <Game onGameMount={setGameInstance} />
          
        </div>
      } />
    </Routes>
  );
}

export default App;