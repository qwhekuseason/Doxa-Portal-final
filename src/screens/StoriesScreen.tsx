import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Story, UserProfile } from '../types';
import { Plus, Trash2, Clock, Image as ImageIcon, Type, X, Send, Camera, Sparkles, Upload, Loader } from 'lucide-react';
import { PageHeader, LoadingSpinner } from '../components/UIComponents';

interface StoriesScreenProps {
    user: UserProfile;
}

const StoriesScreen: React.FC<StoriesScreenProps> = ({ user }) => {
    const [stories, setStories] = useState<Story[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [newStory, setNewStory] = useState({
        type: 'text' as 'text' | 'image',
        content: '',
    });

    useEffect(() => {
        const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const now = new Date();
            const data = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((s: any) => s.expiresAt && s.expiresAt.toDate() > now) as Story[];
            setStories(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Function to compress and convert image to Base64
    const processImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Max dimensions for Firestore Base64 (to keep it under 1MB)
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    // Compress to 0.7 quality to save space
                    const base64 = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(base64);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        setProcessing(true);
        try {
            const base64 = await processImage(file);
            setImagePreview(base64);
            setNewStory({ ...newStory, content: base64 });
        } catch (error) {
            console.error('Error processing image:', error);
            alert('Failed to process image');
        } finally {
            setProcessing(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newStory.content.trim()) {
            alert('Please add content to your story');
            return;
        }

        setProcessing(true);
        try {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

            await addDoc(collection(db, 'stories'), {
                type: newStory.type,
                content: newStory.content,
                uid: user.uid,
                authorName: user.displayName || 'Member',
                createdAt: serverTimestamp(),
                expiresAt: expiresAt
            });

            resetForm();
        } catch (error) {
            console.error("Error creating story:", error);
            alert('Failed to create story. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (story: Story) => {
        if (story.uid !== user.uid && user.role !== 'admin') {
            alert('You can only delete your own stories!');
            return;
        }

        if (!window.confirm('Delete this story?')) return;

        try {
            await deleteDoc(doc(db, 'stories', story.id));
        } catch (error) {
            console.error("Error deleting story:", error);
            alert('Failed to delete story. Please try again.');
        }
    };

    const resetForm = () => {
        setNewStory({ type: 'text', content: '' });
        setImagePreview(null);
        setIsCreating(false);
        setProcessing(false);
    };

    return (
        <div className="min-h-screen p-4 md:p-8 animate-fade-in">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <PageHeader
                            title="Community Stories"
                            subtitle="Share your faith moments with the community. Everything is saved directly to the portal."
                        />
                    </div>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-church-gold to-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:shadow-2xl hover:scale-105 transition-all active:scale-95 group"
                    >
                        <Camera size={20} className="group-hover:rotate-12 transition-transform" />
                        Share Your Story
                    </button>
                </div>

                {/* Create Story Modal */}
                {isCreating && (
                    <div className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2.5rem] p-8 shadow-premium border border-white/10 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-church-gold/10 flex items-center justify-center">
                                        <Sparkles size={20} className="text-church-gold" />
                                    </div>
                                    <h3 className="text-xl font-black dark:text-white uppercase tracking-tight">Share Your Story</h3>
                                </div>
                                <button onClick={resetForm} className="p-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors" disabled={processing}>
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleCreate} className="space-y-6">
                                {/* Story Type Selector */}
                                <div className="flex gap-3">
                                    {[
                                        { id: 'text', icon: <Type size={18} />, label: 'Text', desc: 'Share a thought' },
                                        { id: 'image', icon: <ImageIcon size={18} />, label: 'Image', desc: 'Upload a photo' },
                                    ].map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => {
                                                setNewStory({ ...newStory, type: t.id as any, content: '' });
                                                setImagePreview(null);
                                            }}
                                            disabled={processing}
                                            className={`flex-1 flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${newStory.type === t.id
                                                ? 'border-church-green bg-church-green/10 text-church-green scale-105'
                                                : 'border-gray-100 dark:border-white/5 text-gray-400 hover:border-gray-200'
                                                } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {t.icon}
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest">{t.label}</p>
                                                <p className="text-[8px] font-medium opacity-60">{t.desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {/* Content Input */}
                                <div className="space-y-2">
                                    {newStory.type === 'text' ? (
                                        <>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">
                                                Your Message
                                            </label>
                                            <textarea
                                                required
                                                value={newStory.content}
                                                onChange={(e) => setNewStory({ ...newStory, content: e.target.value })}
                                                placeholder="Share your faith moment, testimony, or encouragement..."
                                                className="w-full bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-church-green/30 p-5 rounded-3xl outline-none font-medium text-gray-800 dark:text-white h-40 resize-none transition-all"
                                                maxLength={500}
                                                disabled={processing}
                                            />
                                            <p className="text-[9px] text-gray-400 font-bold ml-4">
                                                {newStory.content.length}/500 characters
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">
                                                Pick an Image
                                            </label>

                                            {imagePreview && (
                                                <div className="relative rounded-2xl overflow-hidden border-2 border-church-green/30">
                                                    <img src={imagePreview} alt="Preview" className="w-full h-64 object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setImagePreview(null);
                                                            setNewStory({ ...newStory, content: '' });
                                                        }}
                                                        disabled={processing}
                                                        className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-lg"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            )}

                                            <label className={`w-full min-h-[120px] bg-gray-50 dark:bg-white/5 border-2 border-dashed ${imagePreview ? 'border-church-green' : 'border-gray-200 dark:border-white/10'} hover:border-church-green/50 p-8 rounded-3xl cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleFileSelect}
                                                    className="hidden"
                                                    disabled={processing}
                                                />
                                                <div className="w-12 h-12 rounded-full bg-church-gold/10 flex items-center justify-center group-hover:bg-church-gold/20 transition-colors">
                                                    <Upload size={24} className="text-church-gold" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                                                        {imagePreview ? 'Change Image' : 'Pick Image'}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-1">Images stay in Firestore</p>
                                                </div>
                                            </label>
                                        </>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing || !newStory.content.trim()}
                                    className="w-full py-5 bg-gradient-to-r from-church-gold to-orange-500 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing ? (
                                        <>
                                            <Loader size={18} className="animate-spin" /> Working...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} /> Publish Story
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-[9px] text-gray-400 font-medium">
                                    Your story will be visible for 24 hours
                                </p>
                            </form>
                        </div>
                    </div>
                )}

                {/* Stories Grid */}
                {loading ? (
                    <div className="flex justify-center p-20">
                        <LoadingSpinner />
                    </div>
                ) : stories.length === 0 ? (
                    <div className="text-center p-20 glass-card rounded-[2.5rem] opacity-50">
                        <Camera size={64} className="mx-auto mb-6 text-gray-300 dark:text-gray-600" />
                        <h3 className="font-black uppercase tracking-widest text-xl mb-2 dark:text-white">No Stories Yet</h3>
                        <p className="text-gray-400 font-medium mb-6">Be the first to share your faith story!</p>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="px-8 py-3 bg-church-gold text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all"
                        >
                            Create First Story
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {stories.map(story => {
                            const isOwnStory = story.uid === user.uid;
                            const canDelete = isOwnStory || user.role === 'admin';

                            return (
                                <div key={story.id} className="glass-card rounded-[1.5rem] overflow-hidden group border-white/10 hover:border-church-green/30 transition-all hover:scale-105 hover:shadow-2xl">
                                    <div className="aspect-[9/16] bg-gray-100 dark:bg-white/5 relative flex items-center justify-center">
                                        {story.type === 'image' ? (
                                            <img
                                                src={story.content}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                alt=""
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="p-4 text-center font-serif italic text-sm dark:text-white/80 line-clamp-6">
                                                "{story.content}"
                                            </div>
                                        )}

                                        {/* Author Badge */}
                                        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                                            <div className="w-5 h-5 rounded-full bg-church-gold flex items-center justify-center text-[9px] font-black text-white">
                                                {story.authorName[0]}
                                            </div>
                                            <span className="text-[9px] font-black text-white uppercase tracking-wide">
                                                {story.authorName.split(' ')[0]}
                                            </span>
                                        </div>

                                        {/* Delete Button */}
                                        {canDelete && (
                                            <button
                                                onClick={() => handleDelete(story)}
                                                className="absolute bottom-3 right-3 p-2 bg-red-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 active:scale-90"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}

                                        {/* Type Badge */}
                                        <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest text-white ${story.type === 'image' ? 'bg-blue-500' : 'bg-church-gold'}`}>
                                                {story.type}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="p-3 flex items-center justify-between bg-white/50 dark:bg-black/20">
                                        <div className="flex items-center gap-1.5 text-gray-500">
                                            <Clock size={12} />
                                            <span className="text-[9px] font-bold uppercase">24h</span>
                                        </div>
                                        {isOwnStory && (
                                            <span className="text-[8px] font-black text-church-green uppercase tracking-widest">You</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StoriesScreen;
