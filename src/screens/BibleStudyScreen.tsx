import React, { useState, useMemo } from 'react';
import { collection, query, orderBy, where, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { StudyPlan, StudyNote, UserProfile } from '../types';
import {
    BookOpen,
    Calendar,
    ChevronRight,
    Edit3,
    Plus,
    Save,
    Trash2,
    Clock,
    ChevronLeft,
    X,
    StickyNote,
    BookMarked,
    ArrowRight,
    Loader2
} from 'lucide-react';
import { SkeletonCard, SectionHeader } from '../components/UIComponents';

interface BibleStudyScreenProps {
    user: UserProfile;
}

const BibleStudyScreen: React.FC<BibleStudyScreenProps> = ({ user }) => {
    const [view, setView] = useState<'plans' | 'plan-detail' | 'notes'>('plans');
    const [selectedPlan, setSelectedPlan] = useState<StudyPlan | null>(null);
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [currentNote, setCurrentNote] = useState<Partial<StudyNote> | null>(null);
    const [savingNote, setSavingNote] = useState(false);

    // Queries
    const plansQ = useMemo(() => query(collection(db, 'study_plans'), orderBy('createdAt', 'desc')), []);
    const notesQ = useMemo(() => query(
        collection(db, 'study_notes'),
        where('uid', '==', user.uid),
        orderBy('createdAt', 'desc')
    ), [user.uid]);

    const { data: plans, loading: loadingPlans } = useFirestoreQuery<StudyPlan>(plansQ);
    const { data: notes, loading: loadingNotes } = useFirestoreQuery<StudyNote>(notesQ);

    const handleSaveNote = async () => {
        if (!currentNote?.title || !currentNote?.content) return;
        setSavingNote(true);
        try {
            if (currentNote.id) {
                await updateDoc(doc(db, 'study_notes', currentNote.id), {
                    ...currentNote,
                    updatedAt: new Date().toISOString()
                });
            } else {
                await addDoc(collection(db, 'study_notes'), {
                    ...currentNote,
                    uid: user.uid,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
            setIsEditingNote(false);
            setCurrentNote(null);
        } catch (e) {
            console.error(e);
            alert('Failed to save note');
        } finally {
            setSavingNote(false);
        }
    };

    const handleDeleteNote = async (id: string) => {
        if (!window.confirm('Delete this note?')) return;
        try {
            await deleteDoc(doc(db, 'study_notes', id));
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <SectionHeader
                    title="Bible Study"
                    subtitle="Deepen your understanding with guided study plans and personal reflections."
                />

                <div className="flex bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl border border-gray-200 dark:border-white/5">
                    <button
                        onClick={() => { setView('plans'); setSelectedPlan(null); }}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${view === 'plans' || view === 'plan-detail' ? 'bg-white dark:bg-white/10 text-church-green shadow-sm' : 'text-gray-400'}`}
                    >
                        <BookMarked size={14} /> Study Plans
                    </button>
                    <button
                        onClick={() => setView('notes')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${view === 'notes' ? 'bg-white dark:bg-white/10 text-church-green shadow-sm' : 'text-gray-400'}`}
                    >
                        <StickyNote size={14} /> My Notes
                    </button>
                </div>
            </div>

            {/* --- Study Plans View --- */}
            {(view === 'plans') && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {loadingPlans ? [1, 2, 3].map(i => <SkeletonCard key={i} height="h-64" />) :
                        plans.length > 0 ? plans.map(plan => (
                            <div
                                key={plan.id}
                                onClick={() => { setSelectedPlan(plan); setView('plan-detail'); }}
                                className="group glass-card overflow-hidden rounded-[2.5rem] cursor-pointer hover:-translate-y-2 transition-all duration-500 shadow-premium"
                            >
                                <div className="relative h-40">
                                    <img
                                        src={plan.coverUrl || 'https://images.unsplash.com/photo-1504052434139-441c2c3109ce?auto=format&fit=crop&q=80&w=1000'}
                                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                    <div className="absolute bottom-4 left-6">
                                        <span className="px-3 py-1 bg-church-green text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-lg">
                                            {plan.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-8">
                                    <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter mb-2 group-hover:text-church-green transition-colors">
                                        {plan.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 line-clamp-2 mb-6 font-medium">
                                        {plan.description}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                                            <Clock size={14} /> {plan.duration} Days
                                        </div>
                                        <div className="text-church-green">
                                            <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full py-20 text-center glass-card rounded-[3rem] border-dashed border-2">
                                <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                                <p className="font-black text-gray-400 uppercase tracking-widest text-xs">No active study plans available</p>
                            </div>
                        )}
                </div>
            )}

            {/* --- Plan Detail View --- */}
            {view === 'plan-detail' && selectedPlan && (
                <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
                    <button
                        onClick={() => setView('plans')}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-church-green transition-colors"
                    >
                        <ChevronLeft size={16} /> Back to plans
                    </button>

                    <div className="glass-card p-10 md:p-14 rounded-[4rem] relative overflow-hidden">
                        <div className="flex flex-col md:flex-row gap-10">
                            <div className="w-full md:w-1/3">
                                <img
                                    src={selectedPlan.coverUrl || 'https://images.unsplash.com/photo-1504052434139-441c2c3109ce?auto=format&fit=crop&q=80&w=1000'}
                                    className="w-full aspect-square object-cover rounded-[3rem] shadow-2xl"
                                />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-4xl font-black dark:text-white uppercase tracking-tighter mb-4 leading-none">{selectedPlan.title}</h2>
                                <div className="flex items-center gap-4 mb-6">
                                    <span className="px-4 py-1.5 bg-church-green/10 text-church-green text-[10px] font-black uppercase tracking-widest rounded-full border border-church-green/20">
                                        {selectedPlan.category}
                                    </span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        {selectedPlan.duration} Day Journey
                                    </span>
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed font-serif italic">
                                    {selectedPlan.description}
                                </p>
                            </div>
                        </div>

                        <div className="mt-16 space-y-6">
                            <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-400 border-b border-gray-100 dark:border-white/5 pb-4">Daily Content</h4>
                            {selectedPlan.days.map((day, idx) => (
                                <div key={idx} className="group glass-card p-8 rounded-[2.5rem] border-white/40 hover:bg-white dark:hover:bg-white/5 transition-all">
                                    <div className="flex items-start justify-between gap-6">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-church-green font-black text-xl italic">Day {day.dayNumber}</span>
                                                <div className="h-px w-8 bg-church-green/30"></div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-church-gold">{day.passage}</span>
                                            </div>
                                            <h3 className="text-xl font-black dark:text-white mb-4 tracking-tight">{day.title}</h3>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
                                                {day.content}
                                            </p>
                                            <button
                                                onClick={() => {
                                                    setView('notes');
                                                    setIsEditingNote(true);
                                                    setCurrentNote({
                                                        title: `Reflection: ${selectedPlan.title} - Day ${day.dayNumber}`,
                                                        planId: selectedPlan.id,
                                                        dayNumber: day.dayNumber,
                                                        content: `Passage: ${day.passage}\n\nNotes from today's study:`
                                                    });
                                                }}
                                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-church-green hover:translate-x-1 transition-all"
                                            >
                                                <Edit3 size={14} /> Take Notes
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* --- Notes View --- */}
            {view === 'notes' && (
                <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">My Reflection Notes</h3>
                        {!isEditingNote && (
                            <button
                                onClick={() => { setIsEditingNote(true); setCurrentNote({ title: '', content: '' }); }}
                                className="px-6 py-3 bg-church-green text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <Plus size={16} /> New Note
                            </button>
                        )}
                    </div>

                    {isEditingNote ? (
                        <div className="glass-card p-10 rounded-[3rem] shadow-premium animate-fade-in-up border-2 border-church-green/20">
                            <div className="flex justify-between items-center mb-8">
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-church-green">Write Reflection</span>
                                <button onClick={() => setIsEditingNote(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"><X size={20} /></button>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Title</label>
                                    <input
                                        value={currentNote?.title || ''}
                                        onChange={e => setCurrentNote({ ...currentNote, title: e.target.value })}
                                        placeholder="Enter reflection title..."
                                        className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl px-6 py-4 font-bold dark:text-white focus:ring-4 focus:ring-church-green/10 transition-all mt-2"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Content</label>
                                    <textarea
                                        value={currentNote?.content || ''}
                                        onChange={e => setCurrentNote({ ...currentNote, content: e.target.value })}
                                        placeholder="Whaf did you learn today?"
                                        rows={12}
                                        className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-[2rem] px-6 py-6 font-medium dark:text-white focus:ring-4 focus:ring-church-green/10 transition-all mt-2 resize-none"
                                    />
                                </div>
                                <button
                                    onClick={handleSaveNote}
                                    disabled={savingNote}
                                    className="w-full py-5 bg-church-green text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {savingNote ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                    {savingNote ? 'Syncing...' : 'Securely Save Reflection'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {loadingNotes ? [1, 2].map(i => <SkeletonCard key={i} />) :
                                notes.length > 0 ? notes.map(note => (
                                    <div key={note.id} className="group glass-card p-8 rounded-[2.5rem] border-white/40 hover:-translate-y-2 transition-all duration-500 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-church-green/5 blur-[40px] -mr-8 -mt-8"></div>
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-church-green/10 text-church-green rounded-xl">
                                                    <StickyNote size={20} />
                                                </div>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                                    {new Date(note.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => { setCurrentNote(note); setIsEditingNote(true); }}
                                                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-church-green transition-colors"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteNote(note.id)}
                                                    className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter mb-4 line-clamp-1">{note.title}</h3>
                                        <p className="text-gray-500 dark:text-gray-100 text-sm leading-relaxed line-clamp-4 font-serif italic mb-6">
                                            {note.content}
                                        </p>
                                        {note.planId && (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-church-gold/10 text-church-gold text-[8px] font-black uppercase tracking-widest rounded-lg w-fit">
                                                <BookMarked size={12} /> Linked to Study Plan
                                            </div>
                                        )}
                                    </div>
                                )) : (
                                    <div className="col-span-full py-20 text-center glass-card rounded-[3rem] border-dashed border-2">
                                        <StickyNote size={48} className="mx-auto text-gray-300 mb-4" />
                                        <p className="font-black text-gray-400 uppercase tracking-widest text-xs">You haven't taken any notes yet</p>
                                    </div>
                                )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BibleStudyScreen;
