import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { gameService } from '@/lib/gameService';

interface CanvasProps {
  selectedColor: string;
  currentTool: 'pen' | 'eraser';
  inkRemaining: number;
  onInkUsed: () => void;
  hasEraserAccess: boolean;
}

export const DrawingCanvas: React.FC<CanvasProps> = ({
  selectedColor,
  currentTool,
  inkRemaining,
  onInkUsed,
  hasEraserAccess
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pixelData, setPixelData] = useState<string[][]>(
    Array(900).fill(null).map(() => Array(1600).fill(''))
  );
  const { toast } = useToast();

  const PIXEL_SIZE = 3;
  const CANVAS_WIDTH = 1600;
  const CANVAS_HEIGHT = 900;

  const drawPixel = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixelX = Math.floor(x / PIXEL_SIZE);
    const pixelY = Math.floor(y / PIXEL_SIZE);

    if (pixelX < 0 || pixelX >= CANVAS_WIDTH / PIXEL_SIZE || 
        pixelY < 0 || pixelY >= CANVAS_HEIGHT / PIXEL_SIZE) {
      return;
    }

    if (currentTool === 'pen') {
      if (inkRemaining <= 0) {
        toast({
          title: "Out of ink!",
          description: "Wait for the next round to get more ink.",
          variant: "destructive"
        });
        return;
      }

      // Check if any pixel in the 3x3 area is already filled
      let hasConflict = false;
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          const checkY = pixelY + dy;
          const checkX = pixelX + dx;
          if (checkY < 900 && checkX < 1600 && pixelData[checkY]?.[checkX] !== '') {
            hasConflict = true;
            break;
          }
        }
        if (hasConflict) break;
      }
      
      if (hasConflict) {
        toast({
          title: "Area already filled!",
          description: "You can't draw over existing pixels.",
          variant: "destructive"
        });
        return;
      }

      // Draw 3x3 square immediately for smooth UX
      ctx.fillStyle = selectedColor;
      ctx.fillRect(pixelX * PIXEL_SIZE, pixelY * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
      
      // Update pixel data for the 3x3 area
      setPixelData(prev => {
        const newData = [...prev];
        // Fill the 3x3 area
        for (let dy = 0; dy < 3; dy++) {
          for (let dx = 0; dx < 3; dx++) {
            const newY = pixelY + dy;
            const newX = pixelX + dx;
            if (newY < 900 && newX < 1600) {
              if (!newData[newY]) {
                newData[newY] = [...newData[newY]];
              }
              newData[newY][newX] = selectedColor;
            }
          }
        }
        return newData;
      });

      // Send to backend (debounced)
      gameService.placePixel(pixelX, pixelY, selectedColor).catch(error => {
        console.error('Error placing pixel:', error);
      });

      onInkUsed();
    } else if (currentTool === 'eraser') {
      // Check if any pixel in the 3x3 area is filled
      let hasPixels = false;
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          const checkY = pixelY + dy;
          const checkX = pixelX + dx;
          if (checkY < 900 && checkX < 1600 && pixelData[checkY]?.[checkX] !== '') {
            hasPixels = true;
            break;
          }
        }
        if (hasPixels) break;
      }
      
      if (!hasPixels) return;

      // Erase the 3x3 area immediately
      ctx.clearRect(pixelX * PIXEL_SIZE, pixelY * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
      
      setPixelData(prev => {
        const newData = [...prev];
        // Clear the 3x3 area
        for (let dy = 0; dy < 3; dy++) {
          for (let dx = 0; dx < 3; dx++) {
            const newY = pixelY + dy;
            const newX = pixelX + dx;
            if (newY < 900 && newX < 1600) {
              if (!newData[newY]) {
                newData[newY] = [...newData[newY]];
              }
              newData[newY][newX] = '';
            }
          }
        }
        return newData;
      });

      // Send erase to backend
      gameService.erasePixel(pixelX, pixelY).catch(error => {
        console.error('Error erasing pixel:', error);
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

  // Initialize game service and load existing pixels
  useEffect(() => {
    const initializeCanvas = async () => {
      try {
        await gameService.initializeSession();
        const pixels = await gameService.getPixels();
        
        // Load existing pixels into canvas
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        pixels.forEach(pixel => {
          if (pixel.color) {
            ctx.fillStyle = pixel.color;
            ctx.fillRect(pixel.x * PIXEL_SIZE, pixel.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
            
            setPixelData(prev => {
              const newData = [...prev];
              newData[pixel.y] = [...newData[pixel.y]];
              newData[pixel.y][pixel.x] = pixel.color;
              return newData;
            });
          }
        });
      } catch (error) {
        console.error('Error loading pixels:', error);
      }
    };

    initializeCanvas();
  }, []);

  // Subscribe to real-time pixel updates
  useEffect(() => {
    console.log('Setting up real-time subscription...');
    
    const subscription = gameService.subscribeToPixels((pixel) => {
      console.log('Received real-time pixel update:', pixel);
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (pixel.color) {
        // New pixel placed by another user
        console.log('Drawing pixel from another user:', pixel.x, pixel.y, pixel.color);
        ctx.fillStyle = pixel.color;
        ctx.fillRect(pixel.x * PIXEL_SIZE, pixel.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        
        setPixelData(prev => {
          const newData = [...prev];
          newData[pixel.y] = [...newData[pixel.y]];
          newData[pixel.y][pixel.x] = pixel.color;
          return newData;
        });
      } else {
        // Pixel erased by another user
        console.log('Erasing pixel from another user:', pixel.x, pixel.y);
        ctx.clearRect(pixel.x * PIXEL_SIZE, pixel.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        
        setPixelData(prev => {
          const newData = [...prev];
          newData[pixel.y] = [...newData[pixel.y]];
          newData[pixel.y][pixel.x] = '';
          return newData;
        });
      }
    });

    return () => {
      console.log('Cleaning up real-time subscription...');
      subscription.unsubscribe();
    };
  }, []);

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
