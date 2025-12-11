import React, { useState, useEffect, useRef } from 'react';
import {
    ChevronLeft, ChevronRight, ChevronDown, Check, ArrowRight,
    BookOpen, Bookmark, X, Type, Settings, Share2, MoreHorizontal, Heart
} from 'lucide-react';
import { useTheme } from '../components/ThemeContext';
import { UserProfile } from '../types';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

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
    const [fontSize, setFontSize] = useState(18);

    // Navigation
    const [book, setBook] = useState('Genesis');
    const [chapter, setChapter] = useState(1);

    // Content
    const [text, setText] = useState<string>("");
    const [verseData, setVerseData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // UI State
    const [pickerOpen, setPickerOpen] = useState(false); // Combined Picker
    const [pickerStep, setPickerStep] = useState<'books' | 'chapters'>('books');
    const [pickerSearch, setPickerSearch] = useState('');

    // Selection State
    const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
    // Format: { [verseNum]: 'yellow' | 'green' ... }
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
        setSelectedVerses([]); // Clear selection

        try {
            const docId = `${book}_${chapter}`;
            const currentData = user.bibleData?.[docId] || {};

            // Update user profile directly
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
            // Ideally notify user here
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
                    highlights: savedHighlights, // ensure highlights persist
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
            }
        };
        fetchChapter();
    }, [book, chapter]);

    // --- Picker Logic ---
    const filteredBooks = BIBLE_BOOKS.filter(b => b.toLowerCase().includes(pickerSearch.toLowerCase()));

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
        <div className="max-w-3xl mx-auto pb-32 animate-fade-in-up relative min-h-screen bg-white dark:bg-black font-serif">

            {/* --- Top Bar (Immersive) --- */}
            <div className={`sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-black/95 backdrop-blur border-b border-gray-100 dark:border-gray-800 transition-transform duration-300 ${selectedVerses.length > 0 ? '-translate-y-full' : 'translate-y-0'}`}>
                <button onClick={openPicker} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                    <span className="font-sans font-bold text-sm text-gray-900 dark:text-gray-100">{book} {chapter}</span>
                    <ChevronDown size={14} className="text-gray-500" />
                </button>

                <div className="flex items-center gap-3">
                    <button onClick={toggleBookmark} className={`p-2 rounded-full transition-colors ${bookmarked ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                        <Bookmark size={20} fill={bookmarked ? "currentColor" : "none"} />
                    </button>
                    <button className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                        <Settings size={20} />
                    </button>
                </div>
            </div>

            {/* --- Verse Action Tray (Appears on Selection) --- */}
            <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-30 bg-black text-white px-2 py-2 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-300 ${selectedVerses.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'}`}>
                <button onClick={() => setSelectedVerses([])} className="p-2 hover:bg-gray-800 rounded-lg"><X size={18} /></button>
                <div className="w-px h-6 bg-gray-700"></div>
                {/* Color Swatches */}
                {(Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]).map(color => (
                    <button
                        key={color}
                        onClick={() => saveHighlight(color)}
                        className={`w-6 h-6 rounded-full border-2 border-transparent hover:scale-110 transition-transform ${HIGHLIGHT_COLORS[color].bg.replace('/30', '')}`}
                    ></button>
                ))}
                <div className="w-px h-6 bg-gray-700"></div>
                <button className="p-2 hover:bg-gray-800 rounded-lg"><Share2 size={18} /></button>
            </div>

            {/* --- Content Area --- */}
            <div className={`px-6 py-6 transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
                <div className="max-w-2xl mx-auto leading-loose text-lg text-gray-800 dark:text-gray-300 tracking-wide">
                    {verseData.length > 0 ? verseData.map((v: any) => {
                        const isSelected = selectedVerses.includes(v.verse);
                        const savedColor = savedHighlights[v.verse];
                        const highlightClass = savedColor ? HIGHLIGHT_COLORS[savedColor] : null;

                        return (
                            <span
                                key={v.verse}
                                onClick={() => toggleVerse(v.verse)}
                                className={`
                                    relative inline decoration-clone px-0.5 rounded cursor-pointer transition-colors
                                    ${isSelected ? 'bg-gray-200 dark:bg-gray-700 underline decoration-dotted decoration-gray-400' : ''}
                                    ${!isSelected && highlightClass ? `${highlightClass.bg} ${highlightClass.darkBg}` : ''}
                                `}
                            >
                                <sup className="text-[10px] text-gray-400 font-sans mr-1 select-none font-bold align-super">{v.verse}</sup>
                                {v.text}{' '}
                            </span>
                        );
                    }) : (
                        <div className="text-center py-20 text-gray-400">Select a chapter</div>
                    )}
                </div>
            </div>

            {/* --- Bottom Navigation --- */}
            <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-black border-t border-gray-100 dark:border-gray-800 px-6 py-4 flex justify-between items-center z-20">
                <button
                    onClick={() => setChapter(Math.max(1, chapter - 1))}
                    disabled={chapter <= 1}
                    className="flex items-center gap-2 text-sm font-bold text-gray-500 disabled:opacity-30 hover:text-black dark:hover:text-white transition-colors"
                >
                    <ChevronLeft size={18} /> Prev
                </button>

                <div className="h-1 flex-1 mx-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-church-green transition-all duration-500"
                        style={{ width: `${(chapter / (BIBLE_METADATA[book] || 1)) * 100}%` }}
                    ></div>
                </div>

                <button
                    onClick={() => setChapter(chapter + 1)}
                    className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                >
                    Next <ChevronRight size={18} />
                </button>
            </div>

            {/* --- Books/Chapter Picker Modal --- */}
            {pickerOpen && (
                <div className="fixed inset-0 z-50 bg-white dark:bg-black animate-in fade-in slide-in-from-bottom-5">
                    {/* Picker Header */}
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <button onClick={() => setPickerOpen(false)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X size={24} className="text-gray-500" /></button>
                        <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                            <button
                                onClick={() => setPickerStep('books')}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${pickerStep === 'books' ? 'bg-white dark:bg-black shadow-sm text-black dark:text-white' : 'text-gray-500'}`}
                            >Books</button>
                            <button className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${pickerStep === 'chapters' ? 'bg-white dark:bg-black shadow-sm text-black dark:text-white' : 'text-gray-500'}`}>Chapters</button>
                        </div>
                        <div className="w-8"></div>
                    </div>

                    {/* Picker Content */}
                    <div className="h-[calc(100vh-80px)] overflow-y-auto p-4 safe-area-bottom">
                        {pickerStep === 'books' ? (
                            <div className="max-w-3xl mx-auto space-y-4">
                                <input
                                    autoFocus
                                    placeholder="Search books..."
                                    value={pickerSearch}
                                    onChange={(e) => setPickerSearch(e.target.value)}
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-xl font-bold text-lg border-none focus:ring-0 placeholder-gray-400"
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {filteredBooks.map(b => (
                                        <button
                                            key={b}
                                            onClick={() => handleSelectBook(b)}
                                            className={`p-4 rounded-xl text-left font-bold text-lg transition-colors flex justify-between items-center ${book === b ? 'bg-church-green/10 text-church-green' : 'hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300'}`}
                                        >
                                            {b}
                                            {book === b && <Check size={18} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-3xl mx-auto">
                                <h3 className="text-center font-bold text-2xl mb-8 dark:text-white">{book}</h3>
                                <div className="grid grid-cols-5 md:grid-cols-8 gap-4">
                                    {Array.from({ length: BIBLE_METADATA[book] || 1 }, (_, i) => i + 1).map(c => (
                                        <button
                                            key={c}
                                            onClick={() => handleSelectChapter(c)}
                                            className={`aspect-square rounded-xl flex items-center justify-center font-bold text-xl transition-all ${chapter === c ? 'bg-church-green text-white shadow-lg shadow-church-green/30' : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
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
