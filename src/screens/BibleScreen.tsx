import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    ChevronLeft, ChevronRight, ChevronDown, Check, ArrowRight,
    BookOpen, Bookmark, X, Type, Settings, Share2, MoreHorizontal, Heart, ZoomIn, Search, Star,
    Sparkles, RefreshCcw, Volume2, Maximize2, Sun, Moon, Coffee, Anchor, Globe
} from 'lucide-react';
import { useTheme } from '../components/ThemeContext';
import { UserProfile } from '../types';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SectionHeader, LoadingSpinner } from '../components/UIComponents';

// --- Metadata ---
const BIBLE_METADATA: Record<string, number> = {
    "Genesis": 50, "Exodus": 40, "Leviticus": 27, "Numbers": 36, "Deuteronomy": 34,
    "Joshua": 24, "Judges": 21, "Ruth": 4, "1 Samuel": 31, "2 Samuel": 24,
    "1 Kings": 22, "2 Kings": 25, "1 Chronicles": 29, "2 Chronicles": 36, "Ezra": 10,
    "Nehemiah": 13, "Esther": 10, "Job": 42, "Psalms": 150, "Proverbs": 31,
    "Ecclesiastes": 12, "Song of Solomon": 8, "Isaiah": 66, "Jeremiah": 52,
    "Lamentations": 5, "Ezekiel": 48, "Daniel": 12, "Hosea": 14, "Joel": 3,
    "Amos": 9, "Obadiah": 1, "Jonah": 4, "Micah": 7, "Nahum": 3,
    "Habakkuk": 3, "Zephaniah": 3, "Haggai": 2, "Zechariah": 14, "Malachi": 4,
    "Matthew": 28, "Mark": 16, "Luke": 24, "John": 21, "Acts": 28,
    "Romans": 16, "1 Corinthians": 16, "2 Corinthians": 13, "Galatians": 6,
    "Ephesians": 6, "Philippians": 4, "Colossians": 4, "1 Thessalonians": 5,
    "2 Thessalonians": 3, "1 Timothy": 6, "2 Timothy": 4, "Titus": 3,
    "Philemon": 1, "Hebrews": 13, "James": 5, "1 Peter": 5, "2 Peter": 3,
    "1 John": 5, "2 John": 1, "3 John": 1, "Jude": 1, "Revelation": 22
};

const BIBLE_ORDER = Object.keys(BIBLE_METADATA);

const BIBLE_VERSIONS = [
    { id: 'NKJV', name: 'NKJV', description: 'New King James Version' },
    { id: 'NLT', name: 'NLT', description: 'New Living Translation' },
    { id: 'ESV', name: 'ESV', description: 'English Standard Version' },
    { id: 'NIV', name: 'NIV', description: 'New International Version' },
    { id: 'KJV', name: 'KJV', description: 'King James Version' },
    { id: 'AMP', name: 'AMP', description: 'Amplified Bible' },
    { id: 'MSG', name: 'MSG', description: 'The Message Translation' },
    { id: 'NASB', name: 'NASB', description: 'New American Standard' },
    { id: 'CSB', name: 'CSB', description: 'Christian Standard Bible' },
    { id: 'RSV', name: 'RSV', description: 'Revised Standard Version' },
];

const BIBLE_BOOKS = Object.keys(BIBLE_METADATA);

const HIGHLIGHT_COLORS = {
    yellow: { bg: 'bg-[#ffeb3b]/30', darkBg: 'dark:bg-[#ffeb3b]/20', border: 'border-[#ffeb3b]' },
    green: { bg: 'bg-[#a5d6a7]/30', darkBg: 'dark:bg-[#a5d6a7]/20', border: 'border-[#a5d6a7]' },
    blue: { bg: 'bg-[#90caf9]/30', darkBg: 'dark:bg-[#90caf9]/20', border: 'border-[#90caf9]' },
    pink: { bg: 'bg-[#f48fb1]/30', darkBg: 'dark:bg-[#f48fb1]/20', border: 'border-[#f48fb1]' },
};
type HighlightColor = keyof typeof HIGHLIGHT_COLORS;

