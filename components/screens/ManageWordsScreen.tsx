
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

    // Statistics
    const stats = useMemo(() => {
        const total = words.length;
        const active = words.filter(w => w.active).length;
        const srs = words.filter(w => w.srs_active).length;
        return { total, active, srs };
    }, [words]);

    const groupedWords = useMemo(() => {
        return words.reduce((acc, word) => {
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
                    <span className="text-gray-400">{t('manageWords.statsSrs', { count: String(stats.srs) })}</span>
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

                    {/* Row 2: Bulk Controls */}
                    <div className="flex flex-wrap gap-6 justify-center items-center">
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

                    {/* Row 3: Difficulty Bulk Controls */}
                    <div className="flex flex-wrap gap-x-8 gap-y-3 justify-center items-center pt-3 border-t border-base-300/50">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('game.difficulty.title') || 'By Difficulty'}:</span>
                        {[
                            { id: 'easy', color: 'bg-green-500', label: t('game.difficulty.easy') },
                            { id: 'medium', color: 'bg-yellow-500', label: t('game.difficulty.medium') },
                            { id: 'hard', color: 'bg-red-600', label: t('game.difficulty.hard') },
                            { id: 'unmarked', color: 'bg-gray-500', label: t('game.difficulty.unmarked') }
                        ].map(diff => (
                            <div key={diff.id} className="flex items-center gap-2 bg-base-300/30 px-2 py-1 rounded-lg border border-base-300/50">
                                <div className={`w-2 h-2 rounded-full ${diff.color}`}></div>
                                <span className="text-[10px] font-bold text-gray-400 w-12">{diff.label}</span>
                                <div className="flex gap-1 ml-1 scale-90">
                                    <button
                                        onClick={() => toggleGroupActive(w => (w.difficulty || 'unmarked') === diff.id, true)}
                                        className="p-1 bg-base-300 hover:bg-primary hover:text-primary-content rounded shadow-sm"
                                        title={`Activate all ${diff.label} words`}
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    </button>
                                    <button
                                        onClick={() => toggleGroupActive(w => (w.difficulty || 'unmarked') === diff.id, false)}
                                        className="p-1 bg-base-300 hover:bg-gray-600 hover:text-white rounded shadow-sm opacity-60 hover:opacity-100"
                                        title={`Deactivate all ${diff.label} words`}
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                    </button>
                                    <div className="w-px h-3 bg-base-300 mx-0.5"></div>
                                    <button
                                        onClick={() => toggleGroupSrsActive(w => (w.difficulty || 'unmarked') === diff.id, true)}
                                        className="p-1 bg-base-300 hover:bg-purple-600 hover:text-white rounded shadow-sm"
                                        title={`Add all ${diff.label} words to SRS`}
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                    </button>
                                    <button
                                        onClick={() => toggleGroupSrsActive(w => (w.difficulty || 'unmarked') === diff.id, false)}
                                        className="p-1 bg-base-300 hover:bg-gray-600 hover:text-white rounded shadow-sm opacity-60 hover:opacity-100"
                                        title={`Remove all ${diff.label} words from SRS`}
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
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
