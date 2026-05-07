import React, { useState, useRef, useEffect, useCallback } from 'react';

interface UndoButtonProps {
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    className?: string;
}

const UndoButton: React.FC<UndoButtonProps> = ({ onUndo, onRedo, canUndo, canRedo, className }) => {
    const [isHolding, setIsHolding] = useState(false);
    const [holdProgress, setHoldProgress] = useState(0);
    const pressTimer = useRef<NodeJS.Timeout | null>(null);
    const progressInterval = useRef<NodeJS.Timeout | null>(null);
    const actionTriggered = useRef(false);

    const DURATION = 2000; // 2 seconds

    const clearTimers = useCallback(() => {
        if (pressTimer.current) clearTimeout(pressTimer.current);
        if (progressInterval.current) clearInterval(progressInterval.current);
        setIsHolding(false);
        setHoldProgress(0);
    }, []);

    const handlePressStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        if (!canUndo && !canRedo) return;
        actionTriggered.current = false;
        setIsHolding(true);
        setHoldProgress(0);

        const startTime = Date.now();

        // Only show progress if we CAN redo
        if (canRedo) {
            progressInterval.current = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min((elapsed / DURATION) * 100, 100);
                setHoldProgress(progress);
            }, 50);

            pressTimer.current = setTimeout(() => {
                clearInterval(progressInterval.current!);
                actionTriggered.current = true;
                onRedo();
                clearTimers();
            }, DURATION);
        }
    }, [canUndo, canRedo, onRedo, clearTimers]);

    const handlePressEnd = useCallback(() => {
        if (!canUndo && !canRedo) return;
        if (!actionTriggered.current && isHolding) {
            if (canUndo) {
                onUndo();
            }
        }
        clearTimers();
    }, [canUndo, canRedo, isHolding, onUndo, clearTimers]);

    useEffect(() => {
        return clearTimers;
    }, [clearTimers]);

    if (!canUndo && !canRedo) return null;

    return (
        <button
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onTouchCancel={clearTimers}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={clearTimers}
            className={className || "absolute top-4 left-4 md:top-6 md:left-6 z-50 p-3 rounded-full bg-base-300/80 backdrop-blur-md border border-white/10 text-gray-400 hover:text-white transition-all shadow-lg active:scale-95 flex items-center justify-center overflow-hidden group select-none"}
            title={canRedo ? "Hold for 2s to Redo" : "Tap to Undo"}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'none' }}
        >
            {isHolding && canRedo && (
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                    <circle
                        cx="50"
                        cy="50"
                        r="48"
                        fill="none"
                        stroke="rgba(147, 51, 234, 0.8)"
                        strokeWidth="4"
                        strokeDasharray="301.59"
                        strokeDashoffset={301.59 - (holdProgress / 100) * 301.59}
                        strokeLinecap="round"
                    />
                </svg>
            )}
            {canRedo ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 relative z-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
            )}
        </button>
    );
};

export default UndoButton;
