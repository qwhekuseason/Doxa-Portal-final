import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    ChevronLeft, ChevronRight, ChevronDown, Check, ArrowRight,
    BookOpen, Bookmark, X, Type, Settings, Share2, MoreHorizontal, Heart, ZoomIn, Search, Star
} from 'lucide-react';
import { useTheme } from '../components/ThemeContext';
import { UserProfile } from '../types';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SectionHeader } from '../components/UIComponents';

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

const BibleScreen: React.FC<BibleScreenProps> = ({ user }) => {
    const { theme } = useTheme();
    const [fontSize, setFontSize] = useState(20);

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

    // Selection State
    const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
    const [savedHighlights, setSavedHighlights] = useState<Record<number, HighlightColor>>({});
    const [bookmarked, setBookmarked] = useState(false);

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
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };
        fetchChapter();
    }, [book, chapter]);

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

    return (
        <div className="max-w-4xl mx-auto pb-40 animate-fade-in relative min-h-screen">

            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-5 glass-header transition-all">
                <div className="flex items-center gap-4">
                    <button
                        onClick={openPicker}
                        className="flex items-center gap-2 px-4 py-2 glass-card border-none rounded-xl hover:bg-church-green hover:text-white transition-all group active:scale-95 shadow-lg"
                    >
                        <BookOpen size={16} className="text-church-green group-hover:text-white" />
                        <span className="font-sans font-black text-[10px] uppercase tracking-widest">{book} {chapter}</span>
                        <ChevronDown size={12} />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSettingsOpen(!settingsOpen)}
                        className={`p-2.5 rounded-xl transition-all ${settingsOpen ? 'bg-church-green text-white shadow-lg shadow-church-green/30' : 'glass-card border-none text-gray-500 hover:text-church-green'}`}
                    >
                        <Type size={16} />
                    </button>
                    <button
                        onClick={toggleBookmark}
                        className={`p-2.5 rounded-xl transition-all active:scale-90 ${bookmarked ? 'bg-church-gold text-white shadow-lg shadow-church-gold/30' : 'glass-card border-none text-gray-500 hover:text-church-gold'}`}
                    >
                        <Bookmark size={16} fill={bookmarked ? "currentColor" : "none"} />
                    </button>
                </div>

                {/* Typography Settings Popover */}
                {settingsOpen && (
                    <div className="absolute top-full right-6 mt-4 w-60 p-5 glass-card rounded-2xl shadow-premium z-40 animate-in fade-in slide-in-from-top-4">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Reading Settings</p>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-tight">Text Size</span>
                                    <span className="text-[10px] font-black text-church-green">{fontSize}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="14"
                                    max="32"
                                    value={fontSize}
                                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                                    className="w-full h-1 bg-gray-100 dark:bg-white/10 rounded-full appearance-none accent-church-green cursor-pointer"
                                />
                            </div>
                            <div className="flex gap-1.5">
                                {['Serif', 'Sans', 'Mono'].map(font => (
                                    <button key={font} className="flex-1 py-1.5 rounded-lg border border-gray-100 dark:border-white/5 text-[9px] font-black uppercase hover:bg-church-green hover:text-white transition-all">
                                        {font}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Verse Action Tray */}
            <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-40 glass-card bg-black/90 dark:bg-black/90 text-white px-2 py-2 rounded-2xl shadow-premium border-white/20 flex items-center gap-4 transition-all duration-500 ${selectedVerses.length > 0 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-10 scale-90 pointer-events-none'}`}>
                <button onClick={() => setSelectedVerses([])} className="p-2.5 hover:bg-white/10 rounded-xl transition-colors"><X size={18} /></button>
                <div className="w-px h-6 bg-white/10"></div>
                <div className="flex items-center gap-2">
                    {(Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]).map(color => (
                        <button
                            key={color}
                            onClick={() => saveHighlight(color)}
                            className={`w-7 h-7 rounded-sm border-2 border-white/20 hover:scale-110 active:scale-90 transition-transform ${HIGHLIGHT_COLORS[color].bg.replace('/30', '')}`}
                        ></button>
                    ))}
                </div>
                <div className="w-px h-6 bg-white/10"></div>
                <button className="p-2.5 hover:bg-white/10 rounded-xl text-church-gold transition-colors"><Share2 size={18} /></button>
            </div>

            {/* Main Reading Area */}
            <div className={`mt-8 px-6 md:px-12 transition-all duration-700 ${isLoading ? 'opacity-30 blur-sm scale-95' : 'opacity-100 blur-0 scale-100'}`}>
                <div className="max-w-2xl mx-auto text-center mb-12">
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-church-green to-emerald-800 rounded-xl flex items-center justify-center text-white shadow-xl shadow-church-green/20">
                            <BookOpen size={24} />
                        </div>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-sans font-black text-gray-900 dark:text-white tracking-tighter uppercase mb-3">{book}</h2>
                    <div className="flex items-center justify-center gap-3">
                        <span className="w-10 h-[2px] bg-church-gold rounded-full"></span>
                        <span className="text-xs font-black text-church-gold uppercase tracking-[0.2em]">Chapter {chapter}</span>
                        <span className="w-10 h-[2px] bg-church-gold rounded-full"></span>
                    </div>
                </div>

                <div
                    className="max-w-2xl mx-auto leading-[1.8] font-serif transition-all"
                    style={{ fontSize: `${fontSize}px` }}
                >
                    {verseData.length > 0 ? verseData.map((v: any) => {
                        const isSelected = selectedVerses.includes(v.verse);
                        const savedColor = savedHighlights[v.verse];
                        const highlightClass = savedColor ? HIGHLIGHT_COLORS[savedColor] : null;

                        return (
                            <span
                                key={v.verse}
                                onClick={() => toggleVerse(v.verse)}
                                className={`
                                    relative inline decoration-clone px-1.5 rounded-lg cursor-pointer transition-all duration-300
                                    ${isSelected ? 'bg-church-green/20 ring-2 ring-church-green/30' : 'hover:bg-gray-100 dark:hover:bg-white/5'}
                                    ${!isSelected && highlightClass ? `${highlightClass.bg} ${highlightClass.darkBg}` : ''}
                                `}
                            >
                                <sup className="text-[10px] text-church-green font-sans mr-2 select-none font-black align-super">{v.verse}</sup>
                                <span className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'} tracking-wide`}>{v.text}</span>
                                {' '}
                            </span>
                        );
                    }) : (
                        <div className="flex flex-col items-center py-40 gap-6 opacity-30">
                            <div className="w-20 h-20 bg-gray-200 dark:bg-white/10 rounded-full animate-pulse"></div>
                            <div className="space-y-4 w-full">
                                <div className="h-4 bg-gray-200 dark:bg-white/10 rounded-full w-3/4 mx-auto animate-pulse"></div>
                                <div className="h-4 bg-gray-200 dark:bg-white/10 rounded-full w-full mx-auto animate-pulse"></div>
                                <div className="h-4 bg-gray-200 dark:bg-white/10 rounded-full w-2/3 mx-auto animate-pulse"></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination Controls */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-48px)] max-w-md glass-card rounded-[2rem] p-2 shadow-premium flex items-center justify-between">
                <button
                    onClick={() => setChapter(Math.max(1, chapter - 1))}
                    disabled={chapter <= 1}
                    className="w-12 h-12 rounded-full glass-card border-none flex items-center justify-center hover:bg-church-green hover:text-white disabled:opacity-0 transition-all active:scale-95"
                >
                    <ChevronLeft size={20} />
                </button>

                <div className="flex-1 px-6 text-center">
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Divine Progress</div>
                    <div className="w-full h-1 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden mb-1">
                        <div
                            className="h-full bg-church-green transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                            style={{ width: `${(chapter / (BIBLE_METADATA[book] || 1)) * 100}%` }}
                        ></div>
                    </div>
                    <div className="text-[9px] font-black text-church-green uppercase tracking-tighter">
                        Chapter {chapter} of {BIBLE_METADATA[book]}
                    </div>
                </div>

                <button
                    onClick={() => setChapter(chapter + 1)}
                    disabled={chapter >= BIBLE_METADATA[book]}
                    className="w-12 h-12 rounded-full glass-card border-none flex items-center justify-center hover:bg-church-green hover:text-white disabled:opacity-0 transition-all active:scale-95"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Picker Full-Screen Modal */}
            {pickerOpen && (
                <div className="fixed inset-0 z-[400] bg-white dark:bg-black p-4 md:p-12 animate-in fade-in slide-in-from-bottom-10 flex flex-col">
                    <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-church-green rounded-[1rem] flex items-center justify-center text-white shadow-lg">
                                    <Search size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black tracking-tighter uppercase dark:text-white">Choose Scripture</h2>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{pickerStep === 'books' ? 'Selecting Book' : `Selecting Chapter for ${book}`}</p>
                                </div>
                            </div>
                            <button onClick={() => setPickerOpen(false)} className="w-12 h-12 glass-card border-none rounded-2xl flex items-center justify-center text-gray-400 hover:text-red-500 transition-all">
                                <X size={28} />
                            </button>
                        </div>

                        {pickerStep === 'books' && (
                            <div className="mb-8 relative group">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-church-green transition-colors" />
                                <input
                                    autoFocus
                                    placeholder="Search the Scriptures..."
                                    value={pickerSearch}
                                    onChange={(e) => setPickerSearch(e.target.value)}
                                    className="w-full p-6 pl-16 glass-card border-none rounded-3xl font-black text-2xl uppercase tracking-tighter focus:ring-4 focus:ring-church-green/10 transition-all dark:text-white placeholder:text-gray-400"
                                />
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto px-2 pb-12 hide-scrollbar">
                            {pickerStep === 'books' ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {filteredBooks.map(b => (
                                        <button
                                            key={b}
                                            onClick={() => handleSelectBook(b)}
                                            className={`group p-5 rounded-2xl text-left transition-all relative overflow-hidden ${book === b ? 'bg-church-green text-white shadow-premium' : 'glass-card border-none hover:bg-gray-50 dark:hover:bg-white/5'}`}
                                        >
                                            <div className="relative z-10">
                                                <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5">{BIBLE_METADATA[b]} Chapters</p>
                                                <p className="text-lg font-black tracking-tight uppercase">{b}</p>
                                            </div>
                                            {book === b && <Check size={20} className="absolute top-5 right-5 opacity-40" />}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    <div className="flex items-center gap-6">
                                        <button onClick={() => setPickerStep('books')} className="p-4 glass-card border-none rounded-2xl hover:bg-church-green hover:text-white transition-all">
                                            <ChevronLeft size={24} />
                                        </button>
                                        <h3 className="text-5xl font-black tracking-tighter uppercase dark:text-white">{book}</h3>
                                    </div>
                                    <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-4">
                                        {Array.from({ length: BIBLE_METADATA[book] || 1 }, (_, i) => i + 1).map(c => (
                                            <button
                                                key={c}
                                                onClick={() => handleSelectChapter(c)}
                                                className={`aspect-square rounded-2xl flex items-center justify-center font-black text-2xl transition-all ${chapter === c ? 'bg-church-gold text-white shadow-premium-gold scale-110' : 'glass-card border-none hover:bg-church-green hover:text-white'}`}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default BibleScreen;
