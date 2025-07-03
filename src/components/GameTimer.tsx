
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface GameTimerProps {
  onReset: () => void;
}

export const GameTimer: React.FC<GameTimerProps> = ({ onReset }) => {
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes in seconds

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onReset();
          return 120; // Reset to 2 minutes
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onReset]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const progressPercentage = ((120 - timeLeft) / 120) * 100;

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
      <span className="text-sm text-gray-600">until reset</span>
    </div>
  );
};
