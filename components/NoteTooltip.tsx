import React, { useState, useEffect } from 'react';

interface NoteTooltipProps {
    note: string | undefined;
}

interface ParsedNote {
    [key: string]: string;
}

const parseNote = (rawNote: string): ParsedNote | null => {
    if (!rawNote.includes('#')) return null; // Not structured

    const parts = rawNote.split('#');
    const parsed: ParsedNote = {};

    parts.forEach(part => {
        const colonIndex = part.indexOf(':');
        if (colonIndex !== -1) {
            const key = part.substring(0, colonIndex).trim();
            const value = part.substring(colonIndex + 1).trim();
            // Filter out empty, [X], or N/A values
            if (value && value !== '[X]' && value.toUpperCase() !== 'N/A') {
                parsed[key] = value;
            }
        }
    });

    return Object.keys(parsed).length > 0 ? parsed : null;
};

/**
 * An ⓘ icon that reveals a usage note in a modal on tap/click.
 * Parses structured SVA1 notes (GROUP: ... # FORM: ...) and highlights ERR/NUANCE.
 * Shows a dimmed icon if no note is available.
 */
const NoteTooltip: React.FC<NoteTooltipProps> = ({ note }) => {
    const [open, setOpen] = useState(false);
    
    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    const hasNote = !!note?.trim();
    const parsedNote = hasNote ? parseNote(note!) : null;

    // Keys in order of presentation if structured
    const orderedKeys = ['GROUP', 'FORM', 'FREQ', 'PART', 'COLL', 'REG', 'REFL', 'NUANCE', 'ERR'];

    return (
        <>
            <div className="relative inline-flex items-center ml-1.5" style={{ verticalAlign: 'middle' }}>
                <button
                    onClick={e => { e.stopPropagation(); setOpen(true); }}
                    className={`transition-colors focus:outline-none ${hasNote ? 'text-blue-400 hover:text-blue-300' : 'text-gray-500/40 hover:text-gray-400/60'}`}
                    title={hasNote ? "View Linguistic Profile" : "No profile available"}
                    aria-label={hasNote ? "View Linguistic Profile" : "No profile available"}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
            </div>

            {open && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                >
                    <div 
                        className="bg-base-200 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-base-200/95 backdrop-blur z-10 border-b border-white/5 p-4 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Linguistic Profile
                            </h3>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                                className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="p-5">
                            {!hasNote ? (
                                <div className="text-center py-8">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-gray-400">No linguistic profile available for this word.</p>
                                </div>
                            ) : parsedNote ? (
                                <div className="space-y-4">
                                    {orderedKeys.map(key => {
                                        const value = parsedNote[key] || parsedNote[key.toUpperCase()] || parsedNote[key.toLowerCase()];
                                        if (!value) return null;

                                        let bgClass = "bg-base-100 border-white/5";
                                        let titleClass = "text-gray-400";
                                        let textClass = "text-gray-200";
                                        let icon = null;

                                        if (key === 'ERR') {
                                            bgClass = "bg-red-950/30 border-red-500/30";
                                            titleClass = "text-red-400";
                                            textClass = "text-red-100";
                                            icon = (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            );
                                        } else if (key === 'NUANCE') {
                                            bgClass = "bg-blue-950/30 border-blue-500/30";
                                            titleClass = "text-blue-400";
                                            textClass = "text-blue-100";
                                            icon = (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                </svg>
                                            );
                                        }

                                        return (
                                            <div key={key} className={`p-4 rounded-xl border ${bgClass} text-left`}>
                                                <h4 className={`text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center ${titleClass}`}>
                                                    {icon}
                                                    {key === 'ERR' ? 'Learner Mistakes (ERR)' : key === 'NUANCE' ? 'Nuance' : key}
                                                </h4>
                                                <p className={`text-sm leading-relaxed ${textClass} whitespace-pre-wrap`}>{value}</p>
                                            </div>
                                        );
                                    })}

                                    {/* Render any unrecognized keys just in case */}
                                    {Object.keys(parsedNote).filter(k => !orderedKeys.includes(k.toUpperCase())).map(key => (
                                        <div key={key} className="p-4 rounded-xl border bg-base-100 border-white/5 text-left">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">{key}</h4>
                                            <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{parsedNote[key]}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl border bg-base-100 border-white/5 text-left">
                                    <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{note}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default NoteTooltip;
