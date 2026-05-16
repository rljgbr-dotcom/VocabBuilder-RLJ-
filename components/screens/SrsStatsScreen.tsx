
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
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
    const [viewMode, setViewMode] = useState<'table' | 'charts'>('charts');

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

    const forecastData = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const data = Array.from({ length: 14 }).map((_, i) => {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            return { dateStr: date.toISOString().split('T')[0], label, count: 0 };
        });

        srsWords.forEach(w => {
            if (!w.srs_next_review) return;
            const revDate = new Date(w.srs_next_review);
            revDate.setHours(0, 0, 0, 0);
            
            // If overdue, count it as today
            if (revDate < today) {
                data[0].count += 1;
            } else {
                const diffTime = revDate.getTime() - today.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < 14) {
                    data[diffDays].count += 1;
                }
            }
        });
        return data;
    }, [srsWords]);

    const masteryData = useMemo(() => {
        let learning = 0; // Lvl 0-1
        let reviewing = 0; // Lvl 2-4
        let mastered = 0; // Lvl 5+
        
        srsWords.forEach(w => {
            const lvl = w.srs_repetition || 0;
            if (lvl <= 1) learning++;
            else if (lvl <= 4) reviewing++;
            else mastered++;
        });
        
        return [
            { name: 'Learning (Lvl 0-1)', value: learning, color: '#f87171' }, // red-400
            { name: 'Reviewing (Lvl 2-4)', value: reviewing, color: '#fbbf24' }, // amber-400
            { name: 'Mastered (Lvl 5+)', value: mastered, color: '#34d399' } // emerald-400
        ];
    }, [srsWords]);

    const retentionData = useMemo(() => {
        let again = 0, hard = 0, good = 0, easy = 0;
        srsWords.forEach(w => {
            if (w.srs_last_quality === 0) again++;
            else if (w.srs_last_quality === 3) hard++;
            else if (w.srs_last_quality === 4) good++;
            else if (w.srs_last_quality === 5) easy++;
        });
        return [
            { name: 'Again', count: again, fill: '#ef4444' }, // red-500
            { name: 'Hard', count: hard, fill: '#f97316' }, // orange-500
            { name: 'Good', count: good, fill: '#10b981' }, // emerald-500
            { name: 'Easy', count: easy, fill: '#3b82f6' }, // blue-500
        ];
    }, [srsWords]);

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

            {/* View Toggle */}
            <div className="flex justify-center mb-6">
                <div className="bg-base-300 p-1 rounded-xl inline-flex shadow-inner">
                    <button 
                        onClick={() => setViewMode('charts')} 
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'charts' ? 'bg-primary text-primary-content shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                        Charts Overview
                    </button>
                    <button 
                        onClick={() => setViewMode('table')} 
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'table' ? 'bg-primary text-primary-content shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                        List View
                    </button>
                </div>
            </div>

            {/* Charts View */}
            {viewMode === 'charts' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Review Forecast Chart */}
                    <div className="bg-base-200 p-6 rounded-xl border border-base-300 shadow-sm">
                        <h3 className="text-lg font-bold mb-4 text-center">14-Day Review Forecast</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#374151' }} />
                                    <YAxis allowDecimals={false} tick={{ fill: '#9ca3af', fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem', color: '#f3f4f6' }}
                                        itemStyle={{ color: '#a78bfa' }}
                                    />
                                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Cards Due" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Mastery Distribution */}
                        <div className="bg-base-200 p-6 rounded-xl border border-base-300 shadow-sm">
                            <h3 className="text-lg font-bold mb-2 text-center">Mastery Distribution</h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={masteryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {masteryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem', color: '#f3f4f6' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Retention Quality */}
                        <div className="bg-base-200 p-6 rounded-xl border border-base-300 shadow-sm">
                            <h3 className="text-lg font-bold mb-2 text-center">Recent Performance</h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={retentionData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#374151' }} />
                                        <YAxis allowDecimals={false} tick={{ fill: '#9ca3af', fontSize: 10 }} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem', color: '#f3f4f6' }}
                                            cursor={{fill: '#374151', opacity: 0.4}}
                                        />
                                        <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Cards">
                                            {retentionData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
                <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden animate-fade-in shadow-sm">
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
            )}
        </div>
    );
};

export default SrsStatsScreen;
