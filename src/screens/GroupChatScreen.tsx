import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, ChatMessage } from '../types';
import { Send, User, MessageCircle, Shield, Sparkles } from 'lucide-react';
import { LoadingSpinner, SectionHeader } from '../components/UIComponents';

interface GroupChatScreenProps {
    user: UserProfile;
}

const GroupChatScreen: React.FC<GroupChatScreenProps> = ({ user }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const q = query(
            collection(db, 'messages'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ChatMessage[];
            setMessages(msgs.reverse());
            setLoading(false);
            scrollToBottom();
        });

        return () => unsubscribe();
    }, []);

    const scrollToBottom = () => {
        setTimeout(() => {
            scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const text = newMessage;
            setNewMessage(''); // optimistic clear

            await addDoc(collection(db, 'messages'), {
                text,
                uid: user.uid,
                displayName: user.displayName,
                photoURL: user.photoURL || null,
                role: user.role,
                createdAt: serverTimestamp()
            });
            scrollToBottom();
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    // Play sound on new message
    useEffect(() => {
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.uid !== user.uid) {
                const playNotification = async () => {
                    try {
                        const audio = new Audio('/sounds/notification.mp3');
                        await audio.play();
                    } catch (e) {
                        // Fallback to a simple Web Audio beep if file is missing
                        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                        const osc = context.createOscillator();
                        const gain = context.createGain();
                        osc.connect(gain);
                        gain.connect(context.destination);
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(880, context.currentTime);
                        gain.gain.setValueAtTime(0.1, context.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);
                        osc.start();
                        osc.stop(context.currentTime + 0.2);
                    }
                };
                playNotification();
            }
        }
    }, [messages, user.uid]);

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col relative animate-fade-in">
            <div className="mb-4 shrink-0">
                <SectionHeader
                    title="Community Chat"
                    subtitle="Connect with the family in real-time."
                />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4 hide-scrollbar min-h-0 relative z-10 p-2">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <LoadingSpinner />
                    </div>
                )}

                {!loading && messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                        <div className="p-4 bg-white/5 rounded-full mb-3">
                            <MessageCircle size={32} className="text-church-gold" />
                        </div>
                        <p className="text-sm font-bold uppercase tracking-widest">Start the conversation</p>
                    </div>
                )}

                {messages.map((msg, index) => {
                    const isOwn = msg.uid === user.uid;
                    const showAvatar = index === 0 || messages[index - 1].uid !== msg.uid; // Simple logic, can be improved

                    return (
                        <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end group`}>
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10 shadow-sm ${!showAvatar ? 'opacity-0' : ''}`}>
                                {msg.photoURL ? (
                                    <img src={msg.photoURL} alt={msg.displayName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white text-[10px] font-black">
                                        {msg.displayName?.[0] || 'U'}
                                    </div>
                                )}
                            </div>

                            {/* Message Bubble */}
                            <div className={`max-w-[75%] relative`}>
                                {!isOwn && showAvatar && (
                                    <div className="flex items-center gap-2 mb-1 ml-1">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{msg.displayName}</span>
                                        {msg.role === 'admin' && <Shield size={10} className="text-church-gold" />}
                                    </div>
                                )}

                                <div className={`px-5 py-3 rounded-2xl text-sm font-medium shadow-sm leading-relaxed ${isOwn
                                    ? 'bg-gradient-to-br from-church-green to-emerald-700 text-white rounded-br-none'
                                    : 'bg-white dark:bg-white/10 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-white/5 rounded-bl-none'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="shrink-0 relative z-20">
                <form onSubmit={handleSendMessage} className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-church-gold to-orange-500 rounded-2xl opacity-0 group-focus-within:opacity-20 transition-opacity blur-lg"></div>
                    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-slate-800/60 p-2 rounded-2xl shadow-premium flex items-center gap-2">
                        <input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-3 text-sm font-medium text-gray-800 dark:text-white placeholder-gray-400 min-w-0"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="p-3 bg-church-green text-white rounded-xl shadow-lg shadow-church-green/20 hover:scale-105 active:scale-90 transition-all disabled:opacity-50 disabled:scale-100"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GroupChatScreen;
