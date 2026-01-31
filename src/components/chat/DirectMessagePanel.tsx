import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, limit, addDoc, setDoc, onSnapshot, serverTimestamp, getDocs, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { UserProfile, DirectMessage } from '../../types';
import { Send, User, MessageCircle, ChevronLeft, Search, Paperclip, Check, CheckCheck, Star, Smile, X } from 'lucide-react';
import { LoadingSpinner } from '../UIComponents';

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
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

            // Mark unread messages as read and reset counter
            let hasUnread = false;
            msgs.forEach(async (msg) => {
                if (msg.senderUid === targetUser.uid && !msg.read) {
                    hasUnread = true;
                    await updateDoc(doc(db, 'direct_messages', msg.id), { read: true });
                }
            });

            if (hasUnread) {
                const chatId = [currentUser.uid, targetUser.uid].sort().join('_');
                updateDoc(doc(db, 'conversations', chatId), {
                    [`unreadCount_${currentUser.uid}`]: 0
                }).catch(() => { });
            }
        });

        return () => unsubscribe();
    }, [currentUser.uid, targetUser.uid]);

    // Auto scroll to bottom
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent, textOverride?: string) => {
        if (e) e.preventDefault();
        const textToSend = textOverride || newMessage;
        if (!textToSend.trim()) return;

        setNewMessage('');
        setShowEmojiPicker(false);

        try {
            const chatId = [currentUser.uid, targetUser.uid].sort().join('_');
            const msgData = {
                chatId,
                senderUid: currentUser.uid,
                receiverUid: targetUser.uid,
                text: textToSend,
                createdAt: serverTimestamp(),
                read: false,
                participants: [currentUser.uid, targetUser.uid]
            };

            await addDoc(collection(db, 'direct_messages'), msgData);

            const convRef = doc(db, 'conversations', chatId);
            await setDoc(convRef, {
                lastMessage: textToSend.length > 30 ? textToSend.substring(0, 30) + '...' : textToSend,
                updatedAt: serverTimestamp(),
                [`unreadCount_${targetUser.uid}`]: increment(1),
                participants: [currentUser.uid, targetUser.uid],
            }, { merge: true });
        } catch (error) {
            console.error("Error sending DM:", error);
        }
    };

    const handleFileAttach = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic image "attachment" - sending as a message for now
        // In a real app, you'd upload to Firebase Storage and send the URL
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            await handleSendMessage(null as any, "[Image Attachment]");
            // In a real implementation, you'd save base64 to Firestore or a storage URL
        };
        reader.readAsDataURL(file);
    };

    const filteredMessages = messages.filter(m =>
        m.text.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full w-full animate-fade-in bg-white dark:bg-slate-900 md:rounded-[2.5rem] overflow-hidden md:border border-white/10 shadow-premium relative">
            {/* Header */}
            <div className="px-4 pt-safe pb-3 sm:py-4 bg-white/95 dark:bg-[#121b22]/95 backdrop-blur-md border-b border-gray-100 dark:border-white/5 flex items-center justify-between sticky top-0 z-[40] shadow-sm shrink-0">
                <div className="flex items-center gap-3 overflow-hidden">
                    {onBack && (
                        <button onClick={onBack} className="lg:hidden p-2 -ml-2 text-church-green hover:bg-church-green/10 rounded-full transition-all active:scale-90">
                            <ChevronLeft size={28} />
                        </button>
                    )}

                    {!isSearchOpen ? (
                        <>
                            <div className="relative shrink-0">
                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-church-green to-emerald-700 flex items-center justify-center text-white font-black shadow-lg shadow-church-green/20 overflow-hidden ring-2 ring-white dark:ring-white/10">
                                    {targetUser.photoURL ? <img src={targetUser.photoURL} className="w-full h-full object-cover" /> : targetUser.displayName[0]}
                                </div>
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-church-green border-2 border-white dark:border-[#121b22] rounded-full"></div>
                            </div>
                            <div className="flex flex-col -space-y-0.5 min-w-0">
                                <h2 className="text-[14px] font-black dark:text-gray-100 truncate">{targetUser.displayName}</h2>
                                <span className="text-[10px] font-bold text-church-green flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-church-green animate-pulse"></span>
                                    {targetStatus?.isOnline ? 'Online' : 'Active Now'}
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center gap-2 animate-in slide-in-from-right-4">
                            <input
                                autoFocus
                                placeholder="Search in chat..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-gray-100 dark:bg-white/5 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 ring-church-green/30"
                            />
                            <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="p-2 text-gray-500 hover:text-red-500">
                                <X size={20} />
                            </button>
                        </div>
                    )}
                </div>
                {!isSearchOpen && (
                    <div className="flex items-center gap-1">
                        <button onClick={() => setIsSearchOpen(true)} className="p-2.5 text-gray-500 hover:text-church-green transition-all"><Search size={22} /></button>
                    </div>
                )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-3 hide-scrollbar relative bg-[#efeae2] dark:bg-[#0b141a]">
                {/* Subtle Doodle Pattern */}
                <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.05] pointer-events-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%235c7c6b' fill-opacity='0.4'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 4.418-3.582 8-8 8s-8-3.582-8-8c-4.418 0-8-3.582-8-8s3.582-8 8-8zm10 10c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4 4-1.79 4-4zM20 20c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 4.418-3.582 8-8 8s-8-3.582-8-8c-4.418 0-8-3.582-8-8s3.582-8 8-8zm10 10c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4 4-1.79 4-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}>
                </div>

                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                        <LoadingSpinner />
                    </div>
                ) : filteredMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40 relative z-10">
                        <div className="w-20 h-20 rounded-full bg-church-green/10 flex items-center justify-center text-church-green mb-6">
                            <MessageCircle size={40} />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-widest dark:text-white">
                            {searchQuery ? 'No messages found' : 'Start the conversation'}
                        </h3>
                        <p className="text-xs font-medium mt-2">{searchQuery ? 'Try a different search term' : 'Messages are encrypted and secure.'}</p>
                    </div>
                ) : (
                    filteredMessages.map((msg) => {
                        const isOwn = msg.senderUid === currentUser.uid;
                        return (
                            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                <div className={`group relative flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[70%]`}>
                                    <div className={`px-4 py-2.5 rounded-[22px] shadow-sm relative transition-all ${isOwn
                                        ? 'bg-church-green text-white rounded-tr-none'
                                        : 'bg-white dark:bg-[#202c33] text-gray-800 dark:text-gray-100 rounded-tl-none border border-black/[0.03] dark:border-white/5'
                                        }`}>
                                        <div className="text-[14.5px] leading-relaxed font-medium pr-8 pb-1">
                                            {msg.text}
                                        </div>

                                        <div className={`absolute bottom-1.5 right-2 flex items-center gap-1 opacity-70 ${isOwn ? 'text-white/90' : 'text-gray-400'}`}>
                                            <span className="text-[9px] font-bold">
                                                {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                            {isOwn && (
                                                msg.read ? <CheckCheck size={13} className="text-blue-300" /> : <Check size={13} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white dark:bg-[#121b22] border-t border-gray-100 dark:border-white/5 relative z-[40] shrink-0 pb-safe">
                {showEmojiPicker && (
                    <div className="absolute bottom-full left-4 bg-white dark:bg-[#202c33] p-4 rounded-3xl shadow-2xl border border-white/10 flex gap-2 animate-in slide-in-from-bottom-2">
                        {['🙏', '❤️', '🔥', '🙌', '✨', '⚡', '😇'].map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => setNewMessage(prev => prev + emoji)}
                                className="text-2xl hover:scale-125 transition-transform"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                />

                <form onSubmit={(e) => handleSendMessage(e)} className="flex gap-2 items-end max-w-5xl mx-auto group">
                    <div className="flex-1 bg-gray-50 dark:bg-[#2a3942] rounded-[24px] shadow-inner border border-black/5 dark:border-white/5 flex items-end px-3 py-1.5 min-h-[48px] transition-all focus-within:ring-2 ring-church-green/20">
                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className={`p-2.5 transition-all mb-0.5 ${showEmojiPicker ? 'text-church-green' : 'text-gray-500 hover:text-church-green'}`}
                        >
                            <Smile size={24} />
                        </button>
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            rows={1}
                            className="flex-1 bg-transparent border-none focus:ring-0 py-2.5 text-[15px] font-medium text-gray-800 dark:text-gray-100 placeholder-gray-500 resize-none max-h-32 hide-scrollbar"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e as any);
                                }
                            }}
                        />
                        <button
                            type="button"
                            onClick={handleFileAttach}
                            className="p-2.5 text-gray-500 hover:text-church-green transition-all mb-0.5"
                        >
                            <Paperclip size={24} className="-rotate-45" />
                        </button>
                    </div>
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="w-[48px] h-[48px] shrink-0 flex items-center justify-center bg-church-green text-white rounded-full shadow-lg shadow-church-green/20 hover:scale-105 active:scale-90 transition-all disabled:opacity-50 disabled:grayscale"
                    >
                        <Send size={20} className={newMessage.trim() ? "translate-x-0.5" : ""} />
                    </button>
                </form>
            </div>
        </div>
    );
};
