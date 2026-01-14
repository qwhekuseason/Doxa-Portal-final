import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    ChevronLeft, ChevronRight, ChevronDown, Check, ArrowRight,
    BookOpen, Bookmark, X, Type, Settings, Share2, MoreHorizontal, Heart, ZoomIn, Search, Star,
    Sparkles, RefreshCcw, Volume2, Maximize2, Sun, Moon, Coffee, Anchor
} from 'lucide-react';
import { useTheme } from '../components/ThemeContext';
import { UserProfile } from '../types';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SectionHeader, LoadingSpinner } from '../components/UIComponents';
import { HfInference } from '@huggingface/inference';

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
const BIBLE_BOOKS = Object.keys(BIBLE_METADATA);

// --- Colors for Highlights ---
const HIGHLIGHT_COLORS = {
    yellow: { bg: 'bg-[#ffeb3b]/30', darkBg: 'dark:bg-[#ffeb3b]/20', border: 'border-[#ffeb3b]' },
    green: { bg: 'bg-[#a5d6a7]/30', darkBg: 'dark:bg-[#a5d6a7]/20', border: 'border-[#a5d6a7]' },
    blue: { bg: 'bg-[#90caf9]/30', darkBg: 'dark:bg-[#90caf9]/20', border: 'border-[#90caf9]' },
    pink: { bg: 'bg-[#f48fb1]/30', darkBg: 'dark:bg-[#f48fb1]/20', border: 'border-[#f48fb1]' },
};
type HighlightColor = keyof typeof HIGHLIGHT_COLORS;

interface BibleScreenProps {
    user?: UserProfile;
}

type BibleTheme = 'light' | 'dark' | 'sepia' | 'midnight';

