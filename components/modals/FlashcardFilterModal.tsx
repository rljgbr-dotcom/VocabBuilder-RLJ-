import React, { useState, useEffect } from 'react';
import { useModal } from '../../contexts/ModalContext';
import { useTranslation } from '../../hooks/useTranslation';

type Difficulty = 'unmarked' | 'easy' | 'medium' | 'hard';

const difficultyColors: Record<Difficulty, string> = {
    unmarked: 'bg-gray-500',
    easy: 'bg-green-500',
    medium: 'bg-yellow-500',
    hard: 'bg-red-600',
};

const difficultyLevels: Difficulty[] = ['unmarked', 'easy', 'medium', 'hard'];

const FlashcardFilterModal: React.FC = () => {
    const { modalState, hideModal } = useModal();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'difficulty' | 'wordType' | 'groups'>('difficulty');

    // Local state for immediate visual feedback — synced from props on open
    const [localDifficultyFilters, setLocalDifficultyFilters] = useState<Difficulty[]>([]);
    const [localWordTypeFilters, setLocalWordTypeFilters] = useState<string[]>([]);
    // Group filter local state — mirrors the Set from parent
    const [localGroupFilters, setLocalGroupFilters] = useState<Set<string>>(new Set());
    // Track expanded sources in the groups tab
    const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
    const [expandedSub1s, setExpandedSub1s] = useState<Set<string>>(new Set());

    const isOpen = modalState.type === 'flashcardFilter';

    // Sync local state whenever the modal opens
    useEffect(() => {
        if (isOpen) {
            setLocalDifficultyFilters(modalState.props.difficultyFilters ?? []);
            setLocalWordTypeFilters(modalState.props.wordTypeFilters ?? []);
            setLocalGroupFilters(new Set(modalState.props.groupFilters ?? []));
            setExpandedSources(new Set());
            setExpandedSub1s(new Set());
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!isOpen) return null;

    const {
        availableWordTypes,
        onToggleDifficultyFilter,
        onToggleWordTypeFilter,
        onShowToast,
        groupTree = {},
        onSetGroupFilters,
    } = modalState.props;

    // ── Difficulty ──────────────────────────────────────────────────────────────
    const handleDifficultyToggle = (diff: Difficulty) => {
        if (localDifficultyFilters.length === 1 && localDifficultyFilters.includes(diff)) {
            onShowToast(t('game.flashcards.toast.filterError'));
            return;
        }
        setLocalDifficultyFilters(prev =>
            prev.includes(diff) ? prev.filter(d => d !== diff) : [...prev, diff]
        );
        onToggleDifficultyFilter(diff);
    };

    // ── Word type ───────────────────────────────────────────────────────────────
    const handleWordTypeToggle = (type: string) => {
        if (localWordTypeFilters.length === 1 && localWordTypeFilters.includes(type)) {
            onShowToast(t('game.flashcards.toast.filterError'));
            return;
        }
        setLocalWordTypeFilters(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
        onToggleWordTypeFilter(type);
    };

    // ── Group filter helpers ────────────────────────────────────────────────────
    // A word passes the group filter if:
    //   groupFilters is empty (= all), OR
    //   its source key is in groupFilters, OR
    //   its source::sub1 key is in groupFilters, OR
    //   its source::sub1::sub2 key is in groupFilters

    const applyGroupFilters = (next: Set<string>) => {
        setLocalGroupFilters(new Set(next));
        if (onSetGroupFilters) onSetGroupFilters(new Set(next));
    };

    const toggleGroup = (key: string) => {
        const next = new Set(localGroupFilters);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        applyGroupFilters(next);
    };

    const isGroupActive = (key: string) => {
        if (localGroupFilters.size === 0) return true; // all selected
        return localGroupFilters.has(key);
    };

    // Check if a source is "partially" selected (some sub-groups in, not the source key itself)
    const isSourcePartial = (src: string): boolean => {
        if (localGroupFilters.size === 0) return false;
        if (localGroupFilters.has(src)) return false;
        const sub1s = Object.keys(groupTree[src] ?? {});
        return sub1s.some(s1 => {
            if (localGroupFilters.has(`${src}::${s1}`)) return true;
            const sub2s = Array.from((groupTree[src]?.[s1] ?? new Set()) as Set<string>);
            return sub2s.some(s2 => localGroupFilters.has(`${src}::${s1}::${s2}`));
        });
    };

    const isSub1Partial = (src: string, s1: string): boolean => {
        if (localGroupFilters.size === 0) return false;
        if (localGroupFilters.has(src) || localGroupFilters.has(`${src}::${s1}`)) return false;
        const sub2s = Array.from((groupTree[src]?.[s1] ?? new Set()) as Set<string>);
        return sub2s.some(s2 => localGroupFilters.has(`${src}::${s1}::${s2}`));
    };

    // ── Select All / None ───────────────────────────────────────────────────────
    const handleSelectAllDifficulty = () => {
        difficultyLevels.forEach(d => { if (!localDifficultyFilters.includes(d)) onToggleDifficultyFilter(d); });
        setLocalDifficultyFilters([...difficultyLevels]);
    };

    const handleSelectNoneDifficulty = () => {
        const first = localDifficultyFilters[0] ?? difficultyLevels[0];
        localDifficultyFilters.filter(d => d !== first).forEach(d => onToggleDifficultyFilter(d));
        if (localDifficultyFilters.length === 0) onToggleDifficultyFilter(first);
        setLocalDifficultyFilters([first]);
    };

    const handleSelectAllWordType = () => {
        const all = availableWordTypes ?? [];
        all.forEach((t: string) => { if (!localWordTypeFilters.includes(t)) onToggleWordTypeFilter(t); });
        setLocalWordTypeFilters([...all]);
    };

    const handleSelectNoneWordType = () => {
        const all = availableWordTypes ?? [];
        const first = localWordTypeFilters[0] ?? all[0];
        localWordTypeFilters.filter(t => t !== first).forEach(t => onToggleWordTypeFilter(t));
        if (localWordTypeFilters.length === 0 && all.length > 0) onToggleWordTypeFilter(first);
        setLocalWordTypeFilters([first]);
    };

    const handleSelectAllGroups = () => applyGroupFilters(new Set()); // empty = all
    const handleSelectNoneGroups = () => {
        // Select just the first source as a minimum
        const sources = Object.keys(groupTree);
        if (sources.length === 0) return;
        applyGroupFilters(new Set([sources[0]]));
    };

    // ── Reset All ───────────────────────────────────────────────────────────────
    const handleResetAll = () => {
        handleSelectAllDifficulty();
        handleSelectAllWordType();
        handleSelectAllGroups();
        if (modalState.props.onResetAllFilters) {
            modalState.props.onResetAllFilters();
        }
    };

    const allDifficultySelected = difficultyLevels.every(d => localDifficultyFilters.includes(d));
    const allWordTypeSelected = (availableWordTypes ?? []).every((t: string) => localWordTypeFilters.includes(t));
    const allGroupsSelected = localGroupFilters.size === 0;

    const groupFiltersActive = !allGroupsSelected;
    const sources = Object.keys(groupTree).sort();

    return (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-base-200 p-6 rounded-lg shadow-xl z-50 w-11/12 max-w-sm max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">{t('game.flashcards.filter')}</h3>
                <button
                    onClick={handleResetAll}
                    className="px-2.5 py-1 text-xs font-bold bg-base-300 text-gray-400 rounded-md hover:bg-red-600/20 hover:text-red-400 transition-colors"
                    title="Reset all filters to show everything"
                >
                    Reset All
                </button>
            </div>

            <div className="flex gap-1 mb-3 border-b border-base-300 pb-2 flex-wrap">
                <button
                    onClick={() => setActiveTab('difficulty')}
                    className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${activeTab === 'difficulty' ? 'bg-primary text-primary-content' : 'hover:bg-base-300 text-gray-500'}`}
                >
                    Difficulty
                </button>
                <button
                    onClick={() => setActiveTab('wordType')}
                    className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${activeTab === 'wordType' ? 'bg-primary text-primary-content' : 'hover:bg-base-300 text-gray-500'}`}
                >
                    {t('game.flashcards.wordType')}
                </button>
                <button
                    onClick={() => setActiveTab('groups')}
                    className={`px-3 py-1 text-sm font-bold rounded-md transition-colors relative ${activeTab === 'groups' ? 'bg-primary text-primary-content' : 'hover:bg-base-300 text-gray-500'}`}
                >
                    Groups
                    {groupFiltersActive && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400" />
                    )}
                </button>
            </div>

            {/* Per-tab Select All / None controls */}
            <div className="flex gap-2 mb-3">
                {activeTab === 'difficulty' && (
                    <>
                        <button onClick={handleSelectAllDifficulty} disabled={allDifficultySelected} className="px-2 py-0.5 text-xs font-bold bg-primary/20 text-primary rounded disabled:opacity-40 hover:bg-primary/30 transition-colors">All</button>
                        <button onClick={handleSelectNoneDifficulty} className="px-2 py-0.5 text-xs font-bold bg-base-300 text-gray-400 rounded hover:bg-gray-600/30 transition-colors">None</button>
                    </>
                )}
                {activeTab === 'wordType' && (
                    <>
                        <button onClick={handleSelectAllWordType} disabled={allWordTypeSelected} className="px-2 py-0.5 text-xs font-bold bg-primary/20 text-primary rounded disabled:opacity-40 hover:bg-primary/30 transition-colors">All</button>
                        <button onClick={handleSelectNoneWordType} className="px-2 py-0.5 text-xs font-bold bg-base-300 text-gray-400 rounded hover:bg-gray-600/30 transition-colors">None</button>
                    </>
                )}
                {activeTab === 'groups' && (
                    <>
                        <button onClick={handleSelectAllGroups} disabled={allGroupsSelected} className="px-2 py-0.5 text-xs font-bold bg-primary/20 text-primary rounded disabled:opacity-40 hover:bg-primary/30 transition-colors">All</button>
                        <button onClick={handleSelectNoneGroups} disabled={sources.length === 0} className="px-2 py-0.5 text-xs font-bold bg-base-300 text-gray-400 rounded hover:bg-gray-600/30 transition-colors disabled:opacity-40">None</button>
                    </>
                )}
            </div>

            <div className="overflow-y-auto flex-1 pr-1">
                {/* ── Difficulty tab ── */}
                {activeTab === 'difficulty' && (
                    <div className="space-y-2">
                        {difficultyLevels.map(diff => (
                            <button
                                key={diff}
                                onClick={() => handleDifficultyToggle(diff)}
                                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-sm font-medium ${localDifficultyFilters.includes(diff) ? 'bg-primary/30 hover:bg-primary/40' : 'bg-base-300 hover:bg-base-100'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`h-4 w-4 rounded-full flex-shrink-0 ${difficultyColors[diff]}`} />
                                    <span className="capitalize">{t('game.difficulty.' + diff)}</span>
                                </div>
                                {localDifficultyFilters.includes(diff) && (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Word type tab ── */}
                {activeTab === 'wordType' && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {(!availableWordTypes || availableWordTypes.length === 0) ? (
                            <p className="text-sm text-gray-500 w-full text-center py-4">No word types available.</p>
                        ) : (
                            availableWordTypes.map((type: string) => {
                                const isSelected = localWordTypeFilters.includes(type);
                                const displayLabel = type === '' ? t('game.wordType.unknown') : type;
                                return (
                                    <button
                                        key={type}
                                        onClick={() => handleWordTypeToggle(type)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${isSelected ? 'bg-primary text-primary-content border-primary' : 'bg-base-300 text-gray-400 border-base-300 hover:border-gray-500'}`}
                                    >
                                        {displayLabel}
                                    </button>
                                );
                            })
                        )}
                    </div>
                )}

                {/* ── Groups tab ── */}
                {activeTab === 'groups' && (
                    <div className="space-y-1">
                        {allGroupsSelected && (
                            <p className="text-xs text-gray-500 text-center py-1 mb-2">All groups active. Select individual groups to restrict.</p>
                        )}
                        {sources.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">No groups available.</p>
                        )}
                        {sources.map(src => {
                            const srcActive = isGroupActive(src);
                            const srcPartial = isSourcePartial(src);
                            const srcExpanded = expandedSources.has(src);
                            const sub1s = Object.keys(groupTree[src] ?? {}).sort();
                            const hasSubs = sub1s.length > 0;

                            return (
                                <div key={src} className="rounded-lg overflow-hidden">
                                    <div className={`flex items-center gap-1.5 p-2 rounded-lg transition-colors ${srcActive && !srcPartial ? 'bg-primary/20' : srcPartial ? 'bg-amber-500/10' : 'bg-base-300'}`}>
                                        <button
                                            onClick={() => toggleGroup(src)}
                                            className="flex-1 flex items-center gap-2 text-left"
                                        >
                                            <div className={`h-3 w-3 rounded flex-shrink-0 border ${srcActive && !srcPartial ? 'bg-primary border-primary' : srcPartial ? 'bg-amber-500/60 border-amber-500' : 'border-gray-500'}`} />
                                            <span className={`text-sm font-bold truncate ${srcActive || srcPartial ? '' : 'text-gray-500'}`}>{src}</span>
                                        </button>
                                        {hasSubs && (
                                            <button
                                                onClick={() => {
                                                    setExpandedSources(prev => {
                                                        const n = new Set(prev);
                                                        n.has(src) ? n.delete(src) : n.add(src);
                                                        return n;
                                                    });
                                                }}
                                                className="p-1 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 transition-transform ${srcExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>

                                    {srcExpanded && hasSubs && (
                                        <div className="ml-3 mt-0.5 space-y-0.5">
                                            {sub1s.map(s1 => {
                                                const s1Key = `${src}::${s1}`;
                                                const s1Active = isGroupActive(s1Key) && !isGroupActive(src);
                                                const s1ActiveAlt = localGroupFilters.has(s1Key) || localGroupFilters.has(src);
                                                const s1Partial = isSub1Partial(src, s1);
                                                const s1Expanded = expandedSub1s.has(s1Key);
                                                const sub2s = Array.from((groupTree[src]?.[s1] ?? new Set()) as Set<string>).sort();
                                                const hasSub2s = sub2s.length > 0 && !(sub2s.length === 1 && sub2s[0] === '');

                                                return (
                                                    <div key={s1Key} className="rounded overflow-hidden">
                                                        <div className={`flex items-center gap-1.5 p-1.5 rounded transition-colors ${localGroupFilters.size === 0 || localGroupFilters.has(src) || localGroupFilters.has(s1Key) ? 'bg-primary/15' : s1Partial ? 'bg-amber-500/10' : 'bg-base-300/60'}`}>
                                                            <button
                                                                onClick={() => toggleGroup(s1Key)}
                                                                className="flex-1 flex items-center gap-2 text-left"
                                                            >
                                                                <div className={`h-2.5 w-2.5 rounded-sm flex-shrink-0 border ${localGroupFilters.size === 0 || localGroupFilters.has(src) || localGroupFilters.has(s1Key) ? 'bg-primary border-primary' : s1Partial ? 'bg-amber-500/60 border-amber-500' : 'border-gray-500'}`} />
                                                                <span className={`text-xs font-semibold truncate ${localGroupFilters.size === 0 || localGroupFilters.has(src) || localGroupFilters.has(s1Key) || s1Partial ? '' : 'text-gray-500'}`}>{s1 || '(default)'}</span>
                                                            </button>
                                                            {hasSub2s && (
                                                                <button
                                                                    onClick={() => {
                                                                        setExpandedSub1s(prev => {
                                                                            const n = new Set(prev);
                                                                            n.has(s1Key) ? n.delete(s1Key) : n.add(s1Key);
                                                                            return n;
                                                                        });
                                                                    }}
                                                                    className="p-1 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${s1Expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                        {s1Expanded && hasSub2s && (
                                                            <div className="ml-3 mt-0.5 space-y-0.5">
                                                                {sub2s.filter(s2 => s2 !== '').map(s2 => {
                                                                    const s2Key = `${src}::${s1}::${s2}`;
                                                                    const s2On = localGroupFilters.size === 0 || localGroupFilters.has(src) || localGroupFilters.has(s1Key) || localGroupFilters.has(s2Key);
                                                                    return (
                                                                        <button
                                                                            key={s2Key}
                                                                            onClick={() => toggleGroup(s2Key)}
                                                                            className={`w-full flex items-center gap-2 p-1.5 rounded text-left transition-colors ${s2On ? 'bg-primary/10' : 'bg-base-300/40 hover:bg-base-300/60'}`}
                                                                        >
                                                                            <div className={`h-2 w-2 rounded-sm flex-shrink-0 border ${s2On ? 'bg-primary border-primary' : 'border-gray-500'}`} />
                                                                            <span className={`text-xs truncate ${s2On ? '' : 'text-gray-500'}`}>{s2}</span>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="flex justify-end mt-5 pt-4 border-t border-base-300">
                <button onClick={hideModal} className="px-4 py-2 bg-primary text-primary-content rounded-md hover:bg-primary-focus text-sm font-bold">
                    {t('action.done')}
                </button>
            </div>
        </div>
    );
};

export default FlashcardFilterModal;
