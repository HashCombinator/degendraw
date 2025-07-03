import { supabase } from './supabase';

// Configuration for different modes
const CONFIG = {
  // Set to 'online' to use Supabase, 'local' for localStorage only
  mode: 'online' as 'local' | 'online',
  
  // Supabase settings
  enableRealTime: true,
  enableDatabase: true,
  
  // Game settings
  roundDuration: 30 * 1000, // 30 seconds
  maxInk: 2000,
  maxEraser: 30,
  
  // Performance settings
  pixelBatchSize: 10,
  debounceTime: 100,
  pollingInterval: 1000,
};

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
  private realtimeSubscriptions: any[] = [];

  static getInstance(): GameService {
    if (!GameService.instance) {
      GameService.instance = new GameService();
    }
    return GameService.instance;
  }

  private constructor() {
    console.log(`GameService initialized in ${CONFIG.mode} mode`);
  }

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
    try {
      if (CONFIG.mode === 'online') {
        return await this.initializeOnlineSession();
      } else {
        return await this.initializeLocalSession();
      }
    } catch (error) {
      console.error('Session initialization failed, using fallback:', error);
      // Always return a valid session, even if initialization fails
      return await this.initializeLocalSession();
    }
  }

  // Initialize online session
  private async initializeOnlineSession(): Promise<UserSession> {
    const ipAddress = await this.getClientIP();
    
    try {
      // Try to get existing session from database
      const { data: existingSession, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('ip_address', ipAddress)
        .single();

      if (existingSession && !error) {
        this.userSession = existingSession;
        return existingSession;
      }

      // Create new session in database
      const { data: newSession, error: createError } = await supabase
        .from('user_sessions')
        .insert({
          ip_address: ipAddress,
          ink_remaining: CONFIG.maxInk,
          eraser_remaining: 0
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create online session: ${createError.message}`);
      }

      this.userSession = newSession;
      return newSession;
    } catch (error) {
      console.error('Online session initialization failed, falling back to local:', error);
      return this.initializeLocalSession();
    }
  }

  // Initialize local session
  private async initializeLocalSession(): Promise<UserSession> {
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
      ink_remaining: CONFIG.maxInk,
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
    if (CONFIG.mode === 'online') {
      return this.getOnlineGameState();
    } else {
      return this.getLocalGameState();
    }
  }

  // Get online game state
  private async getOnlineGameState(): Promise<GameState> {
    try {
      const { data, error } = await supabase
        .from('game_state')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Failed to get online game state:', error);
        return this.getLocalGameState();
      }

      return data;
    } catch (error) {
      console.error('Online game state failed, falling back to local:', error);
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

  // Get synchronized game state (for timer)
  async getSynchronizedGameState(): Promise<GameState> {
    try {
      // Get synchronized time
      const currentTime = await this.getSynchronizedTime();
      
      // Calculate round based on synchronized time
      const roundDuration = CONFIG.roundDuration;
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
      console.error('Failed to get synchronized game state, using local fallback:', error);
      return this.getLocalGameState();
    }
  }

  // Start new round (fallback)
  private startNewRound(): GameState {
    const newState: GameState = {
      id: `round-${Date.now()}`,
      round_number: 1,
      round_start_time: new Date().toISOString(),
      round_end_time: new Date(Date.now() + CONFIG.roundDuration).toISOString(),
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
    if (CONFIG.mode === 'online') {
      // Clear online pixels
      this.clearOnlinePixels();
    } else {
      // Clear local pixels
      localStorage.removeItem('pixel-palace-pixels');
    }
    console.log('Cleared pixels for new round');
  }

  // Clear online pixels
  private async clearOnlinePixels(): Promise<void> {
    try {
      const { error } = await supabase
        .from('pixels')
        .delete(); // Delete all pixels, no filter

      if (error) {
        console.error('Failed to clear online pixels:', error);
      }
    } catch (error) {
      console.error('Error clearing online pixels:', error);
    }
  }

  // Refill ink for new round
  private refillInkForNewRound(): void {
    if (this.userSession) {
      this.userSession.ink_remaining = CONFIG.maxInk;
      this.userSession.eraser_remaining = 0;
      this.userSession.updated_at = new Date().toISOString();
      
      if (CONFIG.mode === 'online') {
        this.updateOnlineSession();
      } else {
        this.saveSessionToLocalStorage(this.userSession);
      }
      console.log('Refilled ink for new round');
    }
  }

  // Update online session
  private async updateOnlineSession(): Promise<void> {
    if (!this.userSession) return;

    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({
          ink_remaining: this.userSession.ink_remaining,
          eraser_remaining: this.userSession.eraser_remaining,
          updated_at: this.userSession.updated_at
        })
        .eq('id', this.userSession.id);

      if (error) {
        console.error('Failed to update online session:', error);
      }
    } catch (error) {
      console.error('Error updating online session:', error);
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
    if (CONFIG.mode === 'online') {
      return this.getOnlinePixels();
    } else {
      return this.getPixelsFromLocalStorage();
    }
  }

  // Get online pixels
  private async getOnlinePixels(): Promise<Pixel[]> {
    try {
      const { data, error } = await supabase
        .from('pixels')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to get online pixels:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting online pixels:', error);
      return [];
    }
  }

  // Place a pixel (local storage)
  async placePixel(x: number, y: number, color: string): Promise<void> {
    // Ensure session is initialized
    if (!this.userSession) {
      console.log('No user session, initializing...');
      await this.initializeSession();
    }

    if (!this.userSession) {
      throw new Error('Failed to initialize user session');
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
    }, CONFIG.debounceTime);
  }

  // Erase a pixel (for eraser tool)
  async erasePixel(x: number, y: number): Promise<void> {
    // Ensure session is initialized
    if (!this.userSession) {
      console.log('No user session, initializing...');
      await this.initializeSession();
    }

    if (!this.userSession) {
      throw new Error('Failed to initialize user session');
    }

    if (this.userSession.eraser_remaining <= 0) {
      console.log('No eraser remaining');
      return;
    }

    if (CONFIG.mode === 'online') {
      // Actually erase the pixel from the database
      try {
        const { error } = await supabase
          .from('pixels')
          .delete()
          .eq('x', x)
          .eq('y', y);
        if (error) {
          console.error('Failed to erase pixel:', error);
        }
      } catch (error) {
        console.error('Error erasing pixel:', error);
      }
    }
    // For both modes, consume eraser
    this.userSession.eraser_remaining -= 1;
    this.userSession.updated_at = new Date().toISOString();
    
    if (CONFIG.mode === 'online') {
      await this.updateOnlineSession();
    } else {
      this.saveSessionToLocalStorage(this.userSession);
    }
  }

  // Flush pending pixels to local storage
  private async flushPendingPixels(): Promise<void> {
    if (this.pendingPixels.length === 0) return;

    const pixels = [...this.pendingPixels];
    this.pendingPixels = [];

    if (CONFIG.mode === 'online') {
      await this.flushOnlinePixels(pixels);
    } else {
      await this.flushLocalPixels(pixels);
    }
  }

  // Flush pixels to online database
  private async flushOnlinePixels(pixels: Array<{x: number, y: number, color: string}>): Promise<void> {
    const ipAddress = await this.getClientIP();

    try {
      const { error } = await supabase
        .from('pixels')
        .upsert(pixels.map(pixel => ({
          x: pixel.x,
          y: pixel.y,
          color: pixel.color,
          ip_address: ipAddress
        })));

      if (error) {
        console.error('Failed to place online pixels:', error);
        // Fallback to local storage
        await this.flushLocalPixels(pixels);
        return;
      }

      // Update ink in database
      if (this.userSession) {
        this.userSession.ink_remaining -= pixels.length;
        this.userSession.updated_at = new Date().toISOString();
        await this.updateOnlineSession();
      }

      console.log(`Placed ${pixels.length} pixels online, ${this.userSession?.ink_remaining} ink remaining`);
    } catch (error) {
      console.error('Error placing online pixels:', error);
      // Fallback to local storage
      await this.flushLocalPixels(pixels);
    }
  }

  // Flush pixels to local storage
  private async flushLocalPixels(pixels: Array<{x: number, y: number, color: string}>): Promise<void> {
    const ipAddress = await this.getClientIP();
    const existingPixels = this.getPixelsFromLocalStorage();

    // Create new pixels (local only)
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

    console.log(`Placed ${pixels.length} pixels locally, ${this.userSession?.ink_remaining} ink remaining`);
  }

  // Get chat messages (local storage)
  async getChatMessages(limit: number = 50): Promise<ChatMessage[]> {
    if (CONFIG.mode === 'online') {
      return this.getOnlineChatMessages(limit);
    } else {
      return this.getLocalChatMessages(limit);
    }
  }

  // Get online chat messages
  private async getOnlineChatMessages(limit: number): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to get online chat messages:', error);
        return [];
      }

      return (data || []).reverse();
    } catch (error) {
      console.error('Error getting online chat messages:', error);
      return [];
    }
  }

  // Get local chat messages
  private getLocalChatMessages(limit: number): ChatMessage[] {
    const stored = localStorage.getItem('pixel-palace-chat');
    if (stored) {
      const messages = JSON.parse(stored);
      return messages.slice(-limit);
    }
    return [];
  }

  // Send a chat message (local storage)
  async sendChatMessage(username: string, content: string): Promise<boolean> {
    if (CONFIG.mode === 'online') {
      return this.sendOnlineChatMessage(username, content);
    } else {
      return this.sendLocalChatMessage(username, content);
    }
  }

  // Send online chat message
  private async sendOnlineChatMessage(username: string, content: string): Promise<boolean> {
    const ipAddress = await this.getClientIP();

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          username: username,
          content: content,
          ip_address: ipAddress
        });

      if (error) {
        console.error('Failed to send online chat message:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error sending online chat message:', error);
      return false;
    }
  }

  // Send local chat message
  private async sendLocalChatMessage(username: string, content: string): Promise<boolean> {
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
    if (CONFIG.mode === 'online' && CONFIG.enableRealTime) {
      return this.subscribeToOnlinePixels(callback);
    } else {
      return this.subscribeToLocalPixels(callback);
    }
  }

  // Subscribe to online pixels with real-time
  private subscribeToOnlinePixels(callback: (pixel: Pixel) => void) {
    console.log('Creating online pixel subscription...');
    
    const subscription = supabase
      .channel('pixels')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pixels'
      }, (payload) => {
        console.log('Online pixel event received:', payload);
        
        if (payload.eventType === 'INSERT') {
          callback(payload.new as Pixel);
        } else if (payload.eventType === 'UPDATE') {
          callback(payload.new as Pixel);
        } else if (payload.eventType === 'DELETE') {
          callback({ ...payload.old as Pixel, color: '' });
        }
      })
      .subscribe((status) => {
        console.log('Online pixel subscription status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.error('Online subscription failed, falling back to polling');
          this.subscribeToLocalPixels(callback);
        }
      });

    this.realtimeSubscriptions.push(subscription);
    return subscription;
  }

  // Subscribe to local pixels (polling-based)
  private subscribeToLocalPixels(callback: (pixel: Pixel) => void) {
    console.log('Creating local pixel subscription (polling-based)...');
    
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
    }, CONFIG.pollingInterval);

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
    if (CONFIG.mode === 'online' && CONFIG.enableRealTime) {
      return this.subscribeToOnlineChat(callback);
    } else {
      return this.subscribeToLocalChat(callback);
    }
  }

  // Subscribe to online chat with real-time
  private subscribeToOnlineChat(callback: (message: ChatMessage) => void) {
    console.log('Creating online chat subscription...');
    
    const subscription = supabase
      .channel('chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, (payload) => {
        callback(payload.new as ChatMessage);
      })
      .subscribe((status) => {
        console.log('Online chat subscription status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.error('Online chat subscription failed, falling back to polling');
          this.subscribeToLocalChat(callback);
        }
      });

    this.realtimeSubscriptions.push(subscription);
    return subscription;
  }

  // Subscribe to local chat (polling-based)
  private subscribeToLocalChat(callback: (message: ChatMessage) => void) {
    console.log('Creating local chat subscription (polling-based)...');
    
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
    }, CONFIG.pollingInterval);

    return {
      unsubscribe: () => clearInterval(interval)
    };
  }

  // Subscribe to game state changes (polling-based)
  subscribeToGameState(callback: (gameState: GameState) => void) {
    if (CONFIG.mode === 'online' && CONFIG.enableRealTime) {
      return this.subscribeToOnlineGameState(callback);
    } else {
      return this.subscribeToLocalGameState(callback);
    }
  }

  // Subscribe to online game state with real-time
  private subscribeToOnlineGameState(callback: (gameState: GameState) => void) {
    console.log('Creating online game state subscription...');
    
    const subscription = supabase
      .channel('game_state')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_state'
      }, (payload) => {
        callback(payload.new as GameState);
      })
      .subscribe((status) => {
        console.log('Online game state subscription status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.error('Online game state subscription failed, falling back to polling');
          this.subscribeToLocalGameState(callback);
        }
      });

    this.realtimeSubscriptions.push(subscription);
    return subscription;
  }

  // Subscribe to local game state (polling-based)
  private subscribeToLocalGameState(callback: (gameState: GameState) => void) {
    console.log('Creating local game state subscription (polling-based)...');
    
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
    }, CONFIG.pollingInterval);

    return {
      unsubscribe: () => clearInterval(interval)
    };
  }

  // Get current user session (cached)
  getCurrentSession(): UserSession | null {
    return this.userSession;
  }

  // Switch between local and online modes
  setMode(mode: 'local' | 'online'): void {
    CONFIG.mode = mode;
    console.log(`Switched to ${mode} mode`);
    
    // Clean up existing subscriptions
    this.cleanup();
    
    // Reinitialize session
    this.initializeSession();
  }

  // Get current mode
  getMode(): 'local' | 'online' {
    return CONFIG.mode;
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
    this.cleanup();
  }

  private cleanup() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    // Clean up real-time subscriptions
    this.realtimeSubscriptions.forEach(subscription => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    });
    this.realtimeSubscriptions = [];
  }
}

// Export singleton instance
export const gameService = GameService.getInstance(); 