import { createClient } from '@supabase/supabase-js';

console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// For development, use fallback values if env vars are missing
const finalSupabaseUrl = supabaseUrl || 'https://demo.supabase.co';
const finalSupabaseAnonKey = supabaseAnonKey || 'demo_key';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Using fallback Supabase credentials for development');
}

export const supabase = createClient(finalSupabaseUrl, finalSupabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// TypeScript types for our database tables
export interface GameState {
  id: string;
  round_number: number;
  round_start_time: string;
  round_end_time: string;
  is_active: boolean;
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

export interface Pixel {
  id: string;
  x: number;
  y: number;
  color: string;
  user_id?: string;
  ip_address: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  username: string;
  content: string;
  user_id?: string;
  ip_address: string;
  created_at: string;
} 