const BibleScreen: React.FC<BibleScreenProps> = ({ user }) => {
    const { theme: globalTheme } = useTheme();
    const [fontSize, setFontSize] = useState(20);
    const [localTheme, setLocalTheme] = useState<BibleTheme>('light');
    const [fontFamily, setFontFamily] = useState<'serif' | 'sans' | 'mono'>('serif');

    // Navigation
    const [book, setBook] = useState('Genesis');
    const [chapter, setChapter] = useState(1);

    // Content
    const [text, setText] = useState<string>("");
    const [verseData, setVerseData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // UI State
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerStep, setPickerStep] = useState<'books' | 'chapters'>('books');
    const [pickerSearch, setPickerSearch] = useState('');
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [isImmersive, setIsImmersive] = useState(false);

    // Selection State
    const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
    const [savedHighlights, setSavedHighlights] = useState<Record<number, HighlightColor>>({});
    const [bookmarked, setBookmarked] = useState(false);

    // AI Insight State
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [isGenInsight, setIsGenInsight] = useState(false);

    // --- Sync with global theme initially ---
    useEffect(() => {
        if (globalTheme === 'dark') setLocalTheme('midnight');
        else setLocalTheme('light');
    }, [globalTheme]);

    // --- Loading Persistence ---
    useEffect(() => {
        if (!user || !user.bibleData) {
            setSavedHighlights({});
            setBookmarked(false);
            return;
        }

        const docId = `${book}_${chapter}`;
        const data = user.bibleData[docId];

        if (data) {
            setSavedHighlights((data.highlights as any) || {});
            setBookmarked(data.bookmarked || false);
        } else {
            setSavedHighlights({});
            setBookmarked(false);
        }
        setAiInsight(null); // Reset AI insight on navigation
    }, [book, chapter, user]);

    // --- Persistence Actions ---
    const saveHighlight = async (color: HighlightColor) => {
        if (!user || selectedVerses.length === 0) return;

        const newHighlights = { ...savedHighlights };
        selectedVerses.forEach(v => { newHighlights[v] = color; });

        setSavedHighlights(newHighlights);
        setSelectedVerses([]);

        try {
            const docId = `${book}_${chapter}`;
            const currentData = user.bibleData?.[docId] || {};

            await updateDoc(doc(db, 'users', user.uid), {
                [`bibleData.${docId}`]: {
                    ...currentData,
                    highlights: newHighlights,
                    lastRead: new Date().toISOString()
                },
                'stats.versesHighlighted': (user.stats?.versesHighlighted || 0) + selectedVerses.length
            });
        } catch (e) {
            console.error("Error saving highlights:", e);
        }
    };

    const toggleBookmark = async () => {
        if (!user) return;
        const newState = !bookmarked;
        setBookmarked(newState);

        try {
            const docId = `${book}_${chapter}`;
            const currentData = user.bibleData?.[docId] || {};
            const increment = newState ? 1 : -1;

            await updateDoc(doc(db, 'users', user.uid), {
                [`bibleData.${docId}`]: {
                    ...currentData,
                    highlights: savedHighlights,
                    bookmarked: newState,
                    lastRead: new Date().toISOString()
                },
                'stats.bookmarks': (user.stats?.bookmarks || 0) + increment
            });
        } catch (e) { console.error("Error saving bookmark:", e); }
    };

    // --- Fetching Content ---
    useEffect(() => {
        const fetchChapter = async () => {
            setIsLoading(true);
            try {
                const safeBook = encodeURIComponent(book);
                const res = await fetch(`https://bible-api.com/${safeBook}%20${chapter}?translation=kjv`);
                const data = await res.json();
                if (data.error) {
                    setText("Chapter not found.");
                    setVerseData([]);
                } else {
                    setText(data.text);
                    setVerseData(data.verses || []);
                }
            } catch (e) {
                setText("Could not load chapter.");
            } finally {
                setIsLoading(false);
                if (!isImmersive) window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };
        fetchChapter();
    }, [book, chapter]);

    // --- AI Insight Logic ---
    const handleGenerateInsight = async () => {
        if (isGenInsight || !verseData.length) return;
        setIsGenInsight(true);
        try {
            // @ts-ignore
            const apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
            const hf = new HfInference(apiKey);

            const chapterText = verseData.map(v => `${v.verse}. ${v.text}`).join(' ');

            const response = await hf.chatCompletion({
                model: 'google/gemma-2-9b-it',
                messages: [
                    {
                        role: 'user',
                        content: `You are a theologian. Provide a brief, inspiring 3-sentence devotional insight for ${book} chapter ${chapter}.
                        Content: ${chapterText.substring(0, 1500)}...`
                    }
                ],
                max_tokens: 200,
                temperature: 0.7
            });

            setAiInsight(response.choices[0].message.content || "Divine wisdom is unfolding.");
        } catch (e) {
            console.error("AI Insight error:", e);
            setAiInsight("Deep reflection reveals the Lord's truth.");
        } finally {
            setIsGenInsight(false);
        }
    };

    // --- Picker Logic ---
    const filteredBooks = useMemo(() =>
        BIBLE_BOOKS.filter(b => b.toLowerCase().includes(pickerSearch.toLowerCase())),
        [pickerSearch]);

    const openPicker = () => {
        setPickerStep('books');
        setPickerOpen(true);
        setPickerSearch('');
    };

    const handleSelectBook = (b: string) => {
        setBook(b);
        setPickerStep('chapters');
        setPickerSearch('');
    };

    const handleSelectChapter = (c: number) => {
        setChapter(c);
        setPickerOpen(false);
        setSelectedVerses([]);
    };

    // --- Verse Interaction ---
    const toggleVerse = (v: number) => {
        if (selectedVerses.includes(v)) {
            setSelectedVerses(selectedVerses.filter(num => num !== v));
        } else {
            setSelectedVerses([...selectedVerses, v]);
        }
    };

    // --- Styling Helpers ---
    const themeClasses = {
        light: 'bg-[#faf9f6] text-gray-900',
        dark: 'bg-white/5 text-gray-200',
        sepia: 'bg-[#f4ecd8] text-[#5b4636]',
        midnight: 'bg-[#0a0a0b] text-gray-300'
    };

    return (
        <div className={`transition-all duration-700 min-h-screen relative pb-40 ${localTheme === 'midnight' ? 'bg-[#0f0f10]' : localTheme === 'sepia' ? 'bg-[#efe0ba]' : 'bg-gray-50'}`}>

            {/* Dynamic Background */}
            <div className={`fixed inset-0 opacity-40 pointer-events-none transition-all duration-1000 ${localTheme === 'midnight' ? 'bg-[radial-gradient(circle_at_50%_0%,_rgba(16,185,129,0.1),_transparent)]' : ''}`}></div>

            {/* Header */}
            <div className={`sticky top-0 z-40 transition-all duration-500 overflow-hidden ${isImmersive ? '-translate-y-full' : 'translate-y-0'}`}>
                <div className="glass-header px-6 py-4 flex items-center justify-between border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={openPicker}
                            className="flex items-center gap-2.5 px-4 py-2 bg-white/5 hover:bg-church-green/20 rounded-2xl border border-white/10 transition-all active:scale-95 group"
                        >
                            <BookOpen size={18} className="text-church-green" />
                            <span className="font-sans font-black text-xs uppercase tracking-widest">{book} {chapter}</span>
                            <ChevronDown size={14} className="opacity-40 group-hover:translate-y-0.5 transition-transform" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleGenerateInsight}
                            disabled={isGenInsight}
                            className={`p-2.5 rounded-xl transition-all ${aiInsight ? 'bg-church-gold text-white shadow-premium-gold' : 'bg-white/5 hover:bg-church-gold/20 text-church-gold'}`}
                        >
                            {isGenInsight ? <RefreshCcw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        </button>

                        <button
                            onClick={() => setIsImmersive(!isImmersive)}
                            className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-all hidden md:flex"
                        >
                            <Maximize2 size={18} />
                        </button>
                    </div>
                </div>

                {/* Settings Overlay */}
                {settingsOpen && (
                    <div className="absolute top-full right-6 mt-3 w-72 p-6 glass-card rounded-[2rem] shadow-premium z-50 animate-in fade-in slide-in-from-top-4 border-white/20">
                        <p className="text-[10px] font-black text-church-gold uppercase tracking-[0.2em] mb-4">Reading Interface</p>

                        <div className="space-y-6">
                            {/* Text Size */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase tracking-tight opacity-60">Font Size</span>
                                    <span className="text-sm font-black text-church-green">{fontSize}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="16"
                                    max="36"
                                    value={fontSize}
                                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-church-green cursor-pointer"
                                />
                            </div>

                            {/* Themes */}
                            <div className="space-y-3">
                                <span className="text-[10px] font-bold uppercase tracking-tight opacity-60">Color Essence</span>
                                <div className="grid grid-cols-4 gap-2">
                                    {(['light', 'sepia', 'dark', 'midnight'] as BibleTheme[]).map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setLocalTheme(t)}
                                            className={`aspect-square rounded-xl border-2 transition-all flex items-center justify-center ${localTheme === t ? 'border-church-green scale-110 shadow-lg' : 'border-transparent hover:border-white/20'}`}
                                        >
                                            <div className={`w-full h-full rounded-lg ${t === 'light' ? 'bg-white' :
                                                t === 'sepia' ? 'bg-[#f4ecd8]' :
                                                    t === 'dark' ? 'bg-gray-800' : 'bg-black'
                                                } flex items-center justify-center`}>
                                                {t === 'light' && <Sun size={12} className="text-gray-400" />}
                                                {t === 'sepia' && <Coffee size={12} className="text-[#5b4636]" />}
                                                {t === 'dark' && <Moon size={12} className="text-gray-400" />}
                                                {t === 'midnight' && <Anchor size={12} className="text-church-gold" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Font Family */}
                            <div className="flex gap-2">
                                {(['serif', 'sans', 'mono'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFontFamily(f)}
                                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${fontFamily === f ? 'bg-white text-black border-white' : 'border-white/10 text-gray-500 hover:text-white'}`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Immersive Overlay Back Button */}
            {isImmersive && (
                <button
                    onClick={() => setIsImmersive(false)}
                    className="fixed top-6 right-6 z-50 w-12 h-12 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all border border-white/20 shadow-2xl"
                >
                    <Maximize2 size={20} className="rotate-45" />
                </button>
            )}

            {/* Reading Content */}
            <main className={`max-w-3xl mx-auto px-6 pt-12 transition-all duration-1000 ${isLoading ? 'opacity-20 blur-xl scale-95' : 'opacity-100 blur-0 scale-100'}`}>

                {/* Book Header Hero */}
                <header className="text-center mb-16 relative py-12 px-8 rounded-[3rem] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-church-green/10 to-transparent"></div>
                    <div className="relative z-10 space-y-4">
                        <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-church-gold/10 rounded-full border border-church-gold/20 mb-4">
                            <Star size={12} className="text-church-gold fill-church-gold" />
                            <span className="text-[10px] font-black text-church-gold uppercase tracking-[0.3em]">Hallowed Scripture</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase dark:text-white leading-none">{book}</h1>
                        <div className="flex items-center justify-center gap-4">
                            <span className="h-px w-12 bg-white/10"></span>
                            <span className="text-sm font-black text-gray-400 uppercase tracking-[0.4em]">Section {chapter}</span>
                            <span className="h-px w-12 bg-white/10"></span>
                        </div>
                    </div>
                </header>

                {/* AI Insight Card */}
                {aiInsight && (
                    <div className="mb-12 glass-card p-8 rounded-[2.5rem] border-church-gold/30 shadow-premium-gold animate-fade-in-up relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Sparkles size={64} className="text-church-gold" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-church-gold text-white flex items-center justify-center shadow-lg">
                                    <Sparkles size={16} />
                                </div>
                                <span className="text-[10px] font-black text-church-gold uppercase tracking-widest">Theological Insight</span>
                                <button onClick={() => setAiInsight(null)} className="ml-auto text-gray-500 hover:text-red-500"><X size={14} /></button>
                            </div>
                            <p className={`text-lg italic font-medium leading-relaxed ${localTheme === 'midnight' ? 'text-gray-300' : 'text-gray-700'}`}>
                                "{aiInsight}"
                            </p>
                        </div>
                    </div>
                )}

                {/* Verse Text Area */}
                <article
                    className={`leading-[1.85] transition-all duration-500 font-${fontFamily} ${themeClasses[localTheme]} p-8 md:p-12 rounded-[3.5rem] shadow-2xl space-y-6 lg:relative lg:z-10`}
                    style={{ fontSize: `${fontSize}px` }}
                >
                    {verseData.length > 0 ? (
                        <div className="space-y-1">
                            {verseData.map((v: any) => {
                                const isSelected = selectedVerses.includes(v.verse);
                                const savedColor = savedHighlights[v.verse];
                                const highlightClass = savedColor ? HIGHLIGHT_COLORS[savedColor] : null;

                                return (
                                    <span
                                        key={v.verse}
                                        onClick={() => toggleVerse(v.verse)}
                                        className={`
                                            inline decoration-clone px-1.5 py-0.5 rounded-lg cursor-pointer transition-all duration-300 relative
                                            ${isSelected ? 'bg-church-green/20 ring-1 ring-church-green/50 text-church-green' : ''}
                                            ${!isSelected && highlightClass ? `${highlightClass.bg} ${highlightClass.darkBg}` : ''}
                                            ${localTheme === 'midnight' && !isSelected && !highlightClass ? 'hover:bg-white/5' : 'hover:bg-black/5'}
                                        `}
                                    >
                                        <sup className="text-[12px] opacity-40 font-black mr-2 select-none align-super tracking-tighter">
                                            {v.verse}
                                        </sup>
                                        <span>{v.text}</span>
                                        {' '}
                                    </span>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-40">
                            <LoadingSpinner size={64} />
                        </div>
                    )}
                </article>
            </main>

            {/* Verse Interaction Modal Tray */}
            <div className={`fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] glass-card px-4 py-3 rounded-[2rem] shadow-premium flex items-center gap-6 transition-all duration-500 border-white/20 bg-black/90 text-white ${selectedVerses.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
                <div className="flex items-center gap-1">
                    {(Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]).map(color => (
                        <button
                            key={color}
                            onClick={() => saveHighlight(color)}
                            className={`w-8 h-8 rounded-full border-2 border-white/20 hover:scale-125 transition-transform ${HIGHLIGHT_COLORS[color].bg.replace('/30', '')}`}
                        />
                    ))}
                    <button onClick={() => setSelectedVerses([])} className="p-2 ml-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <div className="h-8 w-px bg-white/10"></div>
                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 px-4 py-2 bg-church-green rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-colors">
                        <Share2 size={16} /> Share
                    </button>
                </div>
            </div>

            {/* Floating Pagination Arrows */}
            {!isImmersive && (
                <>
                    {chapter > 1 && (
                        <button
                            onClick={() => setChapter(prev => Math.max(1, prev - 1))}
                            className="fixed left-6 lg:left-[calc(16rem+24px)] xl:left-[calc(18rem+24px)] top-1/2 -translate-y-1/2 z-50 w-14 h-14 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-church-green hover:scale-110 active:scale-95 transition-all border border-white/20 shadow-2xl group"
                            title="Previous Chapter"
                        >
                            <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                    )}

                    {chapter < BIBLE_METADATA[book] && (
                        <button
                            onClick={() => setChapter(prev => prev + 1)}
                            className="fixed right-6 top-1/2 -translate-y-1/2 z-50 w-14 h-14 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-church-green hover:scale-110 active:scale-95 transition-all border border-white/20 shadow-2xl group"
                            title="Next Chapter"
                        >
                            <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    )}
                </>
            )}

            {/* Selection Picker (Re-using some old logic but updated styling) */}
            {pickerOpen && (
                <div className="fixed inset-0 z-[500] glass-header backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-500 flex flex-col overflow-hidden">
                    <div className="max-w-7xl mx-auto w-full h-full flex flex-col p-4 md:p-12">
                        {/* Fixed Header */}
                        <header className="flex-none flex items-center justify-between mb-10 px-2 lg:px-6">
                            <div className="flex items-center gap-4 md:gap-6">
                                <div className="w-14 h-14 md:w-20 md:h-20 bg-church-green rounded-2xl md:rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-church-green/30 animate-float">
                                    <BookOpen size={36} />
                                </div>
                                <div className="hidden sm:block">
                                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase text-gray-900 dark:text-white leading-none">Scripture Library</h2>
                                    <p className="text-[10px] md:text-sm font-black text-church-gold uppercase tracking-[0.4em] mt-1">{pickerStep === 'books' ? 'Selecting Book' : `Chapters for ${book}`}</p>
                                </div>
                                <div className="sm:hidden">
                                    <h2 className="text-xl font-black tracking-tighter uppercase text-gray-900 dark:text-white leading-none">Library</h2>
                                    <p className="text-[10px] font-black text-church-gold uppercase tracking-[0.2em] mt-1">{pickerStep === 'books' ? 'Books' : 'Chapters'}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPickerOpen(false)}
                                className="w-12 h-12 md:w-16 md:h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-95"
                            >
                                <X size={28} />
                            </button>
                        </header>

                        {pickerStep === 'books' ? (
                            <div className="flex-1 flex flex-col min-h-0">
                                {/* Fixed Search Area */}
                                <div className="flex-none relative mb-12 px-2 lg:px-6">
                                    <Search className="absolute left-10 lg:left-14 top-1/2 -translate-y-1/2 text-church-green" size={24} />
                                    <input
                                        autoFocus
                                        placeholder="Search Books..."
                                        value={pickerSearch}
                                        onChange={(e) => setPickerSearch(e.target.value)}
                                        className="w-full bg-black/5 dark:bg-white/5 border-2 border-black/5 dark:border-white/10 focus:border-church-green rounded-[1.5rem] md:rounded-[2.5rem] p-7 md:p-10 pl-16 md:pl-28 text-2xl md:text-4xl font-black uppercase tracking-tighter outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 shadow-inner"
                                    />
                                </div>

                                {/* Scrollable Content */}
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-32">
                                    {filteredBooks.map(b => (
                                        <button
                                            key={b}
                                            onClick={() => handleSelectBook(b)}
                                            className={`group p-8 md:p-10 rounded-[2rem] md:rounded-[2.5rem] text-left transition-all relative overflow-hidden flex flex-col justify-end min-h-[140px] md:min-h-[180px] ${book === b ? 'bg-church-green text-white shadow-2xl scale-[1.02] ring-4 ring-church-green/20' : 'bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 hover:shadow-xl hover:translate-y-[-4px]'}`}
                                        >
                                            <div className="relative z-10">
                                                <p className={`text-[10px] md:text-xs font-black uppercase tracking-widest mb-2 ${book === b ? 'text-white/60' : 'text-church-gold'}`}>
                                                    {BIBLE_METADATA[b]} Chapters
                                                </p>
                                                <h4 className={`text-2xl md:text-4xl font-black tracking-tighter uppercase ${book === b ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                                    {b}
                                                </h4>
                                            </div>
                                            <div className={`absolute -top-4 -right-4 text-8xl md:text-9xl font-black opacity-[0.03] dark:opacity-[0.05] transition-transform group-hover:scale-110 pointer-events-none ${book === b ? 'text-white' : 'text-church-green'}`}>
                                                {b[0]}
                                            </div>
                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <BookOpen size={48} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col min-h-0">
                                {/* Navigation Header for Chapters */}
                                <div className="flex-none flex items-center gap-6 mb-8 animate-fade-in-up">
                                    <button onClick={() => setPickerStep('books')} className="p-4 bg-white/5 rounded-2xl hover:bg-church-green hover:text-white transition-all shadow-xl">
                                        <ChevronLeft size={24} />
                                    </button>
                                    <div>
                                        <p className="text-xs md:text-sm font-black text-church-gold uppercase tracking-[0.4em] mb-1">Select Chapter</p>
                                        <h3 className="text-5xl md:text-8xl font-black tracking-tighter uppercase text-gray-900 dark:text-white">{book}</h3>
                                    </div>
                                </div>

                                {/* Scrollable Chapters Grid */}
                                <div className="flex-1 overflow-y-auto px-2 lg:px-6 custom-scrollbar grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3 md:gap-5 pb-32">
                                    {Array.from({ length: BIBLE_METADATA[book] || 1 }, (_, i) => i + 1).map(c => (
                                        <button
                                            key={c}
                                            onClick={() => handleSelectChapter(c)}
                                            className={`aspect-square rounded-[1.2rem] md:rounded-[1.8rem] flex items-center justify-center text-2xl md:text-3xl font-black transition-all shadow-lg ${chapter === c
                                                ? 'bg-church-gold text-white scale-110 shadow-premium-gold'
                                                : 'bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-900 dark:text-white hover:bg-church-green hover:text-white hover:scale-110'
                                                }`}
                                        >
                                            {c}
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
