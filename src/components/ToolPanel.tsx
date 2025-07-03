
import React from 'react';
import { Pen, Eraser } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolPanelProps {
  currentTool: 'pen' | 'eraser';
  onToolSelect: (tool: 'pen' | 'eraser') => void;
  inkRemaining: number;
  maxInk: number;
  eraserRemaining: number;
  maxEraser: number;
  hasEraserAccess: boolean;
}

export const ToolPanel: React.FC<ToolPanelProps> = ({
  currentTool,
  onToolSelect,
  inkRemaining,
  maxInk,
  eraserRemaining,
  maxEraser,
  hasEraserAccess
}) => {
  const inkPercentage = (inkRemaining / maxInk) * 100;

  return (
    <div className="flex flex-col gap-4 p-4 bg-white rounded-lg shadow-lg">
      <h3 className="text-sm font-bold text-gray-700">Tools</h3>
      
      {/* Tool Selection */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => onToolSelect('pen')}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md transition-all",
            currentTool === 'pen'
              ? "bg-blue-500 text-white shadow-md"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          )}
        >
          <Pen size={16} />
          <span className="text-sm font-medium">Pen</span>
        </button>
        
        <button
          onClick={() => hasEraserAccess && onToolSelect('eraser')}
          disabled={!hasEraserAccess}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md transition-all",
            currentTool === 'eraser'
              ? "bg-red-500 text-white shadow-md"
              : hasEraserAccess
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-gray-50 text-gray-400 cursor-not-allowed"
          )}
          title={!hasEraserAccess ? "Connect wallet with 50K+ tokens to unlock" : ""}
        >
          <Eraser size={16} />
          <span className="text-sm font-medium">Eraser</span>
          {!hasEraserAccess && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">🔒</span>
          )}
        </button>
      </div>

      {/* Ink Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Ink</span>
          <span className="text-sm text-gray-500">{inkRemaining}/{maxInk}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all duration-300 bg-blue-500"
            style={{ width: `${inkPercentage}%` }}
          />
        </div>
        
        {hasEraserAccess && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Eraser</span>
              <span className="text-sm text-gray-500">{eraserRemaining}/{maxEraser}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full transition-all duration-300 bg-red-500"
                style={{ width: `${(eraserRemaining / maxEraser) * 100}%` }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
