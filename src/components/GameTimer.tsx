import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { gameService } from '@/lib/gameService';

interface GameTimerProps {
  onReset: () => void;
}

export const GameTimer: React.FC<GameTimerProps> = ({ onReset }) => {
  const [timeLeft, setTimeLeft] = useState(30);
  const [roundNumber, setRoundNumber] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let roundEndTime: Date | null = null;
    let currentRoundNumber = 0;
    let lastResetTime = 0;
    let isRoundEnding = false;

    // Initialize timer with current game state
    const initializeTimer = async () => {
      try {
        const gameState = await gameService.getSynchronizedGameState();
        roundEndTime = new Date(gameState.round_end_time);
        currentRoundNumber = gameState.round_number;
        
        const now = new Date();
        const remaining = Math.max(0, Math.floor((roundEndTime.getTime() - now.getTime()) / 1000));
        
        setTimeLeft(remaining);
        setRoundNumber(currentRoundNumber);
        setIsInitialized(true);
        
        console.log(`Timer initialized: ${remaining}s remaining, round ${currentRoundNumber}`);
      } catch (error) {
        console.error('Error initializing timer:', error);
        // Fallback to 30 seconds
        setTimeLeft(30);
        setRoundNumber(0);
        setIsInitialized(true);
      }
    };

    // Check for round changes
    const checkRoundChange = async () => {
      try {
        const gameState = await gameService.getSynchronizedGameState();
        if (gameState.round_number !== currentRoundNumber) {
          console.log(`Round changed from ${currentRoundNumber} to ${gameState.round_number}`);
          
          // Update local state
          roundEndTime = new Date(gameState.round_end_time);
          currentRoundNumber = gameState.round_number;
          
          // Update UI
          setRoundNumber(currentRoundNumber);
          setTimeLeft(30); // Reset to 30 seconds for new round
          
          // Trigger reset (but prevent multiple rapid resets)
          const now = Date.now();
          if (now - lastResetTime > 1000) {
            lastResetTime = now;
            isRoundEnding = false;
            onReset();
          }
        }
      } catch (error) {
        console.error('Error checking round change:', error);
      }
    };

    // Initialize timer
    initializeTimer();

    // Check for round changes every 2 seconds
    const roundCheckInterval = setInterval(checkRoundChange, 2000);

    // Update countdown every second
    const countdownInterval = setInterval(() => {
      if (!isInitialized || !roundEndTime) return;

      const now = new Date();
      const remaining = Math.max(0, Math.floor((roundEndTime.getTime() - now.getTime()) / 1000));
      
      setTimeLeft(remaining);
      
      // If round ended and we haven't already triggered a reset
      if (remaining === 0 && !isRoundEnding) {
        console.log('Round ended, checking for new round');
        isRoundEnding = true;
        setTimeout(checkRoundChange, 100);
      }
    }, 1000);

    return () => {
      clearInterval(roundCheckInterval);
      clearInterval(countdownInterval);
    };
  }, [onReset, isInitialized]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const progressPercentage = ((30 - timeLeft) / 30) * 100;

  return (
    <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-lg shadow-lg">
      <Clock className="text-gray-600" size={20} />
      <div className="flex flex-col items-center">
        <div className="text-lg font-bold text-gray-800">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
        <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
          <div
            className="bg-gradient-to-r from-green-400 to-red-500 h-2 rounded-full transition-all duration-1000"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-sm text-gray-600">until reset</span>
        <span className="text-xs text-gray-500">Round {roundNumber}</span>
      </div>
    </div>
  );
};
