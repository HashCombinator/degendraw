-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Create tables for the pixel drawing game

-- Game state table to track rounds
CREATE TABLE game_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_number INTEGER NOT NULL DEFAULT 1,
  round_start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  round_end_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '2 minutes',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- User sessions table to track ink and eraser usage
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address INET NOT NULL,
  wallet_address TEXT,
  ink_remaining INTEGER NOT NULL DEFAULT 2000,
  eraser_remaining INTEGER NOT NULL DEFAULT 0,
  last_ink_refill TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_eraser_refill TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Pixels table to store the canvas state
CREATE TABLE pixels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  x INTEGER NOT NULL CHECK (x >= 0 AND x < 1600),
  y INTEGER NOT NULL CHECK (y >= 0 AND y < 900),
  color TEXT NOT NULL,
  user_id UUID REFERENCES user_sessions(id),
  ip_address INET NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(x, y)
);

-- Chat messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 100),
  user_id UUID REFERENCES user_sessions(id),
  ip_address INET NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_pixels_xy ON pixels(x, y);
CREATE INDEX idx_pixels_created_at ON pixels(created_at);
CREATE INDEX idx_user_sessions_ip ON user_sessions(ip_address);
CREATE INDEX idx_user_sessions_wallet ON user_sessions(wallet_address);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_game_state_active ON game_state(is_active);

-- Function to get or create user session
CREATE OR REPLACE FUNCTION get_or_create_user_session(
  p_ip_address INET,
  p_wallet_address TEXT DEFAULT NULL
) RETURNS user_sessions AS $$
DECLARE
  session user_sessions;
BEGIN
  -- Try to find existing session
  SELECT * INTO session 
  FROM user_sessions 
  WHERE ip_address = p_ip_address 
    AND (p_wallet_address IS NULL OR wallet_address = p_wallet_address)
  LIMIT 1;
  
  -- If no session exists, create one
  IF session IS NULL THEN
    INSERT INTO user_sessions (ip_address, wallet_address)
    VALUES (p_ip_address, p_wallet_address)
    RETURNING * INTO session;
  END IF;
  
  RETURN session;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refill ink for all users
CREATE OR REPLACE FUNCTION refill_ink() RETURNS void AS $$
BEGIN
  UPDATE user_sessions 
  SET ink_remaining = 2000,
      last_ink_refill = NOW(),
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refill eraser for qualified wallets
CREATE OR REPLACE FUNCTION refill_eraser() RETURNS void AS $$
BEGIN
  UPDATE user_sessions 
  SET eraser_remaining = 30,
      last_eraser_refill = NOW(),
      updated_at = NOW()
  WHERE wallet_address IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear all pixels and start new round
CREATE OR REPLACE FUNCTION start_new_round() RETURNS void AS $$
BEGIN
  -- Deactivate current round
  UPDATE game_state SET is_active = false WHERE is_active = true;
  
  -- Create new round
  INSERT INTO game_state (round_number, round_start_time, round_end_time)
  SELECT 
    COALESCE(MAX(round_number), 0) + 1,
    NOW(),
    NOW() + INTERVAL '2 minutes'
  FROM game_state;
  
  -- Clear all pixels
  DELETE FROM pixels;
  
  -- Refill ink and eraser
  PERFORM refill_ink();
  PERFORM refill_eraser();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to place a pixel
