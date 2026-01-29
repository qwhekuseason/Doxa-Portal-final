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
    const [activeReactions, setActiveReactions] = useState<{ id: string; emoji: string; displayName?: string; x: number }[]>([]);
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
                        // Better random range for mobile (15-85%)
                        const x = Math.floor(Math.random() * 70) + 15;

                        setActiveReactions(prev => {
                            if (prev.find(r => r.id === id)) return prev;
                            const newArr = [...prev, { id, emoji, displayName: senderName, x }];
                            return newArr.slice(-20);
                        });

                        // Send browser notification if it's not from current user
                        if (senderUid !== uid) {
                            sendBrowserNotification(
                                `${emojiMap[emoji] || '💫'} New Reaction!`,
                                `${senderName} reacted with ${emojiMap[emoji] || emoji}`
                            );
                        }

                        setTimeout(() => {
                            setActiveReactions(prev => prev.filter(r => r.id !== id));
                        }, 3000);
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
            const x = Math.floor(Math.random() * 70) + 15;
            setActiveReactions(prev => [...prev, { id: tempId, emoji, displayName: senderName, x }]);
            setTimeout(() => {
                setActiveReactions(prev => prev.filter(r => r.id !== tempId));
            }, 3000);

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
            {/* Floating Emoji Reactions - Always at top of viewport */}
            {activeReactions.map((r) => (
                <div
                    key={r.id}
                    className="fixed animate-float-up-viewport opacity-0 pointer-events-none flex flex-col items-center gap-1.5"
                    style={{
                        left: `${r.x}%`,
                        top: '20%', // Start from top of viewport
                    }}
                >
                    {/* Real Emoji */}
                    <div className="text-5xl md:text-6xl drop-shadow-2xl animate-wiggle">
                        {emojiMap[r.emoji] || '💫'}
                    </div>
                    {/* Sender Name Badge */}
                    {r.displayName && (
                        <div className="bg-black/90 backdrop-blur-lg px-3 py-1 rounded-full border border-white/30 shadow-xl">
                            <span className="text-[11px] font-black text-white whitespace-nowrap tracking-wide">
                                {r.displayName}
                            </span>
                        </div>
                    )}
                </div>
            ))}

            {/* Control Buttons - Horizontal Pill */}
            <div className="fixed bottom-6 right-6 flex items-center gap-2 pointer-events-auto z-[2001]">
                <div className={`flex items-center gap-2 md:gap-3 bg-black/95 dark:bg-[#0a0a0a] backdrop-blur-2xl border border-white/30 p-2 md:p-2.5 rounded-full transition-all duration-500 shadow-2xl ${isExpanded ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-10 opacity-0 pointer-events-none scale-90'
                    }`}>
                    {[
                        { emoji: '❤️', key: 'heart', gradient: 'from-red-500 to-pink-500' },
                        { emoji: '🔥', key: 'fire', gradient: 'from-orange-500 to-red-500' },
                        { emoji: '⭐', key: 'star', gradient: 'from-yellow-400 to-orange-400' },
                        { emoji: '🙏', key: 'pray', gradient: 'from-blue-500 to-purple-500' },
                    ].map((btn) => (
                        <button
                            key={btn.key}
                            onClick={() => sendReaction(btn.key)}
                            className={`w-12 h-12 md:w-13 md:h-13 rounded-full flex items-center justify-center text-2xl md:text-3xl transition-all active:scale-75 hover:scale-125 bg-gradient-to-br ${btn.gradient} shadow-lg hover:shadow-2xl ring-2 ring-white/20 hover:ring-white/40`}
                            title={`Send ${btn.emoji}`}
                        >
                            {btn.emoji}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`w-14 h-14 md:w-16 md:h-16 rounded-full shadow-2xl transition-all active:scale-90 flex items-center justify-center border-2 border-white/30 z-10 ${isExpanded ? 'bg-gradient-to-br from-red-500 to-pink-500 text-white rotate-90 scale-110' : 'bg-gradient-to-br from-church-gold to-yellow-500 text-white shadow-church-gold/50 hover:scale-105'
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
                @keyframes float-up-viewport {
                    0% {
                        transform: translateY(0) scale(0.8);
                        opacity: 0;
                    }
                    10% {
                        opacity: 1;
                    }
                    50% {
                        transform: translateY(-30vh) scale(1.1);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(-60vh) scale(0.9);
                        opacity: 0;
                    }
                }

                @keyframes wiggle {
                    0%, 100% { transform: rotate(-5deg); }
                    50% { transform: rotate(5deg); }
                }

                .animate-float-up-viewport {
                    animation: float-up-viewport 3s ease-out forwards;
                }

                .animate-wiggle {
                    animation: wiggle 0.3s ease-in-out 2;
                }
            `}</style>
        </div>
    );
};
