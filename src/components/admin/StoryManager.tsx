import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Story } from '../../types';
import { Plus, Trash2, Clock, Image as ImageIcon, Type, Video, X, Send } from 'lucide-react';
import { PageHeader, LoadingSpinner } from '../UIComponents';
import { notifyNewStory } from '../../utils/notificationService';

const StoryManager: React.FC = () => {
    const [stories, setStories] = useState<Story[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newStory, setNewStory] = useState({
        type: 'text' as 'text' | 'image' | 'video',
        content: '',
        authorName: 'Admin'
    });

    useEffect(() => {
        const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Story[];
            setStories(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStory.content.trim()) return;

        try {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

            await addDoc(collection(db, 'stories'), {
                ...newStory,
                uid: 'admin',
                createdAt: serverTimestamp(),
                expiresAt: expiresAt
            });

            await notifyNewStory(newStory.authorName, newStory.type);

            setNewStory({ type: 'text', content: '', authorName: 'Admin' });
            setIsCreating(false);
        } catch (error) {
            console.error("Error creating story:", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this story?')) return;
        try {
            await deleteDoc(doc(db, 'stories', id));
        } catch (error) {
            console.error("Error deleting story:", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <PageHeader
                    title="Community Stories"
                    subtitle="Manage daily devotionals and visual updates."
                />
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-church-green text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all active:scale-95"
                >
                    <Plus size={18} /> New Story
                </button>
            </div>

            {isCreating && (
                <div className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2.5rem] p-8 shadow-premium border border-white/10 animate-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black dark:text-white uppercase tracking-tight">Post New Story</h3>
                            <button onClick={() => setIsCreating(false)} className="p-2 text-gray-400 hover:text-black dark:hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-6">
                            <div className="flex gap-2">
                                {[
                                    { id: 'text', icon: <Type size={18} />, label: 'Text' },
                                    { id: 'image', icon: <ImageIcon size={18} />, label: 'Image' },
                                    { id: 'video', icon: <Video size={18} />, label: 'Video' }
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setNewStory({ ...newStory, type: t.id as any })}
                                        className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${newStory.type === t.id
                                            ? 'border-church-green bg-church-green/5 text-church-green'
                                            : 'border-gray-100 dark:border-white/5 text-gray-400'
                                            }`}
                                    >
                                        {t.icon}
                                        <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">
                                    {newStory.type === 'text' ? 'What\'s the word?' : 'Media URL'}
                                </label>
                                {newStory.type === 'text' ? (
                                    <textarea
                                        required
                                        value={newStory.content}
                                        onChange={(e) => setNewStory({ ...newStory, content: e.target.value })}
                                        placeholder="Type your devotional message..."
                                        className="w-full bg-gray-50 dark:bg-white/5 border-none p-5 rounded-3xl outline-none font-medium text-gray-800 dark:text-white focus:ring-2 focus:ring-church-gold/20 h-32 resize-none"
                                    />
                                ) : (
                                    <input
                                        required
                                        type="url"
                                        value={newStory.content}
                                        onChange={(e) => setNewStory({ ...newStory, content: e.target.value })}
                                        placeholder="https://images.unsplash.com/..."
                                        className="w-full bg-gray-50 dark:bg-white/5 border-none p-5 rounded-3xl outline-none font-medium text-gray-800 dark:text-white focus:ring-2 focus:ring-church-gold/20"
                                    />
                                )}
                            </div>

                            <button
                                type="submit"
                                className="w-full py-5 bg-church-gold text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-amber-600 transition-all flex items-center justify-center gap-3 active:scale-95"
                            >
                                <Send size={18} /> Publish to Community
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center p-20"><LoadingSpinner /></div>
            ) : stories.length === 0 ? (
                <div className="text-center p-20 glass-card rounded-[2.5rem] opacity-50">
                    <ImageIcon size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="font-black uppercase tracking-widest">No active stories</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stories.map(story => (
                        <div key={story.id} className="glass-card rounded-[2rem] overflow-hidden group border-white/10">
                            <div className="aspect-[9/10] bg-gray-100 dark:bg-white/5 relative flex items-center justify-center">
                                {story.type === 'image' ? (
                                    <img src={story.content} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                                ) : story.type === 'video' ? (
                                    <div className="flex flex-col items-center gap-2 opacity-40">
                                        <Video size={40} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Video Content</span>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center font-serif italic text-lg opacity-60">"{story.content}"</div>
                                )}

                                <div className="absolute top-4 left-4">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white ${story.type === 'image' ? 'bg-blue-500' : story.type === 'video' ? 'bg-purple-500' : 'bg-church-gold'
                                        }`}>
                                        {story.type}
                                    </span>
                                </div>

                                <button
                                    onClick={() => handleDelete(story.id)}
                                    className="absolute bottom-4 right-4 p-3 bg-red-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 shadow-lg"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            <div className="p-5 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Clock size={14} />
                                    <span className="text-[10px] font-bold uppercase">Expires in 24h</span>
                                </div>
                                <span className="text-[10px] font-black text-church-green uppercase tracking-widest">Active</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StoryManager;
