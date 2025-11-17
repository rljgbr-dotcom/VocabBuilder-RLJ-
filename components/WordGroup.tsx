import React, { useState } from 'react';
import { Word } from '../types';
import WordItem from './WordItem';
import { useWords } from '../contexts/WordsContext';
import { useModal } from '../contexts/ModalContext';

interface GroupedWords {
    [key: string]: any;
}

interface WordGroupProps {
    level: number;
    title: string;
    words: Word[];
    groupedWords: GroupedWords;
    path?: string[];
}

const IndeterminateCheckbox: React.FC<{ words: Word[], onToggle: (isActive: boolean) => void }> = ({ words, onToggle }) => {
    const activeCount = words.filter(w => w.active).length;
    const isChecked = activeCount === words.length && words.length > 0;
    const isIndeterminate = activeCount > 0 && activeCount < words.length;

    // FIX: Use a stable ID for the checkbox and label to ensure they are correctly associated.
    // Using Math.random() creates a new, different ID on every render for both the input and its label.
    const checkboxId = `toggle-${words[0]?.id}`;

    return (
        <div className="relative inline-block w-10 align-middle">
            <input
                type="checkbox"
                checked={isChecked}
                // FIX: The ref callback was returning a boolean value which is invalid. Updated to have a void return type.
                ref={el => { if (el) { el.indeterminate = isIndeterminate; } }}
                onChange={(e) => onToggle(e.target.checked)}
                onClick={e => e.stopPropagation()}
                id={checkboxId}
                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
            />
            <label htmlFor={checkboxId} className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-500 cursor-pointer"></label>
        </div>
    );
};

const WordGroup: React.FC<WordGroupProps> = ({ level, title, words, groupedWords, path = [] }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { toggleGroupActive } = useWords();
    const { showModal } = useModal();

    const currentPath = [...path, title];

    const handleToggleActive = (isActive: boolean) => {
        toggleGroupActive(word => {
            if (level === 0) return word.source === title;
            if (level === 1) return word.source === path[0] && word.subtopic1 === title;
            if (level === 2) return word.source === path[0] && word.subtopic1 === path[1] && word.subtopic2 === title;
            return false;
        }, isActive);
    };

    const handleDeleteGroup = () => {
         showModal('confirmation', {
            text: `Delete all words from: ${currentPath.join(' > ')}?`,
            onConfirm: () => { /* Add delete logic to useWords hook if needed */ console.warn("Delete group not implemented yet") }
        });
    }

    const sortedKeys = Object.keys(groupedWords).sort((a, b) => a.localeCompare(b));

    const headerClasses = [
        "p-3 flex justify-between items-center cursor-pointer bg-base-200 rounded-lg",
        "p-2 flex justify-between items-center cursor-pointer bg-base-300 rounded-t-md",
        "py-1 flex justify-between items-center cursor-pointer"
    ];
    const containerClasses = ["bg-base-200 rounded-lg", "ml-4 mt-2", "ml-4 mt-1 p-2 bg-base-100/30 rounded"];
    const contentClasses = ["p-3 pt-0", "bg-base-300/50 rounded-b-md", "pt-1"];

    return (
        <div className={containerClasses[level]}>
            <div className={headerClasses[level]} onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-2 flex-grow">
                    <h3 className={`font-bold ${level === 0 ? 'text-lg' : level === 1 ? 'font-semibold' : 'font-medium text-sm'}`}>{title} ({words.length})</h3>
                </div>
                <div className="flex items-center gap-2">
                    <IndeterminateCheckbox words={words} onToggle={handleToggleActive} />
                    <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                </div>
            </div>
            {isExpanded && (
                <div className={contentClasses[level]}>
                    {level === 2 ? (
                        words.map(word => <WordItem key={word.id} word={word} />)
                    ) : (
                        sortedKeys.map(key => {
                            const nextGroupedWords = groupedWords[key];
                            const nextLevelWords = Object.values(nextGroupedWords).flatMap((g: any) => 
                                level === 0 ? Object.values(g).flat() : g
                            ) as Word[];

                            return (
                                <WordGroup
                                    key={key}
                                    level={level + 1}
                                    title={key}
                                    words={nextLevelWords}
                                    groupedWords={nextGroupedWords}
                                    path={currentPath}
                                />
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

export default WordGroup;