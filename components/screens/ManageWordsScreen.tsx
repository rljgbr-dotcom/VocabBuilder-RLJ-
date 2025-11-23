
import React, { useMemo, useRef } from 'react';
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
    const { words, importFromCSV, exportToCSV, toggleGroupActive } = useWords();
    const { showModal } = useModal();
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                    <div>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
                        <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Load from CSV</button>
                        <button onClick={() => showModal('csvHelp')} className="ml-1 text-xs text-blue-400 hover:underline">(Format?)</button>
                    </div>
                    <button onClick={handleExport} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">Export to CSV</button>
                    <button onClick={() => toggleGroupActive(() => true, true)} className="px-3 py-1.5 text-sm bg-base-300 rounded-md hover:bg-primary hover:text-primary-content">Activate All</button>
                    <button onClick={() => toggleGroupActive(() => true, false)} className="px-3 py-1.5 text-sm bg-base-300 rounded-md hover:bg-primary hover:text-primary-content">Deactivate All</button>
                </div>
            </div>
            <div className="space-y-2">
                {words.length === 0 ? (
                    <p className="text-center text-gray-400 mt-8">No words found. Add some or load a CSV file.</p>
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