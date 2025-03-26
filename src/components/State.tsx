import React from 'react';

/**
 * A static visualization of the application's state management architecture
 * showing how Zustand acts as the central state store with React and Phaser
 * as consumers (not modifiers) of state.
 */
const State: React.FC = () => {
  // CSS styles as objects for React
  const styles = {
    stateVisualization: {
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      padding: '20px',
      margin: '0 auto',
    },
    heading: {
      textAlign: 'center',
      color: '#333',
      marginBottom: '20px',
    },
    architectureDiagram: {
      position: 'relative',
    },
    layersContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '30px',
      position: 'relative',
      padding: '20px',
    },
    consumerRow: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '30px',
      position: 'relative',
      marginBottom: '30px',
    },
    layer: {
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
      position: 'relative',
    },
    consumerLayer: {
      flex: 1,
    },
    reactLayer: {
      backgroundColor: '#E3F2FD',
      border: '2px solid #2196F3',
      zIndex: 2,
    },
    zustandLayer: {
      backgroundColor: '#E8F5E9',
      border: '2px solid #4CAF50',
      zIndex: 3,
    },
    phaserLayer: {
      backgroundColor: '#FFF8E1',
      border: '2px solid #FFC107',
      zIndex: 2,
    },
    layerTitle: {
      fontWeight: 'bold',
      fontSize: '1.2em',
      marginBottom: '15px',
      color: '#333',
      textAlign: 'center',
    },
    infoBox: {
      textAlign: 'center',
      fontSize: '0.85em',
      marginBottom: '15px',
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      padding: '5px',
      borderRadius: '4px',
      maxWidth: '80%',
      margin: '0 auto 15px auto'
    },
    infoTitle: {
      fontWeight: 'bold',
    },
    content: {
      display: 'flex',
      justifyContent: 'space-around',
      flexWrap: 'wrap',
      gap: '15px',
    },
    component: {
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      borderRadius: '6px',
      padding: '10px',
      minWidth: '150px',
    },
    componentFuture: {
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      borderRadius: '6px',
      padding: '10px',
      minWidth: '150px',
      opacity: 0.7,
      border: '1px dashed #999',
    },
    title: {
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: '8px',
      paddingBottom: '5px',
      borderBottom: '1px solid #ddd',
    },
    itemsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '5px',
    },
    item: {
      fontSize: '0.9em',
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      padding: '3px 6px',
      borderRadius: '4px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    arrowContainer: {
      position: 'relative',
    },
    arrow: {
      position: 'absolute',
      width: '0',
      height: '0',
      borderLeft: '10px solid transparent',
      borderRight: '10px solid transparent',
      borderBottom: '15px solid #4CAF50',
      transform: 'rotate(180deg)',
      left: 'calc(50% - 10px)',
      bottom: '-25px',
    },
    arrowLine: {
      position: 'absolute',
      width: '4px',
      backgroundColor: '#4CAF50',
      left: 'calc(25% - 2px)',
      top: '-30px',
      height: '30px',
    },
    arrowLine2: {
      position: 'absolute',
      width: '4px',
      backgroundColor: '#4CAF50',
      right: 'calc(25% - 2px)',
      top: '-30px',
      height: '30px',
    }
  };

  return (
    <div style={styles.stateVisualization}>
      <h2 style={styles.heading as any}>Planet B Architecture </h2>
      <div style={styles.architectureDiagram as any}>
        {/* Main container for the visualization */}
        <div style={styles.layersContainer as any}>
          {/* React and Phaser on same level */}
          <div style={styles.consumerRow as any}>
            {/* React Layer */}
            <div style={{...styles.layer, ...styles.reactLayer, ...styles.consumerLayer, ...styles.arrowContainer} as any}>
              <div style={styles.layerTitle as any}>React Components</div>
              <div style={styles.content as any}>
                <div style={styles.component}>
                  <div style={styles.title as any}>App</div>
                  <div style={styles.itemsList as any}>
                    <div style={styles.item}>turn</div>
                    <div style={styles.item}>nextTurn</div>
                    <div style={styles.item}>initializeBoard</div>
                  </div>
                </div>
                <div style={styles.component}>
                  <div style={styles.title as any}>Game</div>
                  <div style={styles.itemsList as any}>
                    <div style={styles.item}>board</div>
                    <div style={styles.item}>animals</div>
                    <div style={styles.item}>habitats</div>
                  </div>
                </div>
                <div style={styles.component}>
                  <div style={styles.title as any}>UI Components</div>
                  <div style={styles.itemsList as any}>
                    <div style={styles.item}>players</div>
                    <div style={styles.item}>currentPlayerId</div>
                    <div style={styles.item}>selectedUnitId</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Phaser Layer */}
            <div style={{...styles.layer, ...styles.phaserLayer, ...styles.consumerLayer, ...styles.arrowContainer} as any}>
              <div style={styles.layerTitle as any}>Phaser Scenes</div>
              <div style={styles.content as any}>
                <div style={styles.component}>
                  <div style={styles.title as any}>BoardScene</div>
                  <div style={styles.itemsList as any}>
                    <div style={styles.item}>board</div>
                    <div style={styles.item}>animals</div>
                    <div style={styles.item}>habitats</div>
                    <div style={styles.item}>validMoves</div>
                    <div style={styles.item}>moveMode</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Zustand Layer - Middle */}
          <div style={{...styles.layer, ...styles.zustandLayer, ...styles.arrowContainer} as any}>
            <div style={styles.arrowLine as any}></div>
            <div style={styles.arrowLine2 as any}></div>
            <div style={styles.layerTitle as any}>Zustand Store</div>
            <div style={styles.content as any}>
              <div style={styles.component}>
                <div style={styles.title as any}>Game State</div>
                <div style={styles.itemsList as any}>
                  <div style={styles.item}>turn: number</div>
                  <div style={styles.item}>players: Player[]</div>
                  <div style={styles.item}>currentPlayerId: number</div>
                  <div style={styles.item}>animals: Animal[]</div>
                  <div style={styles.item}>habitats: Habitat[]</div>
                  <div style={styles.item}>selectedUnitId: string | null</div>
                  <div style={styles.item}>validMoves: ValidMove[]</div>
                  <div style={styles.item}>moveMode: boolean</div>
                </div>
              </div>
              <div style={styles.component}>
                <div style={styles.title as any}>Board State</div>
                <div style={styles.itemsList as any}>
                  <div style={styles.item}>board: {"{width, height, tiles: Tile[][]}"}</div>
                </div>
              </div>
              <div style={styles.component}>
                <div style={styles.title as any}>Actions</div>
                <div style={styles.itemsList as any}>
                  <div style={styles.item}>nextTurn()</div>
                  <div style={styles.item}>initializeBoard()</div>
                  <div style={styles.item}>selectUnit()</div>
                  <div style={styles.item}>deselectUnit()</div>
                  <div style={styles.item}>moveUnit()</div>
                  <div style={styles.item}>resetMovementFlags()</div>
                  <div style={styles.item}>evolveAnimal()</div>
                  <div style={styles.item}>improveHabitat()</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default State; 