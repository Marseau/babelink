import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Move, RotateCw } from 'lucide-react';

interface CaptureFrameProps {
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  onPositionChange: (position: { x: number; y: number; width: number; height: number }) => void;
  isActive: boolean;
}

interface ResizeHandle {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right';
  cursor: string;
}

const resizeHandles: ResizeHandle[] = [
  { position: 'top-left', cursor: 'nw-resize' },
  { position: 'top-right', cursor: 'ne-resize' },
  { position: 'bottom-left', cursor: 'sw-resize' },
  { position: 'bottom-right', cursor: 'se-resize' },
  { position: 'top', cursor: 'n-resize' },
  { position: 'bottom', cursor: 's-resize' },
  { position: 'left', cursor: 'w-resize' },
  { position: 'right', cursor: 'e-resize' },
];

export function CaptureFrame({ position, onPositionChange, isActive }: CaptureFrameProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const frameRef = useRef<HTMLDivElement>(null);

  // Handle dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === frameRef.current || (e.target as HTMLElement).classList.contains('drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
      e.preventDefault();
    }
  }, [position]);

  // Handle resizing
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: string) => {
    setIsResizing(true);
    setResizeHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    e.stopPropagation();
    e.preventDefault();
  }, []);

  // Mouse move handler
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Constrain to viewport
      const maxX = window.innerWidth - position.width;
      const maxY = window.innerHeight - position.height;
      
      onPositionChange({
        ...position,
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    } else if (isResizing && resizeHandle) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      let newPosition = { ...position };
      
      switch (resizeHandle) {
        case 'top-left':
          newPosition.x += deltaX;
          newPosition.y += deltaY;
          newPosition.width -= deltaX;
          newPosition.height -= deltaY;
          break;
        case 'top-right':
          newPosition.y += deltaY;
          newPosition.width += deltaX;
          newPosition.height -= deltaY;
          break;
        case 'bottom-left':
          newPosition.x += deltaX;
          newPosition.width -= deltaX;
          newPosition.height += deltaY;
          break;
        case 'bottom-right':
          newPosition.width += deltaX;
          newPosition.height += deltaY;
          break;
        case 'top':
          newPosition.y += deltaY;
          newPosition.height -= deltaY;
          break;
        case 'bottom':
          newPosition.height += deltaY;
          break;
        case 'left':
          newPosition.x += deltaX;
          newPosition.width -= deltaX;
          break;
        case 'right':
          newPosition.width += deltaX;
          break;
      }
      
      // Enforce minimum size
      newPosition.width = Math.max(100, newPosition.width);
      newPosition.height = Math.max(60, newPosition.height);
      
      // Constrain to viewport
      newPosition.x = Math.max(0, Math.min(newPosition.x, window.innerWidth - newPosition.width));
      newPosition.y = Math.max(0, Math.min(newPosition.y, window.innerHeight - newPosition.height));
      
      onPositionChange(newPosition);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, isResizing, resizeHandle, dragStart, position, onPositionChange]);

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  }, []);

  // Event listeners
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const getHandleStyle = (handle: ResizeHandle) => {
    const baseStyle = {
      position: 'absolute' as const,
      width: '12px',
      height: '12px',
      backgroundColor: '#ff6b35',
      border: '2px solid white',
      borderRadius: '50%',
      cursor: handle.cursor,
      zIndex: 10,
    };

    const offset = -6; // Half of width/height

    switch (handle.position) {
      case 'top-left':
        return { ...baseStyle, top: offset, left: offset };
      case 'top-right':
        return { ...baseStyle, top: offset, right: offset };
      case 'bottom-left':
        return { ...baseStyle, bottom: offset, left: offset };
      case 'bottom-right':
        return { ...baseStyle, bottom: offset, right: offset };
      case 'top':
        return { ...baseStyle, top: offset, left: '50%', transform: 'translateX(-50%)' };
      case 'bottom':
        return { ...baseStyle, bottom: offset, left: '50%', transform: 'translateX(-50%)' };
      case 'left':
        return { ...baseStyle, top: '50%', left: offset, transform: 'translateY(-50%)' };
      case 'right':
        return { ...baseStyle, top: '50%', right: offset, transform: 'translateY(-50%)' };
      default:
        return baseStyle;
    }
  };

  return (
    <div className="relative w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
      <motion.div
        ref={frameRef}
        className={`absolute border-2 ${
          isActive 
            ? 'border-orange-500 bg-orange-500/10' 
            : 'border-orange-400 bg-orange-400/10'
        } rounded cursor-move select-none`}
        style={{
          left: position.x,
          top: position.y,
          width: position.width,
          height: position.height,
        }}
        onMouseDown={handleMouseDown}
        animate={{
          borderColor: isActive ? '#ff6b35' : '#fb923c',
          boxShadow: isActive 
            ? '0 4px 20px rgba(255, 107, 53, 0.3)' 
            : '0 2px 10px rgba(251, 146, 60, 0.2)',
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Drag handle in center */}
        <div className="drag-handle absolute inset-0 flex items-center justify-center">
          <div className="bg-white/90 dark:bg-gray-800/90 p-2 rounded-full shadow-sm">
            {isActive ? (
              <RotateCw className="w-4 h-4 text-orange-500 animate-spin" />
            ) : (
              <Move className="w-4 h-4 text-orange-500" />
            )}
          </div>
        </div>

        {/* Resize handles */}
        {!isActive && resizeHandles.map((handle) => (
          <div
            key={handle.position}
            style={getHandleStyle(handle)}
            onMouseDown={(e) => handleResizeStart(e, handle.position)}
          />
        ))}

        {/* Coordinates display */}
        <div className="absolute -top-8 left-0 bg-orange-500 text-white text-xs px-2 py-1 rounded text-nowrap">
          {position.width} × {position.height}
        </div>
      </motion.div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 right-4 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {isActive 
            ? 'Capturing text from selected area...' 
            : 'Drag to move • Use handles to resize • Click Capture Text when ready'
          }
        </p>
      </div>
    </div>
  );
}