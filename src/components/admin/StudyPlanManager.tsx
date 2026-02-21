import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { StudyPlan } from '../../types';
import { compressImage } from '../../utils/base64Helper';
import { notifyNewStudyPlan } from '../../utils/notificationService';
import { X, Trash2, UploadCloud, Plus, Save, BookOpen, Loader2 } from 'lucide-react';

export const AdminStudyPlanManager: React.FC = () => {
    const [plans, setPlans] = useState<StudyPlan[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState<Partial<StudyPlan>>({
        title: '',
        description: '',
        coverUrl: '',
        duration: 7,
        category: 'weekly',
        days: []
    });

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const base64 = await compressImage(file);
            setFormData(prev => ({ ...prev, coverUrl: base64 }));
        } catch (err) {
            console.error("Image processing failed", err);
            alert("Image processing failed.");
        } finally {
            setUploading(false);
        }
    };

    const fetchPlans = async () => {
        const q = query(collection(db, 'study_plans'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as StudyPlan)));
    };

    useEffect(() => { fetchPlans(); }, []);

    const handleAddDay = () => {
        const newDay = {
            dayNumber: (formData.days?.length || 0) + 1,
            title: '',
            passage: '',
            content: ''
        };
        setFormData({ ...formData, days: [...(formData.days || []), newDay] });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addDoc(collection(db, 'study_plans'), {
                ...formData,
                duration: formData.days?.length || 0,
                createdAt: new Date().toISOString()
            });
            await notifyNewStudyPlan(formData.title || 'New Plan', formData.category || 'General');
            setIsModalOpen(false);
            fetchPlans();
            setFormData({ title: '', description: '', coverUrl: '', duration: 7, category: 'weekly', days: [] });
        } catch (e) {
            console.error(e);
            alert("Error saving study plan");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this plan?")) return;
        await deleteDoc(doc(db, 'study_plans', id));
        fetchPlans();
    };

    if (isModalOpen) {
        return (
            <div className="animate-fade-in-up space-y-8 pb-20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-gray-100 dark:border-white/5 pb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2.5 py-1 bg-church-green/10 text-church-green text-[9px] font-black uppercase tracking-widest rounded-lg border border-church-green/20">Divine Growth</span>
                        </div>
                        <h3 className="text-3xl sm:text-4xl font-black dark:text-white tracking-tighter uppercase leading-none">New Study Plan</h3>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(false)}
                        className="flex items-center justify-center gap-3 px-6 py-3 bg-gray-100 dark:bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-red-500 transition-all active:scale-95"
                    >
                        <X size={18} /> Discard & Return
                    </button>
                </div>

                <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-1 space-y-8">
                        <div className="glass-card rounded-[2.5rem] p-8 shadow-premium border-white/40 space-y-6">
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">General Metadata</p>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Plan Title</label>
                                <input placeholder="e.g. 7 Days of Grace" className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 dark:text-white outline-none focus:ring-4 focus:ring-church-green/10 text-base font-bold transition-all" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                                <select className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 dark:text-white outline-none focus:ring-4 focus:ring-church-green/10 text-base font-bold appearance-none transition-all" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as any })}>
                                    <option value="weekly">Weekly Plan</option>
                                    <option value="monthly">Monthly Journey</option>
                                    <option value="topical">Topical Deep-dive</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cover Image</label>
                                <div className="relative group">
                                    {formData.coverUrl ? (
                                        <div className="relative h-40 rounded-2xl overflow-hidden mb-4 border border-gray-100 dark:border-white/5">
                                            <img src={formData.coverUrl} className="w-full h-full object-cover" alt="Cover Preview" />
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, coverUrl: '' }))}
                                                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-xl shadow-lg hover:scale-110 transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl cursor-pointer hover:border-church-green/50 hover:bg-church-green/5 transition-all group">
                                            {uploading ? (
                                                <Loader2 className="animate-spin text-church-green" size={24} />
                                            ) : (
                                                <>
                                                    <UploadCloud size={24} className="text-gray-400 group-hover:text-church-green transition-colors mb-2" />
                                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Select Plan Cover</span>
                                                </>
                                            )}
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                                <textarea placeholder="Summarize the plan's spiritual goal..." className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 dark:text-white h-32 outline-none resize-none text-base font-medium transition-all" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
                            </div>

                            <button disabled={loading} className="w-full bg-church-green hover:bg-emerald-700 text-white font-black text-[11px] uppercase tracking-widest py-5 rounded-2xl shadow-xl shadow-church-green/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-70">
                                {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                {loading ? 'Publishing Plan...' : 'Finalize & Publish'}
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-xl font-black dark:text-white tracking-tighter uppercase">Plan Roadmap</h4>
                            <button type="button" onClick={handleAddDay} className="px-5 py-2.5 bg-church-gold hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-church-gold/20">
                                <Plus size={16} /> Append New Day
                            </button>
                        </div>

                        <div className="space-y-4">
                            {(formData.days || []).length === 0 && (
                                <div className="py-20 text-center glass-card rounded-[2.5rem] border-dashed border-2 border-gray-100 dark:border-white/5">
                                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em]">No modules added yet. Start your journey.</p>
                                </div>
                            )}

                            {(formData.days || []).map((day, idx) => (
                                <div key={idx} className="glass-card p-6 sm:p-8 rounded-[2rem] border-white/40 dark:border-white/5 shadow-sm space-y-6 animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                                    <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-4">
                                        <span className="px-3 py-1 bg-church-green text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-lg shadow-sm shadow-church-green/20">DAY {day.dayNumber}</span>
                                        <button type="button" onClick={() => {
                                            const newDays = [...(formData.days || [])];
                                            newDays.splice(idx, 1);
                                            newDays.forEach((d, i) => d.dayNumber = i + 1);
                                            setFormData({ ...formData, days: newDays });
                                        }} className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-90">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Lesson Topic</label>
                                            <input placeholder="Module Title" className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl outline-none dark:text-white text-base font-bold focus:border-church-green transition-all" value={day.title} onChange={e => {
                                                const newDays = [...(formData.days || [])];
                                                newDays[idx].title = e.target.value;
                                                setFormData({ ...formData, days: newDays });
                                            }} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Scripture Reference</label>
                                            <input placeholder="e.g. John 3:16" className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl outline-none dark:text-white text-base font-bold focus:border-church-green transition-all" value={day.passage} onChange={e => {
                                                const newDays = [...(formData.days || [])];
                                                newDays[idx].passage = e.target.value;
                                                setFormData({ ...formData, days: newDays });
                                            }} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Spiritual Content</label>
                                        <textarea
                                            placeholder="Enter the reflection or study material for this day..."
                                            className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl outline-none dark:text-white text-base font-medium resize-none focus:border-church-green transition-all h-32"
                                            value={day.content}
                                            onChange={e => {
                                                const newDays = [...(formData.days || [])];
                                                newDays[idx].content = e.target.value;
                                                setFormData({ ...formData, days: newDays });
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in-up pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black dark:text-white tracking-tighter uppercase leading-none">Curriculums</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Manage and publish spiritual growth roadmaps.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="group bg-church-green hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-church-green/20 transition-all active:scale-95">
                    <Plus size={20} /> Create New Plan
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {plans.length === 0 ? (
                    <div className="col-span-full py-24 text-center glass-card border-none rounded-[3rem]">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <BookOpen size={40} className="text-gray-300" />
                        </div>
                        <p className="text-gray-400 font-black uppercase text-xs tracking-[0.4em]">No study plans found</p>
                    </div>
                ) : (
                    plans.map(p => (
                        <div key={p.id} className="group glass-card p-6 md:p-8 rounded-[2.5rem] border-white/40 dark:border-white/5 shadow-premium hover:-translate-y-2 transition-all duration-500 flex flex-col items-start gap-6">
                            <div className="flex justify-between items-start w-full">
                                <div className="w-12 h-12 rounded-2xl bg-church-green/10 text-church-green flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <BookOpen size={24} />
                                </div>
                                <button onClick={() => handleDelete(p.id)} className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-90 shadow-sm border border-red-500/10">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="flex-1">
                                <h4 className="text-2xl font-black dark:text-white tracking-tight leading-none mb-2">{p.title}</h4>
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black text-church-gold uppercase tracking-widest">{p.category}</span>
                                    <div className="w-1 h-1 bg-gray-300 dark:bg-white/10 rounded-full"></div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{p.duration} Modules</span>
                                </div>
                            </div>

                            <div className="w-full pt-6 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Active Curriculum</span>
                                <div className="flex -space-x-2">
                                    <div className="w-7 h-7 rounded-full border-4 border-white dark:border-gray-800 bg-church-green shadow-sm"></div>
                                    <div className="w-7 h-7 rounded-full border-4 border-white dark:border-gray-800 bg-church-gold shadow-sm"></div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
