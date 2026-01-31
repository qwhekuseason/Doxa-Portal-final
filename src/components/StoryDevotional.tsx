import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Story } from '../types';
import { X, ChevronLeft, ChevronRight, Play, Volume2, VolumeX, MessageCircle } from 'lucide-react';

export const StoryDevotional: React.FC<{
    onMessageUser?: (target: { uid: string, displayName: string, photoURL?: string }) => void,
    onStateChange?: (isActive: boolean) => void
}> = ({ onMessageUser, onStateChange }) => {
    const [stories, setStories] = useState<Story[]>([]);
    const [activeStoryIdx, setActiveStoryIdx] = useState<number | null>(null);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // We remove the 'where' clause to avoid requiring a composite index immediately.
        // We will filter expired stories in memory.
        const q = query(
            collection(db, 'stories'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const now = new Date();
            const data = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((s: any) => s.expiresAt && s.expiresAt.toDate() > now) as Story[];

            setStories(data);
        }, (err) => {
            console.error("Story snapshot error:", err);
        });

        return () => unsubscribe();
    }, []);

    // Timer for auto-advance
    useEffect(() => {
        if (activeStoryIdx === null) return;

        setProgress(0);
        const duration = 5000; // 5 seconds per story
        const interval = 50;
        const step = (interval / duration) * 100;

        const timer = setInterval(() => {
            setProgress(p => {
                if (p >= 100) {
                    handleNext();
                    return 0;
                }
                return p + step;
            });
        }, interval);

        return () => clearInterval(timer);
    }, [activeStoryIdx]);

    useEffect(() => {
        onStateChange?.(activeStoryIdx !== null);
    }, [activeStoryIdx, onStateChange]);

    const handleNext = () => {
        if (activeStoryIdx !== null && activeStoryIdx < stories.length - 1) {
            setActiveStoryIdx(activeStoryIdx + 1);
        } else {
            setActiveStoryIdx(null);
        }
    };

    const handlePrev = () => {
        if (activeStoryIdx !== null && activeStoryIdx > 0) {
            setActiveStoryIdx(activeStoryIdx - 1);
        }
    };

    if (stories.length === 0) return null;

    return (
        <div className="mb-4 space-y-4">
            <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Faith Moments</span>
                <span className="w-1.5 h-1.5 rounded-full bg-church-green animate-pulse"></span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                {stories.map((story, idx) => (
                    <div
                        key={story.id}
                        onClick={() => setActiveStoryIdx(idx)}
                        className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group"
                    >
                        <div className="w-16 h-16 rounded-full p-1 bg-gradient-to-tr from-church-gold to-orange-500 group-active:scale-95 transition-transform">
                            <div className="w-full h-full rounded-full border-2 border-white dark:border-black overflow-hidden bg-gray-200">
                                {story.type === 'text' ? (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-900 text-[8px] font-black text-white p-2 text-center uppercase">
                                        {story.content.substring(0, 20)}...
                                    </div>
                                ) : (
                                    <img src={story.content} className="w-full h-full object-cover" alt="" />
                                )}
                            </div>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-church-green transition-colors">
                            {story.authorName.split(' ')[0]}
                        </span>
                    </div>
                ))}
            </div>

            {/* Fullscreen Overlay */}
            {activeStoryIdx !== null && (
                <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center animate-in zoom-in duration-300">
                    <div className="relative w-full max-w-lg aspect-[9/16] bg-gray-900 shadow-2xl overflow-hidden md:rounded-3xl">

                        {/* Progress Bar */}
                        <div className="absolute top-4 left-4 right-4 z-20 flex gap-1">
                            {stories.map((_, i) => (
                                <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-white transition-all linear"
                                        style={{ width: i < activeStoryIdx ? '100%' : i === activeStoryIdx ? `${progress}%` : '0%' }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Story Content */}
                        <div className="w-full h-full flex items-center justify-center p-8">
                            {stories[activeStoryIdx].type === 'text' ? (
                                <div className="text-center font-serif text-2xl italic text-white leading-relaxed">
                                    "{stories[activeStoryIdx].content}"
                                </div>
                            ) : (
                                <img src={stories[activeStoryIdx].content} className="w-full h-full object-contain" alt="" />
                            )}
                        </div>

                        {/* Top Info */}
                        <div className="absolute top-8 left-6 right-6 z-20 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-church-gold flex items-center justify-center text-[10px] font-black text-white">
                                    {stories[activeStoryIdx].authorName[0]}
                                </div>
                                <div>
                                    <p className="text-xs font-black text-white uppercase tracking-tight">{stories[activeStoryIdx].authorName}</p>
                                    <p className="text-[9px] text-white/60 font-medium">Daily Devotional</p>
                                </div>
                            </div>
                            <button onClick={() => setActiveStoryIdx(null)} className="p-2 text-white/80 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Navigation Areas */}
                        <div className="absolute inset-0 z-10 flex">
                            <div className="w-1/3 h-full cursor-pointer" onClick={handlePrev}></div>
                            <div className="w-2/3 h-full cursor-pointer" onClick={handleNext}></div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="absolute bottom-10 left-0 right-0 z-20 px-8 text-center">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const story = stories[activeStoryIdx];
                                    onMessageUser?.({ uid: story.uid, displayName: story.authorName });
                                    setActiveStoryIdx(null);
                                }}
                                className="px-10 py-3.5 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 mx-auto"
                            >
                                <MessageCircle size={14} /> Send a Message
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
