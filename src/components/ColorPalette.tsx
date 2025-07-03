
import React from 'react';
import { cn } from '@/lib/utils';

interface ColorPaletteProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

const COLORS = [
  '#FF0000', // Red
  '#FF8C00', // Orange
  '#FFD700', // Gold
  '#32CD32', // Lime
  '#00CED1', // Turquoise
  '#1E90FF', // Blue
  '#9932CC', // Purple
  '#FF1493', // Pink
  '#000000', // Black
  '#FFFFFF', // White
  '#8B4513', // Brown
  '#808080', // Gray
  '#FFC0CB', // Light Pink
  '#98FB98', // Light Green
  '#87CEEB', // Sky Blue
  '#DDA0DD', // Plum
  '#F0E68C', // Khaki
  '#FA8072', // Salmon
  '#20B2AA', // Light Sea Green
  '#9370DB', // Medium Purple
];

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  selectedColor,
  onColorSelect
}) => {
  return (
    <div className="flex flex-col gap-2 p-4 bg-white rounded-lg shadow-lg">
      <h3 className="text-sm font-bold text-gray-700 mb-2">Colors</h3>
      <div className="grid grid-cols-2 gap-2">
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onColorSelect(color)}
            className={cn(
              "w-8 h-8 rounded border-2 transition-all hover:scale-110",
              selectedColor === color
                ? "border-gray-800 shadow-lg scale-110"
                : "border-gray-300 hover:border-gray-500"
            )}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  );
};