const BibleScreen: React.FC<{ user: UserProfile }> = ({ user }) => {
    const { theme: globalTheme } = useTheme();
    const [fontSize, setFontSize] = useState(18);
    const [localTheme, setLocalTheme] = useState<'light' | 'dark' | 'sepia' | 'midnight'>('light');
    const [fontFamily, setFontFamily] = useState<'serif' | 'sans' | 'mono'>('serif');
    const [version, setVersion] = useState('NKJV');

    const [book, setBook] = useState('Genesis');
    const [chapter, setChapter] = useState(1);
    const [verseData, setVerseData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerStep, setPickerStep] = useState<'books' | 'chapters' | 'version'>('books');
    const [pickerSearch, setPickerSearch] = useState('');
    const [isImmersive, setIsImmersive] = useState(false);
    const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
    const [savedHighlights, setSavedHighlights] = useState<Record<number, HighlightColor>>({});
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [isGenInsight, setIsGenInsight] = useState(false);

    // Initial theme sync
    useEffect(() => {
        setLocalTheme(globalTheme === 'dark' ? 'midnight' : 'light');
    }, [globalTheme]);

    // Fetch Content Using Bolls Life for broad version support
    useEffect(() => {
        const fetchChapter = async () => {
            setIsLoading(true);
            try {
                const bookIndex = BIBLE_ORDER.indexOf(book) + 1;
                // Bolls Life API
                const res = await fetch(`https://bolls.life/get-chapter/${version}/${bookIndex}/${chapter}/`);
                const data = await res.json();

                if (Array.isArray(data) && data.length > 0) {
                    setVerseData(data.map(v => ({
                        verse: v.verse,
                        text: v.text.replace(/<[^>]*>/g, '').trim()
                    })));
                } else {
                    // Fallback to bible-api.com (KJV only)
                    const fallbackRes = await fetch(`https://bible-api.com/${encodeURIComponent(book)}%20${chapter}?translation=kjv`);
                    const fallbackData = await fallbackRes.json();
                    setVerseData(fallbackData.verses || []);
                }
            } catch (e) {
                console.error("Bible fetch error:", e);
                setVerseData([]);
            } finally {
                setIsLoading(false);
                if (!isImmersive) window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };
        fetchChapter();
    }, [book, chapter, version]);

    const handleGenerateInsight = async () => {
        if (isGenInsight || !verseData.length) return;
        setIsGenInsight(true);
        try {
            const chapterText = verseData.map(v => `${v.verse}. ${v.text}`).join(' ');

            const response = await fetch('/api/generateInsight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    book,
                    chapter,
                    content: chapterText
                })
            });

            const data = await response.json();
            if (data.success) {
                setAiInsight(data.insight);
            } else {
                throw new Error(data.message || 'Failed to generate insight');
            }
        } catch (e) {
            console.error("Insight generation error:", e);
            setAiInsight("The Word of God is rich with wisdom.");
        } finally {
            setIsGenInsight(false);
        }
    };

    const filteredBooks = useMemo(() =>
        BIBLE_BOOKS.filter(b => b.toLowerCase().includes(pickerSearch.toLowerCase())),
        [pickerSearch]);

    const activeTheme = localTheme === 'midnight' ? 'bg-[#0a0a0b] text-gray-300' :
        localTheme === 'dark' ? 'bg-gray-900 text-white' :
            localTheme === 'sepia' ? 'bg-[#f4ecd8] text-[#5b4636]' : 'bg-white text-gray-900';

    const bgClass = localTheme === 'midnight' ? 'bg-[#0a0a0b]' :
        localTheme === 'sepia' ? 'bg-[#efe0ba]' : 'bg-gray-50';

    return (
        <div className={`transition-all duration-700 min-h-screen relative pb-40 ${bgClass} dark:bg-black`}>

            {/* Minimal Sticky Nav */}
            <nav className={`sticky top-0 z-40 transition-all duration-500 ${isImmersive ? '-translate-y-full' : 'translate-y-0'}`}>
                <div className="glass-header px-4 sm:px-10 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-4 border-b border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => { setPickerStep('books'); setPickerOpen(true); }}
                            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-2.5 bg-black/5 dark:bg-white/5 hover:bg-church-green/10 rounded-xl sm:rounded-[1.25rem] transition-all active:scale-95 border border-transparent hover:border-church-green/30 shrink-0"
                        >
                            <BookOpen size={16} className="text-church-green" />
                            <span className="font-black text-[9px] sm:text-[11px] uppercase tracking-[0.15em] sm:tracking-[0.2em]">{book} {chapter}</span>
                            <ChevronDown size={12} className="opacity-40" />
                        </button>
                        <button
                            onClick={() => { setPickerStep('version'); setPickerOpen(true); }}
                            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-2.5 bg-black/5 dark:bg-white/5 hover:bg-church-gold/10 rounded-xl sm:rounded-[1.25rem] transition-all active:scale-95 border border-transparent hover:border-church-gold/30 shrink-0"
                        >
                            <Globe size={16} className="text-church-gold" />
                            <span className="font-black text-[9px] sm:text-[11px] uppercase tracking-[0.15em] sm:tracking-[0.2em]">{version}</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={handleGenerateInsight} disabled={isGenInsight} className={`p-3 rounded-2xl transition-all ${aiInsight ? 'bg-church-gold text-white shadow-premium-gold' : 'bg-black/5 dark:bg-white/5 text-church-gold hover:bg-church-gold/10'}`}>
                            {isGenInsight ? <RefreshCcw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        </button>
                        <button onClick={() => setIsImmersive(!isImmersive)} className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hidden md:flex">
                            <Maximize2 size={18} />
                        </button>
                    </div>
                </div>
            </nav>

            <main className={`max-w-2xl mx-auto px-6 py-12 transition-all duration-1000 ${isLoading ? 'opacity-30 blur-2xl scale-95' : 'opacity-100 scale-100'}`}>

                <header className="mb-14 text-center animate-fade-in">
                    <div className="flex justify-center items-center gap-2 mb-6">
                        <div className="h-px w-8 bg-church-green/30"></div>
                        <span className="text-[10px] font-black text-church-green uppercase tracking-[0.4em]">Hallowed Scripture</span>
                        <div className="h-px w-8 bg-church-green/30"></div>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase dark:text-white leading-none mb-4">{book}</h1>
                    <p className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.5em]">Chapter {chapter}</p>
                </header>

                {aiInsight && (
                    <div className="mb-10 p-8 glass-card rounded-[2.5rem] border-church-gold/20 shadow-premium-gold animate-fade-in-up relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Sparkles size={64} className="text-church-gold" />
                        </div>
                        <div className="relative z-10 flex gap-6">
                            <div className="w-12 h-12 rounded-2xl bg-church-gold text-white flex items-center justify-center shrink-0 shadow-lg">
                                <Sparkles size={24} />
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-church-gold">Divine Insight</p>
                                <p className="text-lg italic font-serif leading-relaxed dark:text-gray-200">"{aiInsight}"</p>
                            </div>
                        </div>
                    </div>
                )}

                <article
                    className={`leading-[1.9] rounded-[2rem] sm:rounded-[3rem] shadow-premium p-6 sm:p-10 md:p-14 transition-all duration-500 font-${fontFamily} ${activeTheme} border border-black/5 dark:border-white/5`}
                    style={{ fontSize: `${fontSize}px` }}
                >
                    {verseData.length > 0 ? (
                        <div className="space-y-4">
                            {verseData.map((v: any) => (
                                <span key={v.verse} className="inline decoration-clone px-1.5 rounded-lg transition-all cursor-pointer hover:bg-church-green/5 relative">
                                    <sup className="text-[11px] opacity-30 font-black mr-2 select-none align-super">{v.verse}</sup>
                                    <span className="tracking-tight">{v.text}</span>
                                    {' '}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <div className="py-24 flex flex-col items-center gap-6">
                            <LoadingSpinner size={48} />
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">Summoning Sacred Text...</p>
                        </div>
                    )}
                </article>

                {/* Footer Controls */}
                <footer className="mt-16 flex items-center justify-between px-2">
                    {chapter > 1 ? (
                        <button onClick={() => setChapter(prev => prev - 1)} className="group flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-church-green transition-all">
                            <div className="w-8 h-8 sm:w-10 h-10 rounded-full border border-gray-100 dark:border-white/5 flex items-center justify-center group-hover:bg-church-green group-hover:text-white group-hover:border-church-green transition-all"><ChevronLeft size={16} /></div>
                            <span className="hidden xs:inline">Previous</span>
                        </button>
                    ) : <div></div>}

                    <div className="flex gap-2">
                        <button onClick={() => setFontSize(prev => Math.max(14, prev - 2))} className="w-10 h-10 rounded-full border border-black/5 dark:border-white/5 flex items-center justify-center hover:bg-white dark:hover:bg-white/5 transition-all text-gray-400 font-bold">A-</button>
                        <button onClick={() => setFontSize(prev => Math.min(32, prev + 2))} className="w-10 h-10 rounded-full border border-black/5 dark:border-white/5 flex items-center justify-center hover:bg-white dark:hover:bg-white/5 transition-all text-gray-900 dark:text-white font-bold">A+</button>
                    </div>

                    {chapter < BIBLE_METADATA[book] ? (
                        <button onClick={() => setChapter(prev => prev + 1)} className="group flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-church-green transition-all text-right">
                            <span className="hidden xs:inline">Next</span>
                            <div className="w-8 h-8 sm:w-10 h-10 rounded-full border border-gray-100 dark:border-white/5 flex items-center justify-center group-hover:bg-church-green group-hover:text-white group-hover:border-church-green transition-all"><ChevronRight size={16} /></div>
                        </button>
                    ) : <div></div>}
                </footer>
            </main>

            {/* Selection Overlays */}
            {pickerOpen && (
                <div className="fixed inset-0 z-[500] bg-white/90 dark:bg-black/95 backdrop-blur-3xl animate-in fade-in flex flex-col overflow-hidden">
                    <div className="max-w-6xl mx-auto w-full h-full flex flex-col p-4 sm:p-8 md:p-16">
                        <header className="flex items-center justify-between mb-6 md:mb-12">
                            <div>
                                <h2 className="text-2xl md:text-5xl font-black uppercase tracking-tighter dark:text-white leading-none mb-2">
                                    {pickerStep === 'books' ? 'Select Book' : pickerStep === 'chapters' ? `Chapters: ${book}` : 'Translation'}
                                </h2>
                                <p className="text-[10px] md:text-xs font-black text-church-gold uppercase tracking-[0.4em]">{pickerStep === 'books' ? 'Explore the canon' : 'Choose your passage'}</p>
                            </div>
                            <button onClick={() => setPickerOpen(false)} className="w-12 h-12 md:w-16 h-16 rounded-2xl md:rounded-[2rem] bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all scale-90 md:scale-100"><X size={24} /></button>
                        </header>

                        {pickerStep === 'books' && (
                            <div className="flex-1 flex flex-col min-h-0">
                                {/* Search Area */}
                                <div className="relative mb-8">
                                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-church-green" size={20} />
                                    <input
                                        autoFocus
                                        placeholder="Search for a book..."
                                        value={pickerSearch}
                                        onChange={(e) => setPickerSearch(e.target.value)}
                                        className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 focus:border-church-green/50 rounded-2xl py-4 pl-14 pr-6 text-lg font-bold outline-none transition-all dark:text-white"
                                    />
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 pb-20 content-start">
                                    {filteredBooks.map(b => (
                                        <button
                                            key={b}
                                            onClick={() => { setBook(b); setPickerStep('chapters'); setPickerSearch(''); }}
                                            className={`group relative h-20 rounded-xl text-center transition-all border ${book === b ? 'bg-church-green text-white border-church-green shadow-lg' : 'bg-white/5 border-black/5 dark:border-white/10 hover:border-church-green/50 hover:bg-white/10'}`}
                                        >
                                            <p className={`font-black uppercase tracking-tighter truncate px-2 relative z-10 ${b.length > 10 ? 'text-[10px]' : 'text-xs'}`} title={b}>
                                                {b}
                                            </p>
                                            <div className="absolute inset-0 flex items-center justify-center text-4xl font-black opacity-[0.02] pointer-events-none transition-all group-hover:opacity-[0.05]">{b[0]}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {pickerStep === 'chapters' && (
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3 pb-40 content-start">
                                {Array.from({ length: BIBLE_METADATA[book] || 1 }, (_, i) => i + 1).map(c => (
                                    <button
                                        key={c}
                                        onClick={() => { setChapter(c); setPickerOpen(false); }}
                                        className={`aspect-square rounded-2xl flex items-center justify-center text-xl font-black transition-all border ${chapter === c ? 'bg-church-gold text-white border-church-gold shadow-premium-gold rotate-6 scale-110' : 'bg-white/5 border-black/5 dark:border-white/10 text-gray-900 dark:text-white hover:bg-church-green hover:text-white hover:scale-110'}`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        )}

                        {pickerStep === 'version' && (
                            <div className="flex-1 flex flex-col min-h-0">
                                {/* Search Area */}
                                <div className="relative mb-8">
                                    <Globe className="absolute left-6 top-1/2 -translate-y-1/2 text-church-gold" size={20} />
                                    <input
                                        autoFocus
                                        placeholder="Search translation..."
                                        value={pickerSearch}
                                        onChange={(e) => setPickerSearch(e.target.value)}
                                        className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 focus:border-church-gold/50 rounded-2xl py-4 pl-14 pr-6 text-lg font-bold outline-none transition-all dark:text-white"
                                    />
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 pb-20 content-start">
                                    {BIBLE_VERSIONS.filter(v =>
                                        v.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                                        v.description.toLowerCase().includes(pickerSearch.toLowerCase())
                                    ).map(v => (
                                        <button
                                            key={v.id}
                                            onClick={() => { setVersion(v.id); setPickerOpen(false); setPickerSearch(''); }}
                                            className={`group relative h-20 rounded-xl text-center transition-all border ${version === v.id ? 'bg-church-gold text-white border-church-gold shadow-lg' : 'bg-white/5 border-black/5 dark:border-white/10 hover:border-church-gold/30 hover:bg-white/10'}`}
                                        >
                                            <p className="font-black text-xs uppercase tracking-tighter truncate px-2 relative z-10" title={v.description}>
                                                {v.id}
                                            </p>
                                            <div className="absolute inset-0 flex items-center justify-center text-4xl font-black opacity-[0.02] pointer-events-none transition-all group-hover:opacity-[0.05]">{v.id[0]}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BibleScreen;
