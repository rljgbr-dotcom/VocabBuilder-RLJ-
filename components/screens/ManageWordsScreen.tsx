
import React, { useMemo, useRef, useState } from 'react';
import { useWords } from '../../contexts/WordsContext';
import { useModal } from '../../contexts/ModalContext';
import { useTranslation } from '../../hooks/useTranslation';
import { Word } from '../../types';
import WordGroup from '../WordGroup';
import { LANGUAGE_ORDER } from '../../constants';

interface GroupedWords {
    [source: string]: {
        [subtopic1: string]: {
            [subtopic2: string]: Word[];
        };
    };
}

const ManageWordsScreen: React.FC = () => {
    const { words, importFromCSV, exportToCSV, toggleGroupActive, toggleGroupSrsActive, syncWithDataFolder, syncActiveToSrs, syncSrsToActive } = useWords();
    const { showModal } = useModal();
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
    
    // Statistics
    const stats = useMemo(() => {
        const total = words.length;
        const active = words.filter(w => w.active).length;
        const srs = words.filter(w => w.srs_active).length;
        const flagged = words.filter(w => w.flagged).length;
        return { total, active, srs, flagged };
    }, [words]);

    const filteredWords = useMemo(() => {
        if (!showFlaggedOnly) return words;
        return words.filter(w => w.flagged);
    }, [words, showFlaggedOnly]);

    const groupedWords = useMemo(() => {
        return filteredWords.reduce((acc, word) => {
            const { source, subtopic1, subtopic2 } = word;
            if (!acc[source]) acc[source] = {};
            if (!acc[source][subtopic1]) acc[source][subtopic1] = {};
            if (!acc[source][subtopic1][subtopic2]) acc[source][subtopic1][subtopic2] = [];
            acc[source][subtopic1][subtopic2].push(word);
            return acc;
        }, {} as GroupedWords);
    }, [words]);

    const sortedSources = useMemo(() => Object.keys(groupedWords).sort((a, b) => a.localeCompare(b)), [groupedWords]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (text) {
                showModal('confirmation', {
                    text: t('manageWords.importConfirm'),
                    onConfirm: () => {
                        const result = importFromCSV(text);
                        showModal('info', { title: result.success ? t('manageWords.importSuccess') : t('manageWords.importFail'), content: result.message });
                    }
                });
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    };

    const handleSyncFolder = async () => {
        showModal('confirmation', {
            text: t('manageWords.syncConfirm'),
            onConfirm: async () => {
                setIsSyncing(true);
                const result = await syncWithDataFolder();
                setIsSyncing(false);
                showModal('info', { title: result.success ? t('manageWords.syncSuccess') : t('manageWords.syncFail'), content: result.message });
            }
        });
    };
    
    const handleExport = () => {
        const result = exportToCSV();
        if (!result.success) {
            showModal('info', { title: t('manageWords.exportFail'), content: result.message });
        }
    };

    const handleDownloadTemplate = () => {
        const header = ['Source', 'Subtopic1', 'Subtopic2', 'Swedish', 'SwedishExample', ...LANGUAGE_ORDER.flatMap(lang => [`${lang}_Word`, `${lang}_Example`])];
        const csvContent = header.join(',');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "vocab_template.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-6">{t('manageWords.title')}</h2>
            
            {/* Stats Bar */}
            <div className="flex justify-center gap-6 mb-4 text-sm font-medium">
                <div className="bg-base-200 px-4 py-1.5 rounded-full border border-base-300">
                    <span className="text-gray-400 mr-2">{t('manageWords.statsTotal', { count: String(stats.total) })}</span>
                    <span className="text-primary mr-2">•</span>
                    <span className="text-gray-400 mr-2">{t('manageWords.statsActive', { count: String(stats.active) })}</span>
                    <span className="text-purple-400 mr-2">•</span>
                    <span className="text-gray-400 mr-2">{t('manageWords.statsSrs', { count: String(stats.srs) })}</span>
                    <span className="text-red-500 mr-2">•</span>
                    <span className="text-gray-400">{t('manageWords.statsFlagged', { count: String(stats.flagged) })}</span>
                </div>
            </div>

            <div className="bg-base-200 p-4 rounded-xl mb-6 sticky top-[72px] z-30 shadow-md border border-base-300">
                <div className="flex flex-col gap-4">
                    {/* Row 1: Data Management */}
                    <div className="flex flex-wrap gap-2 justify-center items-center pb-3 border-b border-base-300/50">
                        <button onClick={() => showModal('addWord')} className="px-3 py-1.5 text-xs font-bold bg-accent text-accent-content rounded-md hover:bg-accent-focus transition-colors shadow-sm">{t('manageWords.addWord')}</button>
                        <div className="h-4 w-px bg-base-300 mx-1"></div>
                        <div className="flex items-center gap-2">
                            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
                            <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm">{t('manageWords.loadCsv')}</button>
                            <button onClick={handleDownloadTemplate} className="px-3 py-1.5 text-xs font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-md hover:bg-blue-600/30 transition-colors" title="Download empty CSV header">{t('manageWords.downloadTemplate')}</button>
                        </div>
                        <div className="h-4 w-px bg-base-300 mx-1"></div>
                        <button 
                            onClick={handleSyncFolder} 
                            disabled={isSyncing}
                            className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            {isSyncing ? t('manageWords.syncing') : t('manageWords.updateDataFolder')}
                        </button>
                        <button onClick={handleExport} className="px-3 py-1.5 text-xs font-bold bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm">{t('manageWords.exportCsv')}</button>
                    </div>

                    {/* Row 2: Filters & Bulk Controls */}
                    <div className="flex flex-wrap gap-6 justify-center items-center">
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setShowFlaggedOnly(!showFlaggedOnly)}
                                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-colors ${showFlaggedOnly ? 'bg-red-600 text-white' : 'bg-base-300 text-gray-400 hover:bg-red-600/20 hover:text-red-500'}`}
                                title={showFlaggedOnly ? "Show All Words" : "Show Only Flagged"}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill={showFlaggedOnly ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                                </svg>
                                <span>{showFlaggedOnly ? "Flagged Only" : "Show Flagged"}</span>
                            </button>
                        </div>

                        <div className="h-4 w-px bg-base-300"></div>

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('word.active')}:</span>
                            <div className="flex gap-1.5">
                                <button onClick={() => toggleGroupActive(() => true, true)} className="px-3 py-1 text-xs bg-base-300 rounded-md hover:bg-primary hover:text-primary-content transition-colors">{t('manageWords.activateAll')}</button>
                                <button onClick={() => toggleGroupActive(() => true, false)} className="px-3 py-1 text-xs bg-base-300 rounded-md hover:bg-primary hover:text-primary-content transition-colors">{t('manageWords.deactivateAll')}</button>
                            </div>
                        </div>

                        <div className="h-4 w-px bg-base-300"></div>

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-purple-400 font-bold">SRS:</span>
                            <div className="flex gap-1.5">
                                <button onClick={() => toggleGroupSrsActive(() => true, true)} className="px-3 py-1 text-xs bg-base-300 rounded-md hover:bg-purple-600 hover:text-white transition-colors">{t('manageWords.srsAddAll')}</button>
                                <button onClick={() => toggleGroupSrsActive(() => true, false)} className="px-3 py-1 text-xs bg-base-300 rounded-md hover:bg-purple-600 hover:text-white transition-colors">{t('manageWords.srsRemoveAll')}</button>
                            </div>
                        </div>

                        <div className="h-4 w-px bg-base-300"></div>

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Sync:</span>
                            <div className="flex gap-1.5">
                                <button onClick={syncActiveToSrs} className="px-3 py-1 text-xs bg-purple-600/10 text-purple-400 border border-purple-500/30 rounded-md hover:bg-purple-600/20 transition-colors" title="Set SRS state to match Active state for all words">{t('manageWords.syncActiveToSrs')}</button>
                                <button onClick={syncSrsToActive} className="px-3 py-1 text-xs bg-primary/10 text-primary border border-primary/30 rounded-md hover:bg-primary/20 transition-colors" title="Set Active state to match SRS state for all words">{t('manageWords.syncSrsToActive')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="space-y-2">
                {/* Column header labels for the toggles */}
                <div className="flex justify-end pr-1 gap-4 text-xs text-gray-500 font-medium mb-1">
                    <span className="w-10 text-center">{t('word.active')}</span>
                    <span className="w-10 text-center text-purple-400">SRS</span>
                    <span className="w-6"></span>
                    <span className="w-6"></span>
                </div>
                {words.length === 0 ? (
                    <p className="text-center text-gray-400 mt-8">{t('manageWords.noWords')}</p>
                ) : (
                    sortedSources.map(source => (
                        <WordGroup
                            key={source}
                            level={0}
                            title={source}
                            words={Object.values(groupedWords[source]).flatMap(s1 => Object.values(s1).flat())}
                            groupedWords={groupedWords[source]}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default ManageWordsScreen;
