
import React, { useState, useCallback } from 'react';
import { DrawingCanvas } from '@/components/DrawingCanvas';
import { ColorPalette } from '@/components/ColorPalette';
import { ToolPanel } from '@/components/ToolPanel';
import { GameTimer } from '@/components/GameTimer';
import { ChatBox } from '@/components/ChatBox';
import { WalletConnection } from '@/components/WalletConnection';
import { HelpModal } from '@/components/HelpModal';
import { HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser'>('pen');
  const [inkRemaining, setInkRemaining] = useState(2000);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const { toast } = useToast();

  const MAX_INK = 2000;
  const hasEraserAccess = false; // Will be determined by wallet token balance

  const handleInkUsed = useCallback(() => {
    setInkRemaining(prev => Math.max(0, prev - 1));
  }, []);

  const handleGameReset = useCallback(() => {
    setInkRemaining(MAX_INK);
    if ((window as any).clearCanvas) {
      (window as any).clearCanvas();
    }
    toast({
      title: "New Round Started!",
      description: "Canvas reset and ink refilled!",
    });
  }, [toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-white shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            PixelBattle
          </h1>
          <GameTimer onReset={handleGameReset} />
        </div>
        
        <div className="flex items-center gap-4">
          <WalletConnection />
          <button
            onClick={() => setIsHelpOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <HelpCircle size={18} />
            <span className="text-sm">Help</span>
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <div className="flex-1 flex gap-4 p-4">
        {/* Left Sidebar - Tools */}
        <div className="flex flex-col gap-4">
          <ToolPanel
            currentTool={currentTool}
            onToolSelect={setCurrentTool}
            inkRemaining={inkRemaining}
            maxInk={MAX_INK}
            hasEraserAccess={hasEraserAccess}
          />
        </div>

        {/* Main Canvas */}
        <div className="flex-1 flex flex-col">
          <DrawingCanvas
            selectedColor={selectedColor}
            currentTool={currentTool}
            inkRemaining={inkRemaining}
            onInkUsed={handleInkUsed}
          />
        </div>

        {/* Right Sidebar - Colors */}
        <div className="flex flex-col gap-4">
          <ColorPalette
            selectedColor={selectedColor}
            onColorSelect={setSelectedColor}
          />
        </div>
      </div>

      {/* Bottom Area - Chat */}
      <div className="flex justify-between items-end p-4">
        <ChatBox />
        <div className="text-xs text-gray-500 bg-white px-3 py-2 rounded-lg shadow">
          Canvas: 1600×900 pixels | Round: 2 minutes
        </div>
      </div>

      {/* Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
};

export default Index;
