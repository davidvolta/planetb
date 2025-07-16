const API_BASE = 'http://localhost:3001/api';

export interface RoomResponse {
  roomId: string;
  joinUrl: string;
}

export interface JoinRoomResponse {
  role: 'host' | 'guest';
  room: {
    id: string;
    host: { id: string; name: string } | null;
    guest: { id: string; name: string } | null;
    gameState: any;
  };
}

export interface GameStateResponse {
  gameState: any;
  host: { id: string; name: string } | null;
  guest: { id: string; name: string } | null;
}

export interface ActionsResponse {
  actions: any[];
}

export class MultiplayerClient {
  private playerId: string;
  private playerName: string;
  private roomId: string | null = null;
  private isHost: boolean = false;
  private pollingInterval: number | null = null;

  constructor() {
    this.playerId = this.generatePlayerId();
    this.playerName = `Player ${this.playerId.slice(-4)}`;
  }

  private generatePlayerId(): string {
    return 'player_' + Math.random().toString(36).substr(2, 9);
  }

  async createRoom(): Promise<RoomResponse> {
    const response = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error('Failed to create room');
    }
    
    const data = await response.json();
    this.roomId = data.roomId;
    return data;
  }

  async joinRoom(roomId: string): Promise<JoinRoomResponse> {
    const response = await fetch(`${API_BASE}/rooms/${roomId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: this.playerId,
        playerName: this.playerName
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to join room');
    }
    
    const data = await response.json();
    this.roomId = roomId;
    this.isHost = data.role === 'host';
    return data;
  }

  async updateGameState(gameState: any): Promise<void> {
    if (!this.isHost || !this.roomId) {
      throw new Error('Only host can update game state');
    }

    const response = await fetch(`${API_BASE}/rooms/${this.roomId}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: this.playerId,
        gameState
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update game state');
    }
  }

  async getGameState(): Promise<GameStateResponse> {
    if (!this.roomId) {
      throw new Error('Not connected to a room');
    }

    const response = await fetch(`${API_BASE}/rooms/${this.roomId}/state`);
    
    if (!response.ok) {
      throw new Error('Failed to get game state');
    }
    
    return response.json();
  }

  async submitAction(action: any): Promise<void> {
    if (this.isHost || !this.roomId) {
      throw new Error('Only guest can submit actions');
    }

    const response = await fetch(`${API_BASE}/rooms/${this.roomId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: this.playerId,
        action
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit action');
    }
  }

  async getPendingActions(): Promise<ActionsResponse> {
    if (!this.isHost || !this.roomId) {
      throw new Error('Only host can get pending actions');
    }

    const response = await fetch(
      `${API_BASE}/rooms/${this.roomId}/actions?playerId=${this.playerId}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to get pending actions');
    }
    
    return response.json();
  }

  startPolling(onStateUpdate: (state: GameStateResponse) => void, interval: number = 2000) {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = window.setInterval(async () => {
      try {
        const state = await this.getGameState();
        onStateUpdate(state);
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, interval);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  getRoomId(): string | null {
    return this.roomId;
  }

  getPlayerId(): string {
    return this.playerId;
  }

  getPlayerName(): string {
    return this.playerName;
  }

  getIsHost(): boolean {
    return this.isHost;
  }
}