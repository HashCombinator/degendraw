import { supabase } from './supabase';

// Simple types for local-first approach
export interface Pixel {
  id: string;
  x: number;
  y: number;
  color: string;
  ip_address: string;
  created_at: string;
}

export interface UserSession {
  id: string;
  ip_address: string;
  ink_remaining: number;
  eraser_remaining: number;
  last_ink_refill: string;
  last_eraser_refill: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  username: string;
  content: string;
  ip_address: string;
  created_at: string;
}

export interface GameState {
  id: string;
  round_number: number;
  round_start_time: string;
  round_end_time: string;
  is_active: boolean;
  created_at: string;
}

export class GameService {
  private static instance: GameService;
  private userSession: UserSession | null = null;
  private pendingPixels: Array<{x: number, y: number, color: string}> = [];
  private debounceTimeout: NodeJS.Timeout | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastPixelCount = 0;

  static getInstance(): GameService {
    if (!GameService.instance) {
      GameService.instance = new GameService();
    }
    return GameService.instance;
  }

  private constructor() {}

  // Get client IP (simplified)
  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.warn('Could not get IP, using fallback');
      return '127.0.0.1';
    }
  }

  // Initialize user session (local storage based)
  async initializeSession(): Promise<UserSession> {
    const ipAddress = await this.getClientIP();
    
    // Try to get existing session from local storage
    const existingSession = this.getSessionFromLocalStorage();
    if (existingSession) {
      this.userSession = existingSession;
      return existingSession;
    }

    // Create new session
    const newSession: UserSession = {
      id: `session-${Date.now()}-${Math.random()}`,
      ip_address: ipAddress,
      ink_remaining: 2000,
      eraser_remaining: 0,
      last_ink_refill: new Date().toISOString(),
      last_eraser_refill: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.userSession = newSession;
    this.saveSessionToLocalStorage(newSession);
    return newSession;
  }

  // Get current game state (synchronized)
  async getGameState(): Promise<GameState> {
    try {
      // Get synchronized time with offset calculation
      const currentTime = await this.getSynchronizedTime();
      
      // Calculate round based on synchronized time
      const roundDuration = 30 * 1000; // 30 seconds
      const epochTime = currentTime.getTime();
      const roundNumber = Math.floor(epochTime / roundDuration);
      const roundStartTime = new Date(roundNumber * roundDuration);
      const roundEndTime = new Date((roundNumber + 1) * roundDuration);
      
      const gameState: GameState = {
        id: `round-${roundNumber}`,
        round_number: roundNumber,
        round_start_time: roundStartTime.toISOString(),
        round_end_time: roundEndTime.toISOString(),
        is_active: true,
        created_at: roundStartTime.toISOString()
      };

      // Check if we need to clear pixels for new round
      const lastRoundNumber = this.getLastRoundNumber();
      if (lastRoundNumber !== roundNumber) {
        console.log(`New round detected: ${lastRoundNumber} -> ${roundNumber}`);
        // New round started, clear pixels and refill ink
        this.clearPixelsForNewRound();
        this.refillInkForNewRound();
        this.setLastRoundNumber(roundNumber);
      }

      return gameState;
    } catch (error) {
      console.error('Failed to get synchronized time, using local fallback:', error);
      // Fallback to local time if synchronization fails
      return this.getLocalGameState();
    }
  }

  // Get synchronized time with offset calculation
  private async getSynchronizedTime(): Promise<Date> {
    const timeOffset = this.getTimeOffset();
    if (timeOffset !== null) {
      // Use cached offset for fast local calculation
      return new Date(Date.now() + timeOffset);
    }

    // First time or offset expired, get fresh offset
    try {
      const startTime = Date.now();
      const response = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC');
      const endTime = Date.now();
      const worldTime = await response.json();
      
      // Calculate network latency and offset
      const latency = (endTime - startTime) / 2; // Assume symmetric latency
      const serverTime = new Date(worldTime.datetime).getTime();
      const localTime = endTime - latency;
      const offset = serverTime - localTime;
      
      // Cache the offset for 5 minutes
      this.setTimeOffset(offset, Date.now() + 5 * 60 * 1000);
      
      return new Date(Date.now() + offset);
    } catch (error) {
      console.error('Failed to get world time:', error);
      // Fallback to local time
      return new Date();
    }
  }

  // Time offset caching for performance
  private getTimeOffset(): number | null {
    const stored = localStorage.getItem('pixel-palace-time-offset');
    if (stored) {
      const { offset, expiresAt } = JSON.parse(stored);
      if (Date.now() < expiresAt) {
        return offset;
      }
    }
    return null;
  }

  private setTimeOffset(offset: number, expiresAt: number): void {
    localStorage.setItem('pixel-palace-time-offset', JSON.stringify({ offset, expiresAt }));
  }

  // Get current synchronized time without API calls (uses cached offset)
  getCurrentSynchronizedTime(): Date {
    const timeOffset = this.getTimeOffset();
    if (timeOffset !== null) {
      return new Date(Date.now() + timeOffset);
    }
    // Fallback to local time if no offset cached
    return new Date();
  }

  // Fallback local game state
  private getLocalGameState(): GameState {
    const stored = localStorage.getItem('pixel-palace-game-state');
    if (stored) {
      const state = JSON.parse(stored);
      // Check if round has ended
      if (new Date(state.round_end_time) < new Date()) {
        // Start new round
        return this.startNewRound();
      }
      return state;
    }
    return this.startNewRound();
  }

  // Start new round (fallback)
  private startNewRound(): GameState {
    const newState: GameState = {
      id: `round-${Date.now()}`,
      round_number: 1,
      round_start_time: new Date().toISOString(),
      round_end_time: new Date(Date.now() + 30 * 1000).toISOString(), // 30 seconds
      is_active: true,
      created_at: new Date().toISOString()
    };
    localStorage.setItem('pixel-palace-game-state', JSON.stringify(newState));
    
    // Clear pixels for new round
    this.clearPixelsForNewRound();
    
    // Refill ink
    this.refillInkForNewRound();
    
    return newState;
  }

  // Clear pixels for new round
  private clearPixelsForNewRound(): void {
    localStorage.removeItem('pixel-palace-pixels');
    console.log('Cleared pixels for new round');
  }

  // Refill ink for new round
  private refillInkForNewRound(): void {
    if (this.userSession) {
      this.userSession.ink_remaining = 2000;
      this.userSession.eraser_remaining = 0;
      this.userSession.updated_at = new Date().toISOString();
      this.saveSessionToLocalStorage(this.userSession);
      console.log('Refilled ink for new round');
    }
  }

  // Track last round number to detect round changes
  private getLastRoundNumber(): number {
    const stored = localStorage.getItem('pixel-palace-last-round');
    return stored ? parseInt(stored) : 0;
  }

  private setLastRoundNumber(roundNumber: number): void {
    localStorage.setItem('pixel-palace-last-round', roundNumber.toString());
  }

  // Manual reset for testing (advance to next round)
  async manualReset(): Promise<void> {
    const currentRound = this.getLastRoundNumber();
    this.setLastRoundNumber(currentRound + 1);
    this.clearPixelsForNewRound();
    this.refillInkForNewRound();
    console.log('Manual reset triggered');
  }

  // Get all pixels (local storage)
  async getPixels(): Promise<Pixel[]> {
    return this.getPixelsFromLocalStorage();
  }

  // Place a pixel (local storage)
  async placePixel(x: number, y: number, color: string): Promise<void> {
    if (!this.userSession) {
      throw new Error('User session not initialized');
    }

    if (this.userSession.ink_remaining <= 0) {
      console.log('No ink remaining');
      return;
    }

    // Add to pending pixels
    this.pendingPixels.push({ x, y, color });

    // Clear existing timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    // Set new timeout to batch pixels
    this.debounceTimeout = setTimeout(async () => {
      await this.flushPendingPixels();
    }, 100); // 100ms debounce
  }

  // Flush pending pixels to local storage
  private async flushPendingPixels(): Promise<void> {
    if (this.pendingPixels.length === 0) return;

    const pixels = [...this.pendingPixels];
    this.pendingPixels = [];

    const ipAddress = await this.getClientIP();
    const existingPixels = this.getPixelsFromLocalStorage();

    // Create new pixels
    const newPixels = pixels.map(pixel => ({
      id: `pixel-${Date.now()}-${Math.random()}`,
      x: pixel.x,
      y: pixel.y,
      color: pixel.color,
      ip_address: ipAddress,
      created_at: new Date().toISOString()
    }));

    // Save to local storage
    this.savePixelsToLocalStorage([...existingPixels, ...newPixels]);

    // Update ink
    if (this.userSession) {
      this.userSession.ink_remaining -= pixels.length;
      this.userSession.updated_at = new Date().toISOString();
      this.saveSessionToLocalStorage(this.userSession);
    }

    console.log(`Placed ${pixels.length} pixels, ${this.userSession?.ink_remaining} ink remaining`);
  }

  // Get chat messages (local storage)
  async getChatMessages(limit: number = 50): Promise<ChatMessage[]> {
    const stored = localStorage.getItem('pixel-palace-chat');
    if (stored) {
      const messages = JSON.parse(stored);
      return messages.slice(-limit);
    }
    return [];
  }

  // Send a chat message (local storage)
  async sendChatMessage(username: string, content: string): Promise<boolean> {
    const ipAddress = await this.getClientIP();
    
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      username: username,
      content: content,
      ip_address: ipAddress,
      created_at: new Date().toISOString()
    };

    const existingMessages = await this.getChatMessages();
    const updatedMessages = [...existingMessages, newMessage];
    localStorage.setItem('pixel-palace-chat', JSON.stringify(updatedMessages));

    return true;
  }

  // Get user session (local storage)
  async getUserSession(): Promise<UserSession | null> {
    if (!this.userSession) {
      return null;
    }
    return this.userSession;
  }

  // Subscribe to pixel updates (polling-based)
  subscribeToPixels(callback: (pixel: Pixel) => void) {
    console.log('Creating pixel subscription (polling-based)...');
    
    // Initialize pixel count
    this.getPixels().then(pixels => {
      this.lastPixelCount = pixels.length;
    });

    // Start polling
    this.pollingInterval = setInterval(async () => {
      try {
        const pixels = await this.getPixels();
        if (pixels.length > this.lastPixelCount) {
          // New pixels added, trigger callback for the latest ones
          const newPixels = pixels.slice(this.lastPixelCount);
          newPixels.forEach(pixel => callback(pixel));
          this.lastPixelCount = pixels.length;
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 1000); // Poll every second

    return {
      unsubscribe: () => {
        if (this.pollingInterval) {
          clearInterval(this.pollingInterval);
        }
      }
    };
  }

  // Subscribe to chat updates (polling-based)
  subscribeToChat(callback: (message: ChatMessage) => void) {
    console.log('Creating chat subscription (polling-based)...');
    
    let lastMessageCount = 0;
    
    const interval = setInterval(async () => {
      try {
        const messages = await this.getChatMessages();
        if (messages.length > lastMessageCount) {
          // New messages added
          const newMessages = messages.slice(lastMessageCount);
          newMessages.forEach(message => callback(message));
          lastMessageCount = messages.length;
        }
      } catch (error) {
        console.error('Chat polling error:', error);
      }
    }, 1000);

    return {
      unsubscribe: () => clearInterval(interval)
    };
  }

  // Subscribe to game state changes (polling-based)
  subscribeToGameState(callback: (gameState: GameState) => void) {
    console.log('Creating game state subscription (polling-based)...');
    
    let lastState: GameState | null = null;
    
    const interval = setInterval(async () => {
      try {
        const currentState = await this.getGameState();
        if (!lastState || JSON.stringify(currentState) !== JSON.stringify(lastState)) {
          callback(currentState);
          lastState = currentState;
        }
      } catch (error) {
        console.error('Game state polling error:', error);
      }
    }, 1000);

    return {
      unsubscribe: () => clearInterval(interval)
    };
  }

  // Get current user session (cached)
  getCurrentSession(): UserSession | null {
    return this.userSession;
  }

  // Local storage helpers
  private getPixelsFromLocalStorage(): Pixel[] {
    try {
      const stored = localStorage.getItem('pixel-palace-pixels');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading pixels from local storage:', error);
      return [];
    }
  }

  private savePixelsToLocalStorage(pixels: Pixel[]): void {
    try {
      localStorage.setItem('pixel-palace-pixels', JSON.stringify(pixels));
    } catch (error) {
      console.error('Error saving pixels to local storage:', error);
    }
  }

  private getSessionFromLocalStorage(): UserSession | null {
    try {
      const stored = localStorage.getItem('pixel-palace-session');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error reading session from local storage:', error);
      return null;
    }
  }

  private saveSessionToLocalStorage(session: UserSession): void {
    try {
      localStorage.setItem('pixel-palace-session', JSON.stringify(session));
    } catch (error) {
      console.error('Error saving session to local storage:', error);
    }
  }

  // Cleanup
  destroy() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }
}

// Export singleton instance
export const gameService = GameService.getInstance(); 