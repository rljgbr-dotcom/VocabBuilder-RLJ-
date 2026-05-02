import React, { useState, useRef, useEffect } from 'react';

interface NoteTooltipProps {
    note: string | undefined;
}

/**
 * A small ⓘ icon that reveals a usage note in a popover on tap/click.
 * Renders nothing if note is empty.
 */
const NoteTooltip: React.FC<NoteTooltipProps> = ({ note }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [open]);

    if (!note?.trim()) return null;

    return (
        <div ref={ref} className="relative inline-flex items-center ml-1.5" style={{ verticalAlign: 'middle' }}>
            <button
                onClick={e => { e.stopPropagation(); setOpen(prev => !prev); }}
                className="text-blue-400/70 hover:text-blue-300 transition-colors focus:outline-none"
                title="Usage note"
                aria-label="Show usage note"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </button>
            {open && (
                <div
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-64 bg-base-100 border border-blue-500/30 rounded-xl shadow-xl p-3 text-left"
                    onClick={e => e.stopPropagation()}
                >
                    <p className="text-xs text-blue-300/90 font-semibold mb-1 uppercase tracking-widest">Usage note</p>
                    <p className="text-sm text-gray-300 leading-relaxed">{note}</p>
                </div>
            )}
        </div>
    );
};

export default NoteTooltip;
