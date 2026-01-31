import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Sparkles } from 'lucide-react';
import { createNotification, sendBrowserNotification } from '../utils/notificationService';

interface Reaction {
    id: string;
    emoji: string;
    displayName?: string;
    createdAt: any;
}

interface LivePulseProps {
    uid: string;
    displayName?: string;
}

export const LivePulse: React.FC<LivePulseProps> = ({ uid, displayName }) => {
    const [activeReactions, setActiveReactions] = useState<{
        id: string;
        emoji: string;
        displayName?: string;
        x: number;
        scale: number;
        rotation: number;
        delay: number;
        duration: number;
    }[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);

    // Emoji map for display
    const emojiMap: Record<string, string> = {
        'heart': '❤️',
        'fire': '🔥',
        'star': '⭐',
        'pray': '🙏'
    };

    useEffect(() => {
        const q = query(
            collection(db, 'global_reactions'),
            orderBy('createdAt', 'desc'),
            limit(15)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const now = Date.now();
                    const created = data.createdAt?.toMillis() || now;

                    // Show if created within last 3 seconds
                    if (now - created < 3000) {
                        const id = change.doc.id;
                        const emoji = data.emoji;
                        const senderName = data.displayName || 'Someone';
                        const senderUid = data.uid;

                        // Dynamic properties
                        const x = Math.floor(Math.random() * 80) + 10; // 10% to 90%
                        const scale = 0.5 + Math.random() * 1.5; // 0.5 to 2.0
                        const rotation = Math.floor(Math.random() * 60) - 30; // -30 to 30 deg
                        const delay = Math.random() * 0.5;
                        const duration = 3 + Math.random() * 2; // 3 to 5 seconds

                        setActiveReactions(prev => {
                            if (prev.find(r => r.id === id)) return prev;
                            const newArr = [...prev, {
                                id,
                                emoji,
                                displayName: senderName,
                                x,
                                scale,
                                rotation,
                                delay,
                                duration
                            }];
                            return newArr.slice(-30);
                        });

                        setTimeout(() => {
                            setActiveReactions(prev => prev.filter(r => r.id !== id));
                        }, 5000);
                    }
                }
            });
        }, (err) => console.error("Snapshot error:", err));

        return () => unsubscribe();
    }, [uid]);

    const sendReaction = async (emoji: string) => {
        try {
            const senderName = displayName || 'Member';

            // Optimistic update for sender
            const tempId = Math.random().toString(36);
            const x = Math.floor(Math.random() * 80) + 10;
            const scale = 0.8 + Math.random() * 1.2;
            const rotation = Math.floor(Math.random() * 40) - 20;
            const delay = 0;
            const duration = 4;

            setActiveReactions(prev => [...prev, {
                id: tempId,
                emoji,
                displayName: senderName,
                x,
                scale,
                rotation,
                delay,
                duration
            }]);

            setTimeout(() => {
                setActiveReactions(prev => prev.filter(r => r.id !== tempId));
            }, 5000);

            await addDoc(collection(db, 'global_reactions'), {
                emoji,
                uid,
                displayName: senderName,
                createdAt: serverTimestamp()
            });

            // Create Firestore notification for all users
            await createNotification({
                title: `${emojiMap[emoji] || '💫'} Reaction from ${senderName}`,
                message: `${senderName} reacted with ${emojiMap[emoji] || emoji}`,
                type: 'info'
            });

            // Haptic/Visual feedback
            if ('vibrate' in navigator) navigator.vibrate(10);
        } catch (e) {
            console.error("Reaction fail", e);
        }
    };

    return (
        <div className="fixed inset-0 pointer-events-none z-[2000] overflow-hidden">
            {/* Floating Emoji Reactions */}
            {activeReactions.map((r) => (
                <div
                    key={r.id}
                    className="fixed animate-dynamic-float opacity-0 pointer-events-none flex flex-col items-center gap-2"
                    style={{
                        left: `${r.x}%`,
                        bottom: '-10%', // Start off-screen at bottom
                        animationDelay: `${r.delay}s`,
                        animationDuration: `${r.duration}s`,
                        transform: `scale(${r.scale}) rotate(${r.rotation}deg)`
                    } as any}
                >
                    {/* Emoji with Glow */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-white/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="text-5xl md:text-7xl drop-shadow-premium animate-wiggle select-none">
                            {emojiMap[r.emoji] || r.emoji || '💫'}
                        </div>
                    </div>

                    {/* Sender Name Badge - Floating with emoji */}
                    {r.displayName && (
                        <div className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow-2xl animate-fade-in">
                            <span className="text-[10px] font-black text-white whitespace-nowrap tracking-wider uppercase">
                                {r.displayName}
                            </span>
                        </div>
                    )}
                </div>
            ))}

            {/* Control Buttons - Horizontal Pill */}
            <div className="fixed bottom-6 right-6 flex items-center gap-2 pointer-events-auto z-[2001]">
                <div className={`flex items-center gap-2 md:gap-3 bg-white/10 dark:bg-black/40 backdrop-blur-3xl border border-white/20 p-2 md:p-3 rounded-[2.5rem] transition-all duration-700 shadow-premium ${isExpanded ? 'translate-x-0 opacity-100 scale-100 rotate-0' : 'translate-x-20 opacity-0 pointer-events-none scale-50 rotate-12'
                    }`}>
                    {[
                        { emoji: '❤️', key: 'heart', gradient: 'from-rose-500 to-pink-600', label: 'Love' },
                        { emoji: '🔥', key: 'fire', gradient: 'from-orange-500 to-red-600', label: 'Fire' },
                        { emoji: '⭐', key: 'star', gradient: 'from-amber-400 to-yellow-600', label: 'Star' },
                        { emoji: '🙏', key: 'pray', gradient: 'from-sky-500 to-indigo-600', label: 'Pray' },
                    ].map((btn) => (
                        <button
                            key={btn.key}
                            onClick={() => sendReaction(btn.key)}
                            className={`group relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-2xl md:text-3xl transition-all active:scale-75 hover:scale-110 bg-gradient-to-br ${btn.gradient} shadow-lg hover:shadow-2xl border-2 border-white/30 hover:border-white/60`}
                            title={`Send ${btn.label}`}
                        >
                            <span className="group-hover:animate-bounce-short">{btn.emoji}</span>
                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-[8px] font-black uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                {btn.label}
                            </span>
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`group w-14 h-14 md:w-16 md:h-16 rounded-full shadow-premium transition-all duration-500 active:scale-90 flex items-center justify-center border-2 border-white/40 z-10 ${isExpanded
                        ? 'bg-gradient-to-br from-gray-800 to-black text-white rotate-180 scale-110 border-white/60'
                        : 'bg-gradient-to-br from-church-green to-emerald-700 text-white hover:scale-105 hover:shadow-church-green/40'
                        }`}
                >
                    {isExpanded ? (
                        <X size={28} className="drop-shadow-lg" />
                    ) : (
                        <Sparkles size={28} className="drop-shadow-lg animate-pulse" />
                    )}
                </button>
            </div>

            <style>{`
                @keyframes dynamic-float {
                    0% {
                        transform: translateY(0) scale(0) rotate(0deg);
                        opacity: 0;
                    }
                    10% {
                        transform: translateY(-10vh) scale(1) rotate(var(--r, 0deg));
                        opacity: 1;
                    }
                    80% {
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(-110vh) scale(1.2) rotate(calc(var(--r, 0deg) * 2));
                        opacity: 0;
                    }
                }

                @keyframes wiggle {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-10px) rotate(-5deg); }
                    75% { transform: translateX(10px) rotate(5deg); }
                }

                @keyframes bounce-short {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }

                .animate-dynamic-float {
                    animation: dynamic-float linear forwards;
                }

                .animate-wiggle {
                    animation: wiggle 2s ease-in-out infinite;
                }

                .animate-bounce-short {
                    animation: bounce-short 0.5s ease-in-out infinite;
                }

                .drop-shadow-premium {
                    filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.3));
                }
            `}</style>
        </div>
    );
};
