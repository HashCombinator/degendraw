
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CanvasProps {
  selectedColor: string;
  currentTool: 'pen' | 'eraser';
  inkRemaining: number;
  onInkUsed: () => void;
}

export const DrawingCanvas: React.FC<CanvasProps> = ({
  selectedColor,
  currentTool,
  inkRemaining,
  onInkUsed
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pixelData, setPixelData] = useState<string[][]>(
    Array(900).fill(null).map(() => Array(1600).fill(''))
  );
  const { toast } = useToast();

  const PIXEL_SIZE = 1;
  const CANVAS_WIDTH = 1600;
  const CANVAS_HEIGHT = 900;

  const drawPixel = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixelX = Math.floor(x / PIXEL_SIZE);
    const pixelY = Math.floor(y / PIXEL_SIZE);

    if (pixelX < 0 || pixelX >= CANVAS_WIDTH || pixelY < 0 || pixelY >= CANVAS_HEIGHT) return;

    if (currentTool === 'pen') {
      if (inkRemaining <= 0) {
        toast({
          title: "Out of ink!",
          description: "Wait for the next round to get more ink.",
          variant: "destructive"
        });
        return;
      }

      if (pixelData[pixelY][pixelX] !== '') {
        toast({
          title: "Pixel already filled!",
          description: "You can't draw over existing pixels.",
          variant: "destructive"
        });
        return;
      }

      ctx.fillStyle = selectedColor;
      ctx.fillRect(pixelX * PIXEL_SIZE, pixelY * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
      
      setPixelData(prev => {
        const newData = [...prev];
        newData[pixelY] = [...newData[pixelY]];
        newData[pixelY][pixelX] = selectedColor;
        return newData;
      });

      onInkUsed();
    } else if (currentTool === 'eraser') {
      if (pixelData[pixelY][pixelX] === '') return;

      ctx.clearRect(pixelX * PIXEL_SIZE, pixelY * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
      
      setPixelData(prev => {
        const newData = [...prev];
        newData[pixelY] = [...newData[pixelY]];
        newData[pixelY][pixelX] = '';
        return newData;
      });
    }
  }, [selectedColor, currentTool, inkRemaining, pixelData, onInkUsed, toast]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    drawPixel(x, y);
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    handleCanvasClick(event);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    handleCanvasClick(event);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    setPixelData(Array(900).fill(null).map(() => Array(1600).fill('')));
    
    toast({
      title: "Canvas Reset!",
      description: "New round started - everyone gets fresh ink!",
    });
  }, [toast]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (let y = 0; y < pixelData.length; y++) {
      for (let x = 0; x < pixelData[y].length; x++) {
        if (pixelData[y][x]) {
          ctx.fillStyle = pixelData[y][x];
          ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        }
      }
    }
  }, [pixelData]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Expose clearCanvas method to parent
  useEffect(() => {
    (window as any).clearCanvas = clearCanvas;
  }, [clearCanvas]);

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-100 p-4 rounded-lg">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
        className="border-2 border-gray-300 cursor-crosshair max-w-full max-h-full"
        style={{
          imageRendering: 'pixelated',
          width: '100%',
          height: 'auto',
          maxWidth: '1600px',
          maxHeight: '900px'
        }}
      />
    </div>
  );
};
