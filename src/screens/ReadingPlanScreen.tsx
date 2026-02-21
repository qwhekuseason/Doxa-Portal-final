
import React, { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, where, addDoc, updateDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { ReadingPlan, UserPlanProgress, UserProfile } from '../types';
import {
    BookOpen,
    Calendar,
    ChevronRight,
    CheckCircle2,
    Clock,
    ChevronLeft,
    X,
    Filter,
    Search,
    Play,
    Zap,
    Trophy,
    ArrowRight,
    BookMarked,
    Target
} from 'lucide-react';
import { SkeletonCard, SectionHeader, PageHeader } from '../components/UIComponents';

interface ReadingPlanScreenProps {
    user: UserProfile;
    onNavigate?: (tab: string, context?: any) => void;
}

const ReadingPlanScreen: React.FC<ReadingPlanScreenProps> = ({ user, onNavigate }) => {
    const [view, setView] = useState<'browse' | 'detail' | 'reading'>('browse');
    const [selectedPlan, setSelectedPlan] = useState<ReadingPlan | null>(null);
    const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('all');

    // Queries
    const plansQ = useMemo(() => query(collection(db, 'reading_plans'), orderBy('createdAt', 'desc')), []);
    const progressQ = useMemo(() => query(
        collection(db, 'user_plan_progress'),
        where('uid', '==', user.uid),
        where('status', '==', 'active')
    ), [user.uid]);

    const { data: allPlans, loading: loadingPlans } = useFirestoreQuery<ReadingPlan>(plansQ);
    const { data: userProgress, loading: loadingProgress } = useFirestoreQuery<UserPlanProgress>(progressQ);

    const handleSeedData = async () => {
        const samplePlans: Partial<ReadingPlan>[] = [
            {
                title: "The New Testament Journey",
                description: "Experience the life of Jesus, the birth of the church, and the letters of the apostles in this 30-day chronological journey.",
                coverUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1000",
                duration: 30,
                category: "bible",
                difficulty: "intermediate",
                createdAt: serverTimestamp(),
                days: [
                    { dayNumber: 1, title: "The Word Made Flesh", description: "Start your journey by reflecting on the divinity of Christ.", passages: ["John 1:1-18", "Psalm 1"] },
                    { dayNumber: 2, title: "The Birth of Jesus", description: "Follow the miraculous story of Christ's arrival.", passages: ["Matthew 1:18-25", "Luke 2:1-20"] },
                    { dayNumber: 3, title: "The Baptism of Jesus", description: "See how Jesus' public ministry began.", passages: ["Mark 1:1-13", "Isaiah 40:1-5"] }
                ]
            },
            {
                title: "Bible Foundation Foundations",
                description: "Master the core principles of faith, grace, and redemption that define the believer's life.",
                coverUrl: "https://images.unsplash.com/photo-1507434965515-61970f2bd7c6?auto=format&fit=crop&q=80&w=1000",
                duration: 7,
                category: "topical",
                difficulty: "beginner",
                createdAt: serverTimestamp(),
                days: [
                    { dayNumber: 1, title: "Faith over Fear", description: "Learn how to stand firm when life gets Shaky.", passages: ["Hebrews 11:1-6", "Joshua 1:9"] },
                    { dayNumber: 2, title: "Unconditional Grace", description: "Understanding that we are saved by grace, not works.", passages: ["Ephesians 2:1-10", "Romans 5:8"] }
                ]
            }
        ];

        for (const plan of samplePlans) {
            await addDoc(collection(db, 'reading_plans'), plan);
        }
    };

    const activePlans = useMemo(() => {
        return allPlans.filter(p => userProgress.some(pr => pr.planId === p.id));
    }, [allPlans, userProgress]);

    const filteredPlans = useMemo(() => {
        return allPlans.filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCat = activeCategory === 'all' || p.category === activeCategory;
            return matchesSearch && matchesCat;
        });
    }, [allPlans, searchQuery, activeCategory]);

    const getProgressForPlan = (planId: string) => {
        return userProgress.find(p => p.planId === planId);
    };

    const handleStartPlan = async (plan: ReadingPlan) => {
        const existing = getProgressForPlan(plan.id);
        if (existing) {
            setSelectedPlan(plan);
            setView('detail');
            return;
        }

        try {
            await addDoc(collection(db, 'user_plan_progress'), {
                uid: user.uid,
                planId: plan.id,
                startDate: serverTimestamp(),
                completedDays: [],
                lastActive: serverTimestamp(),
                status: 'active'
            } as UserPlanProgress);
            setSelectedPlan(plan);
            setView('detail');
        } catch (e) {
            console.error(e);
        }
    };

    const handleToggleDay = async (planId: string, dayNumber: number) => {
        const progress = getProgressForPlan(planId);
        if (!progress) return;

        const isCompleted = progress.completedDays.includes(dayNumber);
        const newCompleted = isCompleted
            ? progress.completedDays.filter(d => d !== dayNumber)
            : [...progress.completedDays, dayNumber];

        try {
            await updateDoc(doc(db, 'user_plan_progress', progress.id), {
                completedDays: newCompleted,
                lastActive: serverTimestamp(),
                status: newCompleted.length === selectedPlan?.duration ? 'completed' : 'active'
            });
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            {view === 'browse' && (
                <>
                    <PageHeader
                        title="Reading Plans"
                        subtitle="Join thousands on a journey through the Word. Grow daily with structured scripture and devotionals."
                    />

                    {/* Active Plans Horizontal Scroll */}
                    {activePlans.length > 0 && (
                        <section className="space-y-6">
                            <SectionHeader title="Your Journey" subtitle="Continue where you left off." icon={<Zap className="text-church-gold" />} />
                            <div className="flex gap-6 overflow-x-auto pb-6 -mx-4 px-4 hide-scrollbar snap-x">
                                {activePlans.map(plan => {
                                    const progress = getProgressForPlan(plan.id);
                                    const percent = progress ? Math.round((progress.completedDays.length / plan.duration) * 100) : 0;
                                    return (
                                        <div
                                            key={plan.id}
                                            onClick={() => { setSelectedPlan(plan); setView('detail'); }}
                                            className="min-w-[280px] md:min-w-[340px] snap-center glass-card p-6 rounded-[2.5rem] border-white/20 active:scale-95 transition-all cursor-pointer group glass-sheen"
                                        >
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg">
                                                    <img src={plan.coverUrl} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-black text-sm uppercase tracking-tight truncate dark:text-white group-hover:text-church-green transition-colors">{plan.title}</h4>
                                                    <p className="text-[10px] font-black text-church-green uppercase tracking-widest">{plan.duration - (progress?.completedDays.length || 0)} Days left</p>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    <span>Progress</span>
                                                    <span>{percent}%</span>
                                                </div>
                                                <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-church-green to-emerald-400 transition-all duration-1000 ease-out"
                                                        style={{ width: `${percent}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Browse Section */}
                    <section className="space-y-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <SectionHeader title="Discover Plans" subtitle="Find the perfect plan for your season of life." icon={<Search className="text-church-green" />} />

                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search plans..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="bg-gray-100 dark:bg-white/5 border-none rounded-2xl pl-11 pr-5 py-3 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-church-green/20 w-48 md:w-64 transition-all"
                                    />
                                </div>
                                <div className="flex items-center bg-gray-100 dark:bg-white/5 p-1 rounded-2xl border border-gray-200 dark:border-white/5">
                                    {['all', 'bible', 'devotional', 'topical'].map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setActiveCategory(cat)}
                                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-white dark:bg-white/10 text-church-green shadow-sm' : 'text-gray-400'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {loadingPlans ? [1, 2, 3, 4].map(i => <SkeletonCard key={i} height="h-72" />) :
                                filteredPlans.map(plan => (
                                    <div
                                        key={plan.id}
                                        onClick={() => handleStartPlan(plan)}
                                        className="group glass-card rounded-[2.5rem] overflow-hidden border-white/20 hover:-translate-y-2 transition-all duration-500 shadow-premium cursor-pointer"
                                    >
                                        <div className="h-44 relative">
                                            <img src={plan.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={plan.title} />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                            <div className="absolute bottom-5 left-6 right-6">
                                                <div className="flex items-center justify-between">
                                                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest rounded-lg border border-white/20">
                                                        {plan.category}
                                                    </span>
                                                    <div className="flex items-center gap-1 text-white/80 text-[9px] font-black uppercase tracking-widest">
                                                        <Clock size={12} /> {plan.duration} Days
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-8">
                                            <h3 className="font-black text-xl tracking-tighter dark:text-white uppercase leading-tight mb-3 group-hover:text-church-green transition-colors line-clamp-2">{plan.title}</h3>
                                            <p className="text-sm text-gray-500 font-medium line-clamp-2 mb-6">{plan.description}</p>
                                            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <Trophy size={14} className="text-church-gold" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{plan.difficulty || 'All levels'}</span>
                                                </div>
                                                <div className="w-10 h-10 rounded-full bg-church-green/10 flex items-center justify-center text-church-green group-hover:bg-church-green group-hover:text-white transition-all">
                                                    <ChevronRight size={20} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                ))
                            }
                            {!loadingPlans && filteredPlans.length === 0 && (
                                <div className="col-span-full py-20 text-center glass-card rounded-[3rem] border-dashed border-2 flex flex-col items-center gap-6">
                                    <BookMarked size={48} className="text-gray-300" />
                                    <div className="space-y-2">
                                        <p className="font-black text-gray-400 uppercase tracking-widest text-xs">No active reading plans available</p>
                                        <p className="text-[10px] text-gray-400 font-medium">Be the first to start a journey through the Word.</p>
                                    </div>
                                    <button
                                        onClick={handleSeedData}
                                        className="px-8 py-3 bg-church-green text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all"
                                    >
                                        Seed Sample Plans
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                </>
            )}

            {view === 'detail' && selectedPlan && (
                <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
                    <button
                        onClick={() => setView('browse')}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-church-green transition-colors"
                    >
                        <ChevronLeft size={16} /> Back to Browse
                    </button>

                    <div className="glass-card p-8 md:p-14 rounded-[3rem] sm:rounded-[4rem] relative overflow-hidden glass-sheen">
                        <div className="flex flex-col md:flex-row gap-10">
                            <div className="w-full md:w-2/5">
                                <img src={selectedPlan.coverUrl} className="w-full aspect-square object-cover rounded-[2.5rem] shadow-2xl" alt={selectedPlan.title} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="px-4 py-1.5 bg-church-green/10 text-church-green text-[10px] font-black uppercase tracking-widest rounded-full border border-church-green/20">
                                        {selectedPlan.category}
                                    </span>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        {selectedPlan.duration} Days
                                    </span>
                                </div>
                                <h1 className="text-3xl md:text-5xl font-black dark:text-white uppercase tracking-tighter mb-6 leading-tight">{selectedPlan.title}</h1>
                                <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed font-serif italic mb-8">
                                    {selectedPlan.description}
                                </p>

                                {getProgressForPlan(selectedPlan.id) && (
                                    <div className="p-6 bg-church-green/5 dark:bg-white/5 rounded-3xl border border-church-green/10">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-[10px] font-black text-church-green uppercase tracking-widest">Plan Progress</span>
                                            <span className="text-[10px] font-black text-church-green uppercase tracking-widest">
                                                {getProgressForPlan(selectedPlan.id)?.completedDays.length} / {selectedPlan.duration} Days
                                            </span>
                                        </div>
                                        <div className="h-3 bg-white dark:bg-black/20 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-church-green shadow-[0_0_15px_rgba(22,163,74,0.3)] transition-all duration-1000 ease-out"
                                                style={{ width: `${(getProgressForPlan(selectedPlan.id)?.completedDays.length || 0) / selectedPlan.duration * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-16 space-y-4">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-400 border-b border-gray-100 dark:border-white/5 pb-6">Track Your Progress</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedPlan.days.map((day, idx) => {
                                    const isCompleted = getProgressForPlan(selectedPlan.id)?.completedDays.includes(day.dayNumber);
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                setSelectedDayIdx(idx);
                                                setView('reading');
                                            }}
                                            className={`glass-card p-6 rounded-[2rem] flex items-center justify-between gap-4 cursor-pointer hover:scale-[1.02] transition-all border border-white/40 ${isCompleted ? 'bg-church-green/5 opacity-80' : ''}`}
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black italic ${isCompleted ? 'bg-church-green text-white' : 'bg-gray-100 dark:bg-white/5 text-church-green'}`}>
                                                    {day.dayNumber}
                                                </div>
                                                <div>
                                                    <h4 className={`font-black text-sm uppercase tracking-tight truncate ${isCompleted ? 'text-gray-400 line-through' : 'dark:text-white'}`}>{day.title}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <BookOpen size={12} className="text-church-gold" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-church-gold">{day.passages.join(', ')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleDay(selectedPlan.id, day.dayNumber);
                                                }}
                                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isCompleted ? 'bg-church-green text-white' : 'border-2 border-dashed border-gray-200 dark:border-white/10 text-gray-300'}`}
                                            >
                                                <CheckCircle2 size={20} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {view === 'reading' && selectedPlan && (
                <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up">
                    <button
                        onClick={() => setView('detail')}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-church-green transition-colors"
                    >
                        <ChevronLeft size={16} /> Back to Plan
                    </button>

                    <div className="glass-morphic p-8 md:p-14 rounded-[3rem] border border-white/40 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8">
                            <div className="px-4 py-2 bg-church-green/10 text-church-green rounded-2xl text-[10px] font-black tracking-widest uppercase border border-church-green/20">
                                Day {selectedPlan.days[selectedDayIdx].dayNumber}
                            </div>
                        </div>

                        <div className="space-y-12 pb-10">
                            <div className="space-y-4">
                                <h1 className="text-3xl md:text-5xl font-black dark:text-white uppercase tracking-tighter leading-tight italic">
                                    {selectedPlan.days[selectedDayIdx].title}
                                </h1>
                                <div className="h-1 w-20 bg-church-green rounded-full"></div>
                            </div>

                            <section className="space-y-6">
                                <h3 className="text-[10px] font-black text-church-gold uppercase tracking-[0.4em]">Scripture Readings</h3>
                                <div className="space-y-4">
                                    {selectedPlan.days[selectedDayIdx].passages.map((ps, i) => (
                                        <div key={i} className="flex items-center justify-between p-6 glass-card !bg-white/20 rounded-3xl border-white/40 group hover:scale-[1.02] transition-all">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-church-green group-hover:scale-110 transition-transform">
                                                    <BookOpen size={24} />
                                                </div>
                                                <span className="text-xl font-black dark:text-white tracking-tight">{ps}</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    // Simple parser for "Book Chapter:Verse"
                                                    const parts = ps.split(' ');
                                                    const book = parts.slice(0, parts.length - 1).join(' ');
                                                    const coord = parts[parts.length - 1];
                                                    const chapter = parseInt(coord.split(':')[0]);

                                                    onNavigate?.('bible', { book, chapter });
                                                }}
                                                className="px-6 py-2.5 bg-church-green text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                                            >
                                                Read Now
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="space-y-6">
                                <h3 className="text-[10px] font-black text-church-green uppercase tracking-[0.4em]">Daily Reflection</h3>
                                <div className="p-8 glass-card !bg-white/10 rounded-[2.5rem] border-white/20">
                                    <p className="text-gray-700 dark:text-gray-200 text-lg leading-relaxed font-serif italic first-letter:text-4xl first-letter:font-black first-letter:mr-1 first-letter:text-church-green">
                                        {selectedPlan.days[selectedDayIdx].description || "Take a moment to reflect on today's scripture. Write down what the Holy Spirit is teaching you through these passages."}
                                    </p>
                                </div>
                            </section>
                        </div>

                        <div className="pt-10 border-t border-white/10 flex justify-between items-center">
                            <button
                                onClick={() => {
                                    if (selectedDayIdx > 0) setSelectedDayIdx(selectedDayIdx - 1);
                                }}
                                disabled={selectedDayIdx === 0}
                                className="flex items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-church-green transition-all disabled:opacity-30 disabled:pointer-events-none"
                            >
                                <ChevronLeft size={20} /> Previous Day
                            </button>

                            <button
                                onClick={async () => {
                                    await handleToggleDay(selectedPlan.id, selectedPlan.days[selectedDayIdx].dayNumber);
                                    if (selectedDayIdx < selectedPlan.days.length - 1) {
                                        setSelectedDayIdx(selectedDayIdx + 1);
                                    } else {
                                        setView('detail');
                                    }
                                }}
                                className="flex items-center gap-3 px-10 py-5 bg-church-green text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-church-green/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                {getProgressForPlan(selectedPlan.id)?.completedDays.includes(selectedPlan.days[selectedDayIdx].dayNumber) ? "Next Day" : "Complete & Continue"} <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReadingPlanScreen;
