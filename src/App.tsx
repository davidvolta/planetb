import React, { useState } from 'react';
import Game from "./components/Game";
import State from "./components/State";
import { useGameStore, MapGenerationType } from "./store/gameStore";
import { useEffect } from "react";
import { Routes, Route, Link } from "react-router-dom";
import * as actions from './store/actions';

// Get movement range for unit type
const MOVEMENT_RANGE_BY_TYPE: Record<string, number> = {
  'buffalo': 2,  // Buffalo are strong but slower
  'bird': 4,     // Birds have highest mobility
  'fish': 3,     // Fish are fast in water
  'snake': 2,    // Snakes are slower
  'bunny': 3     // Bunnies are quick
};

function App() {
  // Use direct Zustand hooks for state reading
  const turn = useGameStore((state) => state.turn);
  const nextTurn = useGameStore((state) => state.nextTurn);
  const habitats = useGameStore((state) => state.habitats);
  const isInitialized = useGameStore((state) => state.isInitialized);
  
  // Get movement state
  const selectedUnitId = useGameStore((state) => state.selectedUnitId);
  const validMoves = useGameStore((state) => state.validMoves);
  const moveMode = useGameStore((state) => state.moveMode);
  const animals = useGameStore((state) => state.animals);
  
  // Get selected unit info
  const selectedUnit = selectedUnitId 
    ? animals.find(animal => animal.id === selectedUnitId) 
    : null;
  
  // Track map size
  const [mapWidth, setMapWidth] = useState(30);
  const [mapHeight, setMapHeight] = useState(30);
  
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
          <Game />
          
          {/* UI elements overlay on top */}
          <div style={{ 
            position: 'absolute', 
            top: 10, 
            left: 10, 
            zIndex: 10,
            background: 'rgba(0,0,0,0.5)',
            padding: '10px',
            borderRadius: '5px',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxWidth: '300px'
          }}>
            <div>Turn: {turn}</div>
            <div>Habitats: {habitats.length}</div>
            <div>
              <button 
                onClick={() => nextTurn()}
                style={{
                  background: '#4a90e2',
                  color: 'white',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Next Turn
              </button>
            </div>
            
            {/* Map size controls */}
            <div style={{ marginTop: '10px' }}>
              <div>Map Width: {mapWidth}</div>
              <input 
                type="range" 
                min="10" 
                max="50" 
                value={mapWidth} 
                onChange={handleWidthChange}
                style={{ width: '100%' }}
              />
              
              <div>Map Height: {mapHeight}</div>
              <input 
                type="range" 
                min="10" 
                max="50" 
                value={mapHeight} 
                onChange={handleHeightChange}
                style={{ width: '100%' }}
              />
              
              <button
                onClick={() => actions.initializeBoard({
                  width: mapWidth,
                  height: mapHeight,
                  mapType: MapGenerationType.ISLAND,
                  forceHabitatGeneration: true
                })}
                style={{
                  marginTop: '5px',
                  background: '#e24a4a',
                  color: 'white',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Reset Map
              </button>
            </div>
            
            {/* Selected unit info */}
            {selectedUnit && (
              <div style={{ 
                marginTop: '10px', 
                padding: '8px', 
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '5px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  Selected Unit: {selectedUnit.type.charAt(0).toUpperCase() + selectedUnit.type.slice(1)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>Position:</div>
                  <div>({selectedUnit.position.x}, {selectedUnit.position.y})</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>Movement Range:</div>
                  <div>{MOVEMENT_RANGE_BY_TYPE[selectedUnit.type] || 3} tiles</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>Valid Moves:</div>
                  <div>{validMoves.length}</div>
                </div>
                <button
                  onClick={() => actions.deselectUnit()}
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    background: '#666',
                    color: 'white',
                    border: 'none',
                    padding: '3px',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Deselect Unit
                </button>
              </div>
            )}
          </div>
          
          {/* Link to state inspector */}
          <div style={{ position: 'absolute', bottom: 10, right: 10, zIndex: 10 }}>
            <Link to="/state" style={{ color: 'white', textDecoration: 'none', fontSize: '12px' }}>
              State Inspector
            </Link>
          </div>
        </div>
      } />
    </Routes>
  );
}

export default App;