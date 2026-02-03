
import React, { useState, useRef, useEffect } from 'react';

interface Position {
    x: number;
    y: number;
}

interface DraggableFabProps {
    children: React.ReactNode;
    initialPosition?: Position;
    className?: string;
    onPositionChange?: (pos: Position) => void;
}

export const DraggableFab: React.FC<DraggableFabProps> = ({
    children,
    initialPosition,
    className = "",
    onPositionChange
}) => {
    // Default position: Bottom right area (but above standard nav bar)
    const [position, setPosition] = useState<Position>(initialPosition || {
        x: window.innerWidth - 80,
        y: window.innerHeight - 200
    });

    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
    const fabRef = useRef<HTMLDivElement>(null);
    const hasMoved = useRef(false);

    useEffect(() => {
        // Initial responsive positioning if not provided
        if (!initialPosition) {
            setPosition({
                x: window.innerWidth - 80,
                y: window.innerHeight - 200
            });
        }

        const handleResize = () => {
            // Keep within bounds on resize
            setPosition(prev => ({
                x: Math.min(prev.x, window.innerWidth - 60),
                y: Math.min(prev.y, window.innerHeight - 60)
            }));
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [initialPosition]);

    const handleStart = (clientX: number, clientY: number) => {
        setIsDragging(true);
        setDragStart({
            x: clientX - position.x,
            y: clientY - position.y
        });
        hasMoved.current = false;
    };

    const handleMove = (clientX: number, clientY: number) => {
        if (!isDragging) return;

        hasMoved.current = true;
        const newX = clientX - dragStart.x;
        const newY = clientY - dragStart.y;

        // Boundaries
        const maxX = window.innerWidth - (fabRef.current?.offsetWidth || 60);
        const maxY = window.innerHeight - (fabRef.current?.offsetHeight || 60);

        setPosition({
            x: Math.max(10, Math.min(newX, maxX)),
            y: Math.max(10, Math.min(newY, maxY))
        });
    };

    const handleEnd = () => {
        if (isDragging) {
            setIsDragging(false);
            if (hasMoved.current) {
                // Snap to edge logic (optional - AssistiveTouch style)
                const screenWidth = window.innerWidth;
                const buttonWidth = fabRef.current?.offsetWidth || 60;
                const centerX = position.x + buttonWidth / 2;

                let targetX = position.x;

                // Snap to left or right if released
                if (centerX < screenWidth / 2) {
                    targetX = 16; // Left margin
                } else {
                    targetX = screenWidth - buttonWidth - 16; // Right margin
                }

                // Smooth snap
                setPosition(prev => ({ ...prev, x: targetX }));

                onPositionChange?.({ x: targetX, y: position.y });
            }
        }
    };

    // Mouse Events
    const onMouseDown = (e: React.MouseEvent) => {
        // Only left click
        if (e.button !== 0) return;
        e.preventDefault();
        handleStart(e.clientX, e.clientY);
    };

    const onMouseMove = (e: MouseEvent) => {
        if (isDragging) {
            e.preventDefault();
            handleMove(e.clientX, e.clientY);
        }
    };

    const onMouseUp = () => handleEnd();

    // Touch Events
    const onTouchStart = (e: React.TouchEvent) => {
        // e.preventDefault(); // Might block scrolling if not careful, but needed for drag
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
        if (isDragging) {
            e.preventDefault(); // Prevent scrolling while dragging fab
            handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    };

    const onTouchEnd = () => handleEnd();

    // Global listeners for move/up to catch moving outside the element
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            window.addEventListener('touchmove', onTouchMove, { passive: false });
            window.addEventListener('touchend', onTouchEnd);
        } else {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
        }
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
        };
    }, [isDragging]);

    return (
        <div
            ref={fabRef}
            className={`fixed z-[100] touch-none select-none transition-shadow ${className}`}
            style={{
                left: position.x,
                top: position.y,
                cursor: isDragging ? 'grabbing' : 'grab',
                transition: isDragging ? 'none' : 'left 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
            }}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
        >
            {children}
        </div>
    );
};
