
import React, { useMemo, useRef, useState } from 'react';
import { useWords } from '../../contexts/WordsContext';
import { useModal } from '../../contexts/ModalContext';
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
    const { words, importFromCSV, exportToCSV, toggleGroupActive, syncWithDataFolder } = useWords();
    const { showModal } = useModal();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

    const filteredWords = useMemo(() => {
        return words.filter(word => {
            const filterPass = filter === 'all' || (filter === 'active' && word.active) || (filter === 'inactive' && !word.active);
            const searchPass = searchTerm === '' ||
                word.swedish.toLowerCase().includes(searchTerm.toLowerCase()) ||
                Object.values(word.translations).some(t => t.word.toLowerCase().includes(searchTerm.toLowerCase()));
            return filterPass && searchPass;
        });
    }, [words, searchTerm, filter]);

    const groupedWords = useMemo(() => {
        return filteredWords.reduce((acc, word) => {
            const { source, subtopic1, subtopic2 } = word;
            if (!acc[source]) acc[source] = {};
            if (!acc[source][subtopic1]) acc[source][subtopic1] = {};
            if (!acc[source][subtopic1][subtopic2]) acc[source][subtopic1][subtopic2] = [];
            acc[source][subtopic1][subtopic2].push(word);
            return acc;
        }, {} as GroupedWords);
    }, [filteredWords]);

    const sortedSources = useMemo(() => Object.keys(groupedWords).sort((a, b) => a.localeCompare(b)), [groupedWords]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (text) {
                showModal('confirmation', {
                    text: 'This will ADD words from the CSV, skipping duplicates. Continue?',
                    onConfirm: () => {
                        const result = importFromCSV(text);
                        showModal('info', { title: result.success ? 'Import Successful' : 'Import Failed', content: result.message });
                    }
                });
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    };

    const handleSyncFolder = async () => {
        showModal('confirmation', {
            text: 'This will scan the application "data" folder and add any new words found in CSV files. Existing words will not be duplicated. Continue?',
            onConfirm: async () => {
                setIsSyncing(true);
                const result = await syncWithDataFolder();
                setIsSyncing(false);
                showModal('info', { title: result.success ? 'Sync Complete' : 'Sync Failed', content: result.message });
            }
        });
    };
    
    const handleExport = () => {
        const result = exportToCSV();
        if (!result.success) {
            showModal('info', { title: 'Export Failed', content: result.message });
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-center mb-6">Manage Words</h2>
            <div className="bg-base-200 p-3 rounded-lg mb-4 sticky top-[72px] z-30">
                <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center items-center">
                    <button onClick={() => showModal('addWord')} className="px-3 py-1.5 text-sm bg-accent text-accent-content rounded-md hover:bg-accent-focus">Add New Word</button>
                    <div className="flex items-center gap-1">
                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
                        <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Load CSV</button>
                        <button onClick={() => showModal('csvHelp')} className="text-xs text-blue-400 hover:underline">(Format?)</button>
                    </div>
                    <button 
                        onClick={handleSyncFolder} 
                        disabled={isSyncing}
                        className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSyncing && <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>}
                        {isSyncing ? 'Syncing...' : 'Update from Data Folder'}
                    </button>
                    <button onClick={handleExport} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">Export CSV</button>
                    <div className="flex gap-2 border-l border-gray-600 pl-2">
                        <button onClick={() => toggleGroupActive(() => true, true)} className="px-3 py-1.5 text-sm bg-base-300 rounded-md hover:bg-primary hover:text-primary-content">Activate All</button>
                        <button onClick={() => toggleGroupActive(() => true, false)} className="px-3 py-1.5 text-sm bg-base-300 rounded-md hover:bg-primary hover:text-primary-content">Deactivate All</button>
                    </div>
                </div>
                <div className="mt-4 flex gap-4 justify-center">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-3 py-1.5 text-sm bg-base-300 rounded-md"
                    />
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as 'all' | 'active' | 'inactive')}
                        className="px-3 py-1.5 text-sm bg-base-300 rounded-md"
                    >
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>
            <div className="space-y-2">
                {filteredWords.length === 0 ? (
                    <p className="text-center text-gray-400 mt-8">No words found. Add some manually, load a CSV file, or sync from the data folder.</p>
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
