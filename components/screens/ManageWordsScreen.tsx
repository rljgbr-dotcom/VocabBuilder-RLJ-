
import React, { useMemo, useRef, useState } from 'react';
import { useWords } from '../../contexts/WordsContext';
import { useModal } from '../../contexts/ModalContext';
import { useTranslation } from '../../hooks/useTranslation';
import { Word } from '../../types';
import WordGroup from '../WordGroup';

interface GroupedWords {
    [source: string]: {
        [subtopic1: string]: {
            [subtopic2: string]: Word[];
        };
    };
}

const ManageWordsScreen: React.FC = () => {
    const { words, importFromCSV, exportToCSV, toggleGroupActive, toggleGroupSrsActive, syncWithDataFolder } = useWords();
    const { showModal } = useModal();
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSyncing, setIsSyncing] = useState(false);

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

    return (
        <div>
            <h2 className="text-3xl font-bold text-center mb-6">{t('manageWords.title')}</h2>
            <div className="bg-base-200 p-3 rounded-lg mb-4 sticky top-[72px] z-30">
                <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center items-center">
                    <button onClick={() => showModal('addWord')} className="px-3 py-1.5 text-sm bg-accent text-accent-content rounded-md hover:bg-accent-focus">{t('manageWords.addWord')}</button>
                    <div className="flex items-center gap-1">
                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
                        <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">{t('manageWords.loadCsv')}</button>
                        <button onClick={() => showModal('csvHelp')} className="text-xs text-blue-400 hover:underline">{t('manageWords.formatHelp')}</button>
                    </div>
                    <button 
                        onClick={handleSyncFolder} 
                        disabled={isSyncing}
                        className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {isSyncing ? t('manageWords.syncing') : t('manageWords.updateDataFolder')}
                    </button>
                    <button onClick={handleExport} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">{t('manageWords.exportCsv')}</button>
                    <div className="flex gap-2 border-l border-gray-600 pl-2">
                        <button onClick={() => toggleGroupActive(() => true, true)} className="px-3 py-1.5 text-sm bg-base-300 rounded-md hover:bg-primary hover:text-primary-content">{t('manageWords.activateAll')}</button>
                        <button onClick={() => toggleGroupActive(() => true, false)} className="px-3 py-1.5 text-sm bg-base-300 rounded-md hover:bg-primary hover:text-primary-content">{t('manageWords.deactivateAll')}</button>
                    </div>
                    <div className="flex gap-2 border-l border-gray-600 pl-2">
                        <span className="text-xs text-purple-400 font-bold mr-1">SRS:</span>
                        <button onClick={() => toggleGroupSrsActive(() => true, true)} className="px-3 py-1.5 text-sm bg-base-300 rounded-md hover:bg-purple-600 hover:text-white">{t('manageWords.srsAddAll')}</button>
                        <button onClick={() => toggleGroupSrsActive(() => true, false)} className="px-3 py-1.5 text-sm bg-base-300 rounded-md hover:bg-purple-600 hover:text-white">{t('manageWords.srsRemoveAll')}</button>
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
