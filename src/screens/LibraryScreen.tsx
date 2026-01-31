import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { EBook, UserProfile } from '../types';
import {
    Search,
    Library,
    Download,
    BookOpen,
    Clock,
    FileText,
    Filter,
    ArrowRight,
    TrendingUp,
    Award
} from 'lucide-react';
import { LoadingSpinner, SectionHeader } from '../components/UIComponents';

interface LibraryScreenProps {
    user: UserProfile;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ user }) => {
    const [books, setBooks] = useState<EBook[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    useEffect(() => {
        const q = query(collection(db, 'e_books')); // Removed orderBy to debug permissions/index
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedBooks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EBook));
            // Sort manually
            fetchedBooks.sort((a, b) => ((b.createdAt || '') > (a.createdAt || '') ? 1 : -1));
            setBooks(fetchedBooks);
            setLoading(false);
        }, (error) => {
            console.error("LibraryScreen load error:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const categories = ['All', ...Array.from(new Set(books.map(b => b.category || 'General')))];

    const filteredBooks = books.filter(b => {
        const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.author.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || b.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (loading) return <div className="py-20 flex justify-center"><LoadingSpinner /></div>;

    return (
        <div className="space-y-10 animate-fade-in">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-church-gold/20 to-orange-500/10 rounded-[3rem] p-8 md:p-12 border border-church-gold/20 shadow-2xl shadow-church-gold/5">
                <div className="absolute top-0 right-0 w-96 h-96 bg-church-gold/5 rounded-full blur-3xl -mr-48 -mt-48 animate-pulse"></div>

                <div className="relative z-10 max-w-2xl text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-church-gold text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-6">
                        <Library size={14} /> Digital Resources
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-[0.9] mb-4">
                        Spiritual <span className="text-church-gold">Knowledge</span> Library
                    </h1>
                    <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-8">
                        Dive deep into our curated collection of spiritual books, leadership guides, and study materials. Enrich your faith journey with knowledge.
                    </p>

                    {/* Search Bar */}
                    <div className="relative group max-w-md">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-church-gold transition-colors" size={18} />
                        <input
                            placeholder="Find your next read..."
                            className="w-full bg-white dark:bg-black/40 border-none shadow-premium focus:ring-4 focus:ring-church-gold/20 rounded-3xl pl-14 pr-6 py-5 text-sm font-bold dark:text-white transition-all outline-none"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Floating Icons */}
                <div className="hidden lg:block absolute right-12 bottom-12 opacity-10 scale-150 rotate-12">
                    <BookOpen size={200} className="text-church-gold" />
                </div>
            </div>

            {/* Featured Section (First 3) */}
            {filteredBooks.length > 0 && searchQuery === '' && selectedCategory === 'All' && (
                <div className="space-y-6">
                    <SectionHeader title="New Arrivals" icon={<TrendingUp size={20} />} />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredBooks.slice(0, 3).map((book, i) => (
                            <div key={book.id} className="group glass-card overflow-hidden rounded-[2.5rem] flex flex-col hover:border-church-gold/30 transition-all hover:translate-y-[-4px] shadow-lg">
                                <div className="relative h-64 overflow-hidden">
                                    <img src={book.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={book.title} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                                    <div className="absolute top-4 right-4">
                                        <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest rounded-full border border-white/20">
                                            {book.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-8 flex-1 flex flex-col">
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight line-clamp-2 leading-none mb-2">{book.title}</h3>
                                    <p className="text-[10px] font-black text-church-gold uppercase tracking-[0.2em] mb-4">By {book.author}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mb-6 font-medium italic leading-relaxed">"{book.description || 'No description provided.'}"</p>

                                    <div className="mt-auto flex items-center justify-between pt-6 border-t border-gray-100 dark:border-white/5">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <FileText size={14} />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                                {book.fileSize > 0 ? `${(book.fileSize / (1024 * 1024)).toFixed(1)} MB` : 'External'}
                                            </span>
                                        </div>
                                        <a
                                            href={book.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-5 py-2.5 bg-church-gold text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-church-gold/20 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            View <Download size={14} />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Library Grid */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <SectionHeader title="Explore Collections" icon={<Library size={20} />} />

                    {/* Category Filter */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedCategory === cat
                                    ? 'bg-church-gold text-white shadow-lg shadow-church-gold/20 scale-105'
                                    : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredBooks.length === 0 ? (
                    <div className="py-20 text-center glass-card rounded-[3rem] border-dashed border-2 border-gray-200 dark:border-white/10">
                        <Search size={48} className="mx-auto text-gray-300 mb-4 opacity-50" />
                        <h4 className="text-lg font-black text-gray-400 uppercase tracking-widest">No matching books found</h4>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-2 cursor-pointer hover:text-church-gold transition-colors" onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}>Reset Filters</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {filteredBooks.map(book => (
                            <div key={book.id} className="group flex flex-col animate-scale-in">
                                <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-premium mb-4 group-hover:rotate-1 group-hover:scale-105 transition-all duration-500">
                                    <img src={book.coverUrl} className="w-full h-full object-cover" alt={book.title} />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                        <a
                                            href={book.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-church-gold shadow-2xl scale-50 group-hover:scale-100 transition-all duration-500 hover:rotate-12"
                                        >
                                            <Download size={24} />
                                        </a>
                                    </div>
                                    <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all">
                                        <span className="bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-md text-[8px] font-black text-church-gold">{book.category}</span>
                                    </div>
                                </div>
                                <h4 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tight line-clamp-1 group-hover:text-church-gold transition-colors">{book.title}</h4>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">By {book.author}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Quote of the Day */}
            <div className="bg-church-gold/5 border border-church-gold/10 p-10 rounded-[3rem] text-center max-w-3xl mx-auto shadow-inner">
                < Award className="mx-auto text-church-gold mb-6" size={32} />
                <p className="text-lg md:text-2xl font-serif italic text-gray-700 dark:text-gray-300 leading-relaxed">
                    "A library is not a luxury but one of the necessities of life."
                </p>
                <p className="mt-4 text-[10px] font-black text-church-gold uppercase tracking-[0.3em]">Henry Ward Beecher</p>
            </div>
        </div>
    );
};

export default LibraryScreen;
