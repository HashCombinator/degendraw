import { supabase, type Pixel, type ChatMessage, type UserSession, type GameState } from './supabase';

export class GameService {
  private static instance: GameService;
  private userSession: UserSession | null = null;
  private walletAddress: string | null = null;

  static getInstance(): GameService {
    if (!GameService.instance) {
      GameService.instance = new GameService();
    }
    return GameService.instance;
  }

  // Get client IP address (in production, this would come from your server)
  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Failed to get IP address:', error);
      return '127.0.0.1'; // Fallback
    }
  }

  // Initialize user session
  async initializeSession(walletAddress?: string): Promise<UserSession> {
    const ipAddress = await this.getClientIP();
    this.walletAddress = walletAddress || null;

    const { data, error } = await supabase.rpc('get_or_create_user_session', {
      p_ip_address: ipAddress,
      p_wallet_address: walletAddress || null
    });

    if (error) {
      throw new Error(`Failed to initialize session: ${error.message}`);
    }

    this.userSession = data;
    return data;
  }

  // Get current game state
  async getGameState(): Promise<GameState> {
    const { data, error } = await supabase
      .from('game_state')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error) {
      throw new Error(`Failed to get game state: ${error.message}`);
    }

    return data;
  }

  // Get all pixels for the canvas
  async getPixels(): Promise<Pixel[]> {
    const { data, error } = await supabase
      .from('pixels')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get pixels: ${error.message}`);
    }

    return data || [];
  }

  // Place a pixel on the canvas
  async placePixel(x: number, y: number, color: string): Promise<boolean> {
    if (!this.userSession) {
      throw new Error('User session not initialized');
    }

    const ipAddress = await this.getClientIP();

    const { data, error } = await supabase.rpc('place_pixel', {
      p_x: x,
      p_y: y,
      p_color: color,
      p_ip_address: ipAddress,
      p_wallet_address: this.walletAddress
    });

    if (error) {
      throw new Error(`Failed to place pixel: ${error.message}`);
    }

    return data;
  }

  // Erase a pixel from the canvas
  async erasePixel(x: number, y: number): Promise<boolean> {
    if (!this.userSession || !this.walletAddress) {
      throw new Error('User session not initialized or wallet not connected');
    }

    const ipAddress = await this.getClientIP();

    const { data, error } = await supabase.rpc('erase_pixel', {
      p_x: x,
      p_y: y,
      p_ip_address: ipAddress,
      p_wallet_address: this.walletAddress
    });

    if (error) {
      throw new Error(`Failed to erase pixel: ${error.message}`);
    }

    return data;
  }

  // Get chat messages
  async getChatMessages(limit: number = 50): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get chat messages: ${error.message}`);
    }

    return (data || []).reverse(); // Return in chronological order
  }

  // Send a chat message
  async sendChatMessage(username: string, content: string): Promise<boolean> {
    if (!this.userSession) {
      throw new Error('User session not initialized');
    }

    const ipAddress = await this.getClientIP();

    const { data, error } = await supabase.rpc('add_chat_message', {
      p_username: username,
      p_content: content,
      p_ip_address: ipAddress,
      p_wallet_address: this.walletAddress
    });

    if (error) {
      throw new Error(`Failed to send chat message: ${error.message}`);
    }

    return data;
  }

  // Get user session info
  async getUserSession(): Promise<UserSession | null> {
    if (!this.userSession) {
      return null;
    }

    const ipAddress = await this.getClientIP();

    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('ip_address', ipAddress)
      .eq('wallet_address', this.walletAddress)
      .single();

    if (error) {
      console.error('Failed to get user session:', error);
      return this.userSession; // Return cached session
    }

    this.userSession = data;
    return data;
  }

  // Subscribe to real-time pixel updates
  subscribeToPixels(callback: (pixel: Pixel) => void) {
    return supabase
      .channel('pixels')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'pixels'
      }, (payload) => {
        callback(payload.new as Pixel);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'pixels'
      }, (payload) => {
        // Handle pixel deletion (eraser)
        callback({ ...payload.old as Pixel, color: '' });
      })
      .subscribe();
  }

  // Subscribe to real-time chat updates
  subscribeToChat(callback: (message: ChatMessage) => void) {
    return supabase
      .channel('chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, (payload) => {
        callback(payload.new as ChatMessage);
      })
      .subscribe();
  }

  // Subscribe to game state changes
  subscribeToGameState(callback: (gameState: GameState) => void) {
    return supabase
      .channel('game_state')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_state'
      }, (payload) => {
        callback(payload.new as GameState);
      })
      .subscribe();
  }

  // Get current user session (cached)
  getCurrentSession(): UserSession | null {
    return this.userSession;
  }

  // Update wallet address
  updateWalletAddress(walletAddress: string | null) {
    this.walletAddress = walletAddress;
    // Reinitialize session with new wallet address
    if (walletAddress) {
      this.initializeSession(walletAddress);
    }
  }
}

// Export singleton instance
export const gameService = GameService.getInstance(); 