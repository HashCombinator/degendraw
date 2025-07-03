
import React from 'react';
import { X, Palette, Clock, MessageCircle, Wallet } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">How to Play</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 p-2 rounded-full">
                <Palette className="text-blue-600" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Drawing</h3>
                <p className="text-gray-600 text-sm">
                  Select the pen tool and choose a color from the palette. Click on empty pixels to draw. 
                  You start with 30 ink units per round. Once a pixel is colored, it can't be overwritten!
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-red-100 p-2 rounded-full">
                <Wallet className="text-red-600" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Eraser (Token-Gated)</h3>
                <p className="text-gray-600 text-sm">
                  Connect your wallet and hold 50,000+ tokens to unlock the eraser tool. 
                  Erasers can remove colored pixels and are refilled every round.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-green-100 p-2 rounded-full">
                <Clock className="text-green-600" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Timer & Resets</h3>
                <p className="text-gray-600 text-sm">
                  Every 2 minutes, the canvas resets and everyone gets fresh ink! 
                  Work together (or compete) to create art before time runs out.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-purple-100 p-2 rounded-full">
                <MessageCircle className="text-purple-600" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Chat</h3>
                <p className="text-gray-600 text-sm">
                  Coordinate with other players in the chat! Messages are limited to 100 characters 
                  and you can send one message every 10 seconds.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">Tips for Success:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Plan your art before you start - ink is limited!</li>
              <li>• Work together with other players for bigger creations</li>
              <li>• Use chat to coordinate colors and designs</li>
              <li>• Connect your wallet to unlock eraser privileges</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
