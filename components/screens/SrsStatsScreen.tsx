
import React, { useMemo, useState } from 'react';
import { useWords } from '../../contexts/WordsContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useTranslation } from '../../hooks/useTranslation';
import { Screen, Word } from '../../types';

interface SrsStatsScreenProps {
    setScreen: (screen: Screen) => void;
}

const SrsStatsScreen: React.FC<SrsStatsScreenProps> = ({ setScreen }) => {
    const { words } = useWords();
    const { currentSourceLanguage } = useSettings();
    const { t } = useTranslation();
    const [sortKey, setSortKey] = useState<keyof Word | 'next_review_days'>('srs_next_review');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const srsWords = useMemo(() => {
        return words.filter(w => w.srs_active);
    }, [words]);

    const sortedWords = useMemo(() => {
        const sorted = [...srsWords].sort((a, b) => {
            let valA: any = a[sortKey as keyof Word];
            let valB: any = b[sortKey as keyof Word];

            if (sortKey === 'next_review_days') {
                valA = a.srs_next_review ? new Date(a.srs_next_review).getTime() : 0;
                valB = b.srs_next_review ? new Date(b.srs_next_review).getTime() : 0;
            }

            if (valA === undefined) return 1;
            if (valB === undefined) return -1;

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [srsWords, sortKey, sortOrder]);

    const handleSort = (key: typeof sortKey) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('asc');
        }
    };

    const formatDate = (iso: string | undefined) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatRelativeTime = (iso: string | undefined) => {
        if (!iso) return '—';
        const target = new Date(iso).getTime();
        const now = new Date().getTime();
        const diffInMs = target - now;
        const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInMs < 0) return t('game.smartCards.dueToday', { count: '0' }).split(' ')[0]; // Simplified "Due"
        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Tomorrow';
        return `In ${diffInDays}d`;
    };

    const getQualityLabel = (q: number | undefined) => {
        if (q === undefined) return '—';
        const labels: Record<number, string> = {
            0: t('game.smartCards.again'),
            3: t('game.smartCards.hard'),
            4: t('game.smartCards.good'),
            5: t('game.smartCards.easy')
        };
        return labels[q] || '—';
    };

    return (
        <div className="max-w-6xl mx-auto px-4 pb-12">
            <div className="flex items-center justify-between mb-8">
                <button 
                    onClick={() => setScreen('main-menu')}
                    className="text-primary hover:underline flex items-center gap-1 text-sm font-bold"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    {t('menu.back')}
                </button>
                <h2 className="text-3xl font-bold">SRS Statistics</h2>
                <div className="w-20"></div> {/* Spacer for symmetry */}
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-base-200 p-4 rounded-xl border border-base-300">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total in SRS</p>
                    <p className="text-2xl font-bold text-purple-400">{srsWords.length}</p>
                </div>
                <div className="bg-base-200 p-4 rounded-xl border border-base-300">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Due Today</p>
                    <p className="text-2xl font-bold text-primary">
                        {srsWords.filter(w => !w.srs_next_review || new Date(w.srs_next_review) <= new Date()).length}
                    </p>
                </div>
                <div className="bg-base-200 p-4 rounded-xl border border-base-300">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Average Ease</p>
                    <p className="text-2xl font-bold text-green-500">
                        {srsWords.length > 0 
                            ? (srsWords.reduce((acc, w) => acc + (w.srs_efactor || 2.5), 0) / srsWords.length).toFixed(2)
                            : '2.50'}
                    </p>
                </div>
                <div className="bg-base-200 p-4 rounded-xl border border-base-300">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total Reviews</p>
                    <p className="text-2xl font-bold text-blue-500">
                        {srsWords.reduce((acc, w) => acc + (w.srs_repetition || 0), 0)}
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-base-300/50 text-[10px] uppercase tracking-wider font-bold text-gray-400">
                            <tr>
                                <th className="px-4 py-3 cursor-pointer hover:text-primary" onClick={() => handleSort('swedish')}>Word</th>
                                <th className="px-4 py-3">Translation</th>
                                <th className="px-4 py-3 cursor-pointer hover:text-primary" onClick={() => handleSort('srs_repetition')}>Level</th>
                                <th className="px-4 py-3 cursor-pointer hover:text-primary" onClick={() => handleSort('next_review_days')}>Next Review</th>
                                <th className="px-4 py-3 cursor-pointer hover:text-primary" onClick={() => handleSort('srs_added_at')}>Added</th>
                                <th className="px-4 py-3 cursor-pointer hover:text-primary" onClick={() => handleSort('srs_efactor')}>Ease</th>
                                <th className="px-4 py-3 text-right">Last Quality</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-base-300/30">
                            {sortedWords.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 italic">
                                        No words currently in the SRS system.
                                    </td>
                                </tr>
                            ) : (
                                sortedWords.map(word => (
                                    <tr key={word.id} className="hover:bg-base-100/30 transition-colors">
                                        <td className="px-4 py-3 font-bold">{word.swedish}</td>
                                        <td className="px-4 py-3 text-gray-400">
                                            {word.translations[currentSourceLanguage]?.word || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded text-[10px] font-bold">
                                                Lvl {word.srs_repetition || 0}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium">
                                            {formatRelativeTime(word.srs_next_review)}
                                            <span className="block text-[10px] text-gray-500 font-normal">
                                                {formatDate(word.srs_next_review)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">
                                            {formatDate(word.srs_added_at)}
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {word.srs_efactor?.toFixed(2) || '2.50'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs">
                                            {getQualityLabel(word.srs_last_quality)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SrsStatsScreen;
