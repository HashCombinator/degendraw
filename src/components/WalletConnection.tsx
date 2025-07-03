
import React, { useState } from 'react';
import { Wallet } from 'lucide-react';

export const WalletConnection: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  const handleConnect = () => {
    // Placeholder for wallet connection logic
    // In real implementation, this would use Solana Wallet Adapter
    const mockAddress = '7xKi...9mF2';
    setWalletAddress(mockAddress);
    setIsConnected(true);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setWalletAddress('');
  };

  return (
    <div className="flex items-center gap-3">
      {!isConnected ? (
        <button
          onClick={handleConnect}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors shadow-lg"
        >
          <Wallet size={18} />
          <span className="text-sm font-medium">Connect Wallet</span>
        </button>
      ) : (
        <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg">
          <Wallet size={18} />
          <div className="flex flex-col">
            <span className="text-xs font-medium">Connected</span>
            <span className="text-xs">{walletAddress}</span>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-xs text-green-600 hover:text-green-800 ml-2"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};
