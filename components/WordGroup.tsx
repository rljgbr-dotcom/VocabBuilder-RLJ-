
import React, { useState } from 'react';
import { Word } from '../types';
import WordItem from './WordItem';
import { useWords } from '../contexts/WordsContext';
import { useModal } from '../contexts/ModalContext';
import { useTranslation } from '../hooks/useTranslation';

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

const BulkToggleCheckbox: React.FC<{ 
    words: Word[], 
    field: 'active' | 'srs_active', 
    onToggle: (isActive: boolean) => void 
}> = ({ words, field, onToggle }) => {
    const activeCount = words.filter(w => !!w[field]).length;
    const isChecked = activeCount === words.length && words.length > 0;
    const isIndeterminate = activeCount > 0 && activeCount < words.length;

    const checkboxId = `toggle-${field}-${words[0]?.id || Math.random()}`;
    const baseColorClass = field === 'srs_active' ? 'srs-toggle-label' : 'toggle-label';
    const checkboxColorClass = field === 'srs_active' ? 'srs-toggle-checkbox' : 'toggle-checkbox';

    return (
        <div className="relative inline-block w-10 align-middle">
            <input
                type="checkbox"
                checked={isChecked}
                ref={el => { if (el) { el.indeterminate = isIndeterminate; } }}
                onChange={(e) => onToggle(e.target.checked)}
                onClick={e => e.stopPropagation()}
                id={checkboxId}
                className={`${checkboxColorClass} absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer`}
            />
            <label htmlFor={checkboxId} className={`${baseColorClass} block overflow-hidden h-6 rounded-full bg-gray-500 cursor-pointer`}></label>
        </div>
    );
};

const WordGroup: React.FC<WordGroupProps> = ({ level, title, words, groupedWords, path = [] }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { toggleGroupActive, toggleGroupSrsActive, deleteWords } = useWords();
    const { showModal } = useModal();
    const { t } = useTranslation();

    const currentPath = [...path, title];

    const handleToggleActive = (isActive: boolean) => {
        toggleGroupActive(word => {
            if (level === 0) return word.source === title;
            if (level === 1) return word.source === path[0] && word.subtopic1 === title;
            if (level === 2) return word.source === path[0] && word.subtopic1 === path[1] && word.subtopic2 === title;
            return false;
        }, isActive);
    };

    const handleToggleSrsActive = (isActive: boolean) => {
        const doToggle = () => toggleGroupSrsActive(word => {
            if (level === 0) return word.source === title;
            if (level === 1) return word.source === path[0] && word.subtopic1 === title;
            if (level === 2) return word.source === path[0] && word.subtopic1 === path[1] && word.subtopic2 === title;
            return false;
        }, isActive);

        if (!isActive) {
            const removingCount = words.filter(w => !!w.srs_active).length;
            if (removingCount === 0) { doToggle(); return; }
            showModal('confirmation', {
                text: `Remove ${removingCount} word${removingCount !== 1 ? 's' : ''} from the SRS group? Their SRS progress will be preserved but they will no longer appear in SRS sessions.`,
                onConfirm: doToggle,
            });
        } else {
            doToggle();
        }
    };

    const handleDeleteGroup = () => {
         showModal('confirmation', {
            text: t('wordGroup.deleteConfirm', { count: words.length, path: currentPath.join(' > ') }),
            onConfirm: () => {
                const wordIdsToDelete = words.map(w => w.id);
                deleteWords(wordIdsToDelete);
            }
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
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGroup();
                        }}
                        className="p-1.5 hover:bg-base-100/50 rounded-full text-red-500 disabled:opacity-50"
                        title={t('wordGroup.deleteTitle', { title })}
                        disabled={words.length === 0}
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                    <div className="flex gap-4">
                        <BulkToggleCheckbox words={words} field="active" onToggle={handleToggleActive} />
                        <BulkToggleCheckbox words={words} field="srs_active" onToggle={handleToggleSrsActive} />
                    </div>
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
