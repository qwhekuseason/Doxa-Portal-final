import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ReadingPlan } from '../../types';
import { compressImage } from '../../utils/base64Helper';
import { X, Trash2, Wand2, UploadCloud, Save, Loader2, Target, Star, Plus } from 'lucide-react';

export const AdminReadingPlanManager: React.FC = () => {
    const [plans, setPlans] = useState<ReadingPlan[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [mode, setMode] = useState<'manual' | 'ai'>('manual');

    const [formData, setFormData] = useState<Partial<ReadingPlan>>({
        title: '',
        description: '',
        coverUrl: '',
        duration: 7,
        category: 'bible',
        difficulty: 'intermediate',
        days: []
    });

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        try {
            const base64 = await compressImage(file);
            setFormData(prev => ({ ...prev, coverUrl: base64 }));
        } catch (err) {
            console.error("Image processing failed", err);
            alert("Image processing failed.");
        } finally {
            setLoading(false);
        }
    };

    const fetchPlans = async () => {
        const q = query(collection(db, 'reading_plans'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as ReadingPlan)));
    };

    useEffect(() => { fetchPlans(); }, []);

    const handleGenerateAI = async () => {
        if (!formData.title) {
            alert("Please enter a topic or title for the AI to focus on.");
            return;
        }

        console.log("🚀 [Frontend AI] Starting generation for topic:", formData.title);
        setGenerating(true);

        try {
            console.log("📡 [Frontend AI] Calling API: /api/generateReadingPlan...");
            const resp = await fetch('/api/generateReadingPlan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: formData.title,
                    duration: formData.duration,
                    category: formData.category,
                    difficulty: formData.difficulty
                })
            });

            console.log("⏳ [Frontend AI] Waiting for server response (this can take 10-30 seconds)...");

            if (!resp.ok) {
                const errorText = await resp.text();
                const errorMsg = `API error ${resp.status}: ${errorText.substring(0, 100)}`;
                console.error("❌ [Frontend AI] Server error:", errorMsg);
                throw new Error(errorMsg);
            }

            const data = await resp.json();
            console.log("✅ [Frontend AI] Data received from server!");

            if (data.success && data.plan) {
                console.log("✨ [Frontend AI] Successfully parsed plan:", data.plan.title);
                setFormData(prev => ({
                    ...prev,
                    ...data.plan,
                    days: data.plan.days.map((d: any) => ({
                        dayNumber: d.dayNumber,
                        title: d.title,
                        description: d.description || '',
                        passages: d.passages || []
                    }))
                }));
                setMode('manual'); // Show the result in manual mode for editing
            }
        } catch (e) {
            console.error("💥 [Frontend AI] Generation failed:", e);
            alert("AI generation failed. Check the console for details.");
        } finally {
            console.log("🏁 [Frontend AI] Process finished.");
            setGenerating(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addDoc(collection(db, 'reading_plans'), {
                ...formData,
                createdAt: new Date().toISOString()
            });
            setIsModalOpen(false);
            fetchPlans();
            setFormData({ title: '', description: '', coverUrl: '', duration: 7, category: 'bible', difficulty: 'intermediate', days: [] });
        } catch (e) {
            console.error(e);
            alert("Error saving reading plan");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this plan?")) return;
        await deleteDoc(doc(db, 'reading_plans', id));
        fetchPlans();
    };

    const handleAddDay = () => {
        const newDay = {
            dayNumber: (formData.days?.length || 0) + 1,
            title: '',
            description: '',
            passages: []
        };
        setFormData({ ...formData, days: [...(formData.days || []), newDay] });
    };

    if (isModalOpen) {
        return (
            <div className="animate-fade-in-up space-y-8 pb-20">
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-8">
                    <h3 className="text-3xl font-black dark:text-white uppercase tracking-tighter">New Reading Plan</h3>
                    <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-gray-100 dark:bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-red-500 transition-all">
                        <X size={18} /> Discard
                    </button>
                </div>

                <div className="flex gap-4 mb-8 p-1 bg-gray-100 dark:bg-white/5 rounded-2xl">
                    <button onClick={() => setMode('manual')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${mode === 'manual' ? 'bg-white dark:bg-white/10 shadow-sm text-church-green' : 'text-gray-400'}`}>Manual Entry</button>
                    <button onClick={() => setMode('ai')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${mode === 'ai' ? 'bg-white dark:bg-white/10 shadow-sm text-church-gold' : 'text-gray-400'}`}><Wand2 size={16} /> AI Generate</button>
                </div>

                <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="space-y-6">
                        <div className="glass-card p-8 rounded-[2.5rem] space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{mode === 'ai' ? 'Topic for AI' : 'Plan Title'}</label>
                                <input placeholder="Ex: Overcoming Anxiety, Book of Acts..." className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 dark:text-white outline-none focus:ring-4 focus:ring-church-green/10 font-bold" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Days</label>
                                    <input type="number" min="1" max="365" className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 dark:text-white outline-none focus:ring-4 focus:ring-church-green/10 font-bold" value={formData.duration} onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Difficulty</label>
                                    <select className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 dark:text-white outline-none focus:ring-4 focus:ring-church-green/10 font-bold" value={formData.difficulty} onChange={e => setFormData({ ...formData, difficulty: e.target.value as any })}>
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                </div>
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
                                            <UploadCloud size={24} className="text-gray-400 group-hover:text-church-green transition-colors mb-2" />
                                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Select Plan Cover</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                                <select className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 dark:text-white outline-none focus:ring-4 focus:ring-church-green/10 font-bold" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as any })}>
                                    <option value="bible">Bible Study</option>
                                    <option value="devotional">Devotional</option>
                                    <option value="topical">Topical</option>
                                </select>
                            </div>

                            {mode === 'ai' ? (
                                <button type="button" onClick={handleGenerateAI} disabled={generating} className="w-full bg-church-gold text-white font-black text-[11px] uppercase tracking-widest py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50">
                                    {generating ? <Loader2 className="animate-spin" /> : <Wand2 size={20} />}
                                    Invoke AI Prophecy
                                </button>
                            ) : (
                                <button disabled={loading || (formData.days?.length || 0) === 0} className="w-full bg-church-green text-white font-black text-[11px] uppercase tracking-widest py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50">
                                    {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                    Save Reading Plan
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xl font-black dark:text-white tracking-tighter uppercase">Daily Roadmap</h4>
                            <button type="button" onClick={handleAddDay} className="px-5 py-2.5 bg-church-gold text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2">
                                <Plus size={16} /> Add Day
                            </button>
                        </div>

                        <div className="space-y-4">
                            {formData.days?.map((day, idx) => (
                                <div key={idx} className="glass-card p-6 rounded-[2rem] space-y-4">
                                    <div className="flex justify-between items-center border-b dark:border-white/5 pb-4">
                                        <span className="text-[10px] font-black uppercase text-church-green tracking-widest">Day {day.dayNumber}</span>
                                        <button type="button" onClick={() => {
                                            const newDays = [...(formData.days || [])];
                                            newDays.splice(idx, 1);
                                            newDays.forEach((d, i) => d.dayNumber = i + 1);
                                            setFormData({ ...formData, days: newDays });
                                        }} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all"><Trash2 size={16} /></button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input placeholder="Day Title" className="w-full p-4 bg-gray-50 dark:bg-white/5 border dark:border-white/10 rounded-2xl dark:text-white font-bold outline-none focus:border-church-green" value={day.title} onChange={e => {
                                            const newDays = [...(formData.days || [])];
                                            newDays[idx].title = e.target.value;
                                            setFormData({ ...formData, days: newDays });
                                        }} />
                                        <input placeholder="Passages (comma separated)" className="w-full p-4 bg-gray-50 dark:bg-white/5 border dark:border-white/10 rounded-2xl dark:text-white font-mono text-sm outline-none focus:border-church-green" value={day.passages.join(', ')} onChange={e => {
                                            const newDays = [...(formData.days || [])];
                                            newDays[idx].passages = e.target.value.split(',').map(s => s.trim());
                                            setFormData({ ...formData, days: newDays });
                                        }} />
                                    </div>
                                    <textarea placeholder="Reflection / Content" className="w-full p-4 bg-gray-50 dark:bg-white/5 border dark:border-white/10 rounded-2xl dark:text-white h-24 outline-none focus:border-church-green resize-none" value={day.description} onChange={e => {
                                        const newDays = [...(formData.days || [])];
                                        newDays[idx].description = e.target.value;
                                        setFormData({ ...formData, days: newDays });
                                    }} />
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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-black dark:text-white tracking-tighter uppercase">Reading Journeys</h1>
                    <p className="text-gray-500 font-medium">Manage and generate AI-driven spiritual journeys.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-church-green text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all">
                    <Plus size={20} /> New Plan
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map(p => (
                    <div key={p.id} className="glass-card p-8 rounded-[2.5rem] flex flex-col gap-6 group hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                        {p.coverUrl ? (
                            <div className="relative h-48 -mx-8 -mt-8 mb-2 overflow-hidden group/img">
                                <img src={p.coverUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" alt="" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                                    className="absolute top-4 right-4 p-2.5 bg-red-500 text-white rounded-xl shadow-lg opacity-0 group-hover/img:opacity-100 transition-all hover:scale-110 active:scale-90"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 bg-church-green/10 text-church-green rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Target size={24} />
                                </div>
                                <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all"><Trash2 size={18} /></button>
                            </div>
                        )}

                        <div className="flex-1">
                            <h3 className="text-2xl font-black dark:text-white tracking-tight leading-none mb-2">{p.title}</h3>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-church-gold uppercase tracking-widest">{p.category}</span>
                                <span className="text-gray-300">•</span>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{p.duration} Days</span>
                            </div>
                        </div>

                        <div className="pt-6 border-t dark:border-white/5 flex items-center justify-between">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{p.days.length} Daily Modules</span>
                            <div className="flex items-center gap-1">
                                <Star size={12} className="text-church-gold fill-church-gold" />
                                <span className="text-[10px] font-black dark:text-white uppercase">{p.difficulty}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