CREATE OR REPLACE FUNCTION place_pixel(
  p_x INTEGER,
  p_y INTEGER,
  p_color TEXT,
  p_ip_address INET,
  p_wallet_address TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  session user_sessions;
  current_round game_state;
BEGIN
  -- Check if there's an active round
  SELECT * INTO current_round FROM game_state WHERE is_active = true LIMIT 1;
  IF current_round IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get or create user session
  SELECT * INTO session FROM get_or_create_user_session(p_ip_address, p_wallet_address);
  
  -- Check if user has ink remaining
  IF session.ink_remaining <= 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if pixel is already occupied
  IF EXISTS (SELECT 1 FROM pixels WHERE x = p_x AND y = p_y) THEN
    RETURN FALSE;
  END IF;
  
  -- Place the pixel
  INSERT INTO pixels (x, y, color, user_id, ip_address)
  VALUES (p_x, p_y, p_color, session.id, p_ip_address);
  
  -- Decrease ink
  UPDATE user_sessions 
  SET ink_remaining = ink_remaining - 1,
      updated_at = NOW()
  WHERE id = session.id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to erase a pixel
CREATE OR REPLACE FUNCTION erase_pixel(
  p_x INTEGER,
  p_y INTEGER,
  p_ip_address INET,
  p_wallet_address TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  session user_sessions;
  current_round game_state;
BEGIN
  -- Check if there's an active round
  SELECT * INTO current_round FROM game_state WHERE is_active = true LIMIT 1;
  IF current_round IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get user session (must have wallet for eraser)
  SELECT * INTO session 
  FROM user_sessions 
  WHERE ip_address = p_ip_address AND wallet_address = p_wallet_address
  LIMIT 1;
  
  IF session IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has eraser remaining
  IF session.eraser_remaining <= 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if pixel exists and can be erased
  IF NOT EXISTS (SELECT 1 FROM pixels WHERE x = p_x AND y = p_y) THEN
    RETURN FALSE;
  END IF;
  
  -- Erase the pixel
  DELETE FROM pixels WHERE x = p_x AND y = p_y;
  
  -- Decrease eraser
  UPDATE user_sessions 
  SET eraser_remaining = eraser_remaining - 1,
      updated_at = NOW()
  WHERE id = session.id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add chat message
CREATE OR REPLACE FUNCTION add_chat_message(
  p_username TEXT,
  p_content TEXT,
  p_ip_address INET,
  p_wallet_address TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  session user_sessions;
  last_message_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check message length
  IF char_length(p_content) > 100 THEN
    RETURN FALSE;
  END IF;
  
  -- Get or create user session
  SELECT * INTO session FROM get_or_create_user_session(p_ip_address, p_wallet_address);
  
  -- Check rate limiting (10 seconds between messages per IP)
  SELECT MAX(created_at) INTO last_message_time
  FROM chat_messages
  WHERE ip_address = p_ip_address;
  
  IF last_message_time IS NOT NULL AND NOW() - last_message_time < INTERVAL '10 seconds' THEN
    RETURN FALSE;
  END IF;
  
  -- Add the message
  INSERT INTO chat_messages (username, content, user_id, ip_address)
  VALUES (p_username, p_content, session.id, p_ip_address);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security (RLS) policies
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pixels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow public read access to game state
CREATE POLICY "Allow public read access to game state" ON game_state
  FOR SELECT USING (true);

-- Allow public read access to pixels
CREATE POLICY "Allow public read access to pixels" ON pixels
  FOR SELECT USING (true);

-- Allow public read access to chat messages
CREATE POLICY "Allow public read access to chat messages" ON chat_messages
  FOR SELECT USING (true);

-- Allow users to read their own session data
CREATE POLICY "Allow users to read own session" ON user_sessions
  FOR SELECT USING (true);

-- Allow users to update their own session data
CREATE POLICY "Allow users to update own session" ON user_sessions
  FOR UPDATE USING (true);

-- Allow authenticated users to insert pixels (handled by function)
CREATE POLICY "Allow pixel placement" ON pixels
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to delete pixels (handled by function)
CREATE POLICY "Allow pixel deletion" ON pixels
  FOR DELETE USING (true);

-- Allow authenticated users to insert chat messages (handled by function)
CREATE POLICY "Allow chat message insertion" ON chat_messages
  FOR INSERT WITH CHECK (true);

-- Insert initial game state
INSERT INTO game_state (round_number, round_start_time, round_end_time, is_active)
VALUES (1, NOW(), NOW() + INTERVAL '2 minutes', true);

-- Create a cron job function to handle round resets
CREATE OR REPLACE FUNCTION handle_round_reset() RETURNS void AS $$
BEGIN
  -- Check if current round has ended
  IF EXISTS (
    SELECT 1 FROM game_state 
    WHERE is_active = true AND round_end_time <= NOW()
  ) THEN
    PERFORM start_new_round();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually trigger round reset (called from frontend)
CREATE OR REPLACE FUNCTION trigger_round_reset() RETURNS void AS $$
BEGIN
  PERFORM handle_round_reset();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 