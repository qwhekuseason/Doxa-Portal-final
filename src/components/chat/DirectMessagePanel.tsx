import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, limit, addDoc, onSnapshot, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { UserProfile, DirectMessage } from '../../types';
import { Send, ChevronLeft, Search, Paperclip, Check, CheckCheck, Star, Smile, MessageCircle } from 'lucide-react';
import { LoadingSpinner } from '../UIComponents';
import { notifyDirectMessage } from '../../utils/notificationService';

interface DirectMessagePanelProps {
    currentUser: UserProfile;
    targetUser: { uid: string; displayName: string; photoURL?: string };
    onBack?: () => void;
}

export const DirectMessagePanel: React.FC<DirectMessagePanelProps> = ({ currentUser, targetUser, onBack }) => {
    const [messages, setMessages] = useState<DirectMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [targetStatus, setTargetStatus] = useState<{ isOnline: boolean; lastActive?: any } | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch user status
    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'users', targetUser.uid), (doc) => {
            if (doc.exists()) {
                setTargetStatus(doc.data() as any);
            }
        });
        return () => unsubscribe();
    }, [targetUser.uid]);

    // Fetch messages
    useEffect(() => {
        const chatId = [currentUser.uid, targetUser.uid].sort().join('_');
        const q = query(
            collection(db, 'direct_messages'),
            where('participants', 'array-contains', currentUser.uid),
            where('chatId', '==', chatId),
            orderBy('createdAt', 'asc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DirectMessage[];
            setMessages(msgs);
            setLoading(false);

            // Mark unread messages as read
            msgs.forEach(async (msg) => {
                if (msg.senderUid === targetUser.uid && !msg.read) {
                    await updateDoc(doc(db, 'direct_messages', msg.id), { read: true });
                }
            });

            // Reset conversation unread count
            const chatRef = doc(db, 'conversations', chatId);
            updateDoc(chatRef, {
                [`unreadCount_${currentUser.uid}`]: 0
            }).catch(() => { });
        });

        return () => unsubscribe();
    }, [currentUser.uid, targetUser.uid]);

    // Auto scroll to bottom
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const text = newMessage;
        setNewMessage('');

        try {
            const chatId = [currentUser.uid, targetUser.uid].sort().join('_');
            const msgData = {
                chatId,
                senderUid: currentUser.uid,
                receiverUid: targetUser.uid,
                text: text,
                createdAt: serverTimestamp(),
                read: false,
                participants: [currentUser.uid, targetUser.uid]
            };

            await addDoc(collection(db, 'direct_messages'), msgData);
            await notifyDirectMessage(currentUser.uid, currentUser.displayName, text, targetUser.uid);
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden">
            {/* Header */}
            <div className="p-6 lg:p-8 flex items-center justify-between glass-header z-20">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="lg:hidden p-3 bg-gray-100 dark:bg-white/5 rounded-2xl text-gray-500 spring-interaction">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="relative group cursor-pointer shrink-0">
                        <img
                            src={targetUser.photoURL || `https://ui-avatars.com/api/?name=${targetUser.displayName}`}
                            className="w-14 h-14 rounded-2xl object-cover border-2 border-transparent group-hover:border-church-green transition-all"
                            alt=""
                        />
                        {targetStatus?.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-church-green border-4 border-white dark:border-black rounded-full shadow-[0_0_10px_#10b981]"></div>
                        )}
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">{targetUser.displayName}</h3>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${targetStatus?.isOnline ? 'bg-church-green animate-pulse' : 'bg-gray-400'}`}></span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                {targetStatus?.isOnline ? 'Online Now' : 'Offline'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-white/5 rounded-2xl text-gray-400 hover:text-church-green transition-all spring-interaction">
                        <Search size={20} />
                    </button>
                    <button className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-white/5 rounded-2xl text-gray-400 hover:text-church-gold transition-all spring-interaction">
                        <Star size={20} />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 hide-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <LoadingSpinner />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center opacity-30 select-none">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
                            <MessageCircle size={40} />
                        </div>
                        <p className="text-xs font-black uppercase tracking-[0.3em]">No messages yet</p>
                    </div>
                ) : (
                    messages.map((msg, i) => {
                        const isMe = msg.senderUid === currentUser.uid;
                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-page-enter`}
                                style={{ animationDelay: `${i * 20}ms` }}
                            >
                                <div className={`flex flex-col max-w-[85%] md:max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`p-5 rounded-[2rem] shadow-smooth text-sm font-medium transition-all ${isMe
                                        ? 'bg-church-green text-white rounded-br-none shadow-church-green/20'
                                        : 'glass-card text-gray-900 dark:text-white rounded-bl-none'
                                        }`}>
                                        {msg.text}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 px-1 text-[9px] font-black uppercase tracking-widest text-gray-400 opacity-60">
                                        {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                        {isMe && (
                                            msg.read ? (
                                                <CheckCheck size={12} className="text-church-green" />
                                            ) : (
                                                <Check size={12} />
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 lg:p-8 bg-transparent">
                <form
                    onSubmit={handleSendMessage}
                    className="glass-card flex items-center gap-4 p-3 !rounded-[2.5rem] !bg-white/60 dark:!bg-white/10"
                >
                    <button type="button" className="p-4 text-gray-400 hover:text-church-green transition-colors spring-interaction">
                        <Paperclip size={20} />
                    </button>
                    <input
                        type="text"
                        placeholder="Type your message..."
                        className="flex-1 bg-transparent border-none outline-none text-sm font-medium dark:text-white placeholder:text-gray-400"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <button type="button" className="p-4 text-gray-400 hover:text-church-gold transition-colors spring-interaction">
                        <Smile size={20} />
                    </button>
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className={`p-4 rounded-2xl transition-all spring-interaction ${newMessage.trim()
                            ? 'bg-church-green text-white shadow-lg shadow-church-green/30'
                            : 'bg-gray-100 dark:bg-white/5 text-gray-300'
                            }`}
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};
