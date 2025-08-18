const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

// Types
export interface AuthResponse {
  token: string;
  user: {
    address: string;
  };
}

export interface Race {
  id: string;
  isGhostRace: boolean;
  state: 'waiting' | 'started' | 'finished';
  participants: string[];
  createdAt: string;
  creator: string;
}

export interface Puzzle {
  id: string;
  question: string;
  answer: number;
  timeLimit: number;
  difficulty: 'easy' | 'medium' | 'hard';
  operation: 'addition' | 'subtraction' | 'multiplication';
}

export interface RaceState {
  race: Race;
  participants: Array<{
    address: string;
    position: number;
    speed: number;
    lastPuzzleSolved: string | null;
    totalPuzzlesSolved: number;
    currentPuzzleId: string | null;
  }>;
  progress: {
    leader: string;
    leaderPosition: number;
    raceLength: number;
    timeElapsed: number;
  };
}

export interface LeaderboardEntry {
  address: string;
  position: number;
  speed: number;
  totalPuzzlesSolved: number;
  completionTime?: number;
}

// API Client Class
class ApiClient {
  private token: string | null = null;
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error(`API Request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Authentication
  async login(address: string, signature: string, nonce: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ address, signature, nonce }),
    });
  }

  async checkSession(): Promise<{ valid: boolean; user?: { address: string } }> {
    try {
      const response = await this.request<{ user: { address: string } }>('/auth/session');
      return { valid: true, user: response.user };
    } catch {
      return { valid: false };
    }
  }

  async logout(address: string): Promise<void> {
    await this.request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ address }),
    });
    this.clearToken();
  }

  // Race Management
  async createRace(isGhostRace: boolean = false): Promise<{ raceId: string }> {
    return this.request<{ raceId: string }>('/race/createRace', {
      method: 'POST',
      body: JSON.stringify({ isGhostRace }),
    });
  }

  async joinRace(raceId: string): Promise<void> {
    await this.request('/race/joinRace', {
      method: 'POST',
      body: JSON.stringify({ raceId }),
    });
  }

  async startRace(raceId: string): Promise<void> {
    await this.request('/race/startRace', {
      method: 'POST',
      body: JSON.stringify({ raceId }),
    });
  }

  async getRaceInfo(raceId: string): Promise<Race> {
    return this.request<Race>(`/race/races/${raceId}`);
  }

  // Puzzle System
  async getCurrentPuzzle(raceId: string): Promise<Puzzle> {
    return this.request<Puzzle>(`/puzzle/puzzle/${raceId}`);
  }

  async solvePuzzle(raceId: string, answer: number): Promise<{ correct: boolean; speedBoost: number }> {
    return this.request<{ correct: boolean; speedBoost: number }>('/puzzle/solvePuzzle', {
      method: 'POST',
      body: JSON.stringify({ raceId, answer }),
    });
  }

  async getPuzzleHistory(raceId: string): Promise<Puzzle[]> {
    return this.request<Puzzle[]>(`/puzzle/puzzleHistory/${raceId}`);
  }

  // Race State & Monitoring
  async getRaceState(raceId: string): Promise<RaceState> {
    return this.request<RaceState>(`/raceState/raceState/${raceId}`);
  }

  async getLeaderboard(raceId: string): Promise<LeaderboardEntry[]> {
    return this.request<LeaderboardEntry[]>(`/raceState/leaderboard/${raceId}`);
  }

  async getRaceStats(raceId: string): Promise<{
    totalParticipants: number;
    averageSpeed: number;
    fastestLap: number;
    totalPuzzlesSolved: number;
  }> {
    return this.request(`/raceState/raceStats/${raceId}`);
  }

  // Health & Info
  async healthCheck(): Promise<{ status: string; timestamp: string; service: string; version: string }> {
    return this.request('/health');
  }

  async getApiInfo(): Promise<{
    name: string;
    version: string;
    description: string;
    endpoints: Record<string, any>;
  }> {
    return this.request('/');
  }

  // Utility methods
  async isBackendConnected(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch {
      return false;
    }
  }
}

export const apiClient = new ApiClient();
