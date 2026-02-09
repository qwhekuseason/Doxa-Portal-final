import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, ChatMessage } from '../types';
import { LoadingSpinner } from '../components/UIComponents';
import { Send, Users, ChevronLeft, Search, Smile, Paperclip, Bot, Sparkles } from 'lucide-react';
import { generateAIResponse, isAIMention, extractMessageWithoutMention } from '../utils/aiService';
import { notifyChatMessage } from '../utils/notificationService';

interface GroupChatScreenProps {
    user: UserProfile;
    onBack?: () => void;
    onUserClick?: (target: { uid: string, displayName: string, photoURL?: string }) => void;
}

// Common emojis for quick access
const QUICK_EMOJIS = ['😊', '🙏', '❤️', '🔥', '✨', '👏', '🎉', '💪', '🙌', '✝️', '📖', '⛪'];

const GroupChatScreen: React.FC<GroupChatScreenProps> = ({ user, onBack, onUserClick }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [aiProcessing, setAiProcessing] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const q = query(
            collection(db, 'community_chats'),
            orderBy('createdAt', 'asc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ChatMessage[];
            setMessages(msgs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching community chat:", error);
            setError("Connection failed. Attempting to reconnect...");
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const sentText = newMessage;
        setNewMessage('');
        setShowEmojiPicker(false);

        try {
            // Send user message
            await addDoc(collection(db, 'community_chats'), {
                uid: user.uid,
                displayName: user.displayName,
                photoURL: user.photoURL,
                text: sentText,
                createdAt: serverTimestamp()
            });

            // Send notification
            await notifyChatMessage(user.displayName, sentText);

            // Check if AI was mentioned
            if (isAIMention(sentText)) {
                setAiProcessing(true);

                // Extract message without mention
                let cleanMessage = extractMessageWithoutMention(sentText);
                if (!cleanMessage) cleanMessage = "Hello";

                // Get recent context
                const recentMessages = messages.slice(-5).map(m => `${m.displayName}: ${m.text}`);

                // Generate AI response
                const aiResponse = await generateAIResponse(cleanMessage, user.displayName, recentMessages);

                // Send AI response
                await addDoc(collection(db, 'community_chats'), {
                    uid: 'doxa-ai',
                    displayName: 'Doxa AI',
                    photoURL: null,
                    text: aiResponse.text,
                    createdAt: serverTimestamp(),
                    isAI: true
                });

                setAiProcessing(false);
            }
        } catch (error) {
            console.error("Error sending community message:", error);
            setAiProcessing(false);
        }
    };

    const insertEmoji = (emoji: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = newMessage;
        const before = text.substring(0, start);
        const after = text.substring(end);

        setNewMessage(before + emoji + after);

        // Set cursor position after emoji
        setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
            textarea.focus();
        }, 0);
    };

    return (
        <div className="flex flex-col h-full w-full animate-fade-in relative bg-white dark:bg-[#121b22] lg:bg-transparent overflow-hidden lg:rounded-[2.5rem] lg:border lg:border-white/10 lg:shadow-premium">
            {/* Header */}
            <div className="px-4 pt-safe pb-3 sm:py-4 bg-white/95 dark:bg-[#121b22]/95 backdrop-blur-md border-b border-gray-100 dark:border-white/5 flex items-center justify-between sticky top-0 z-[40] shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button onClick={onBack} className="lg:hidden p-2 -ml-2 text-church-green hover:bg-church-green/10 rounded-full transition-all active:scale-90">
                            <ChevronLeft size={28} />
                        </button>
                    )}
                    <div className="relative">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-church-green/10 to-emerald-500/10 flex items-center justify-center text-church-green font-black overflow-hidden ring-2 ring-church-green/20">
                            <Users size={20} />
                        </div>
                    </div>
                    <div className="flex flex-col -space-y-0.5">
                        <h2 className="text-[14px] font-black dark:text-gray-100 tracking-tight">Community Hub</h2>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">
                            {aiProcessing ? '🤖 AI typing...' : 'Global Family'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button className="p-2.5 text-gray-500 hover:text-church-green transition-all"><Search size={22} /></button>
                </div>
            </div>

            {/* AI Helper Banner */}
            <div className="px-4 py-2 bg-gradient-to-r from-purple-500/5 to-blue-500/5 border-b border-purple-500/10 dark:border-purple-500/20">
                <div className="flex items-center gap-2 text-[11px]">
                    <Bot size={14} className="text-purple-500" />
                    <span className="text-gray-600 dark:text-gray-400 font-medium">
                        Mention <span className="font-black text-purple-500">@Doxa</span> or <span className="font-black text-purple-500">@AI</span> to chat with our AI assistant!
                    </span>
                    <Sparkles size={12} className="text-purple-500 animate-pulse" />
                </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 hide-scrollbar relative bg-[#efeae2] dark:bg-[#0b141a]">
                <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.04] pointer-events-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%235c7c6b' fill-opacity='0.4'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 4.418-3.582 8-8 8s-8-3.582-8-8c-4.418 0-8-3.582-8-8s3.582-8 8-8zm10 10c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4 4-1.79 4-4zM20 20c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 4.418-3.582 8-8 8s-8-3.582-8-8c-4.418 0-8-3.582-8-8s3.582-8 8-8zm10 10c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4 4-1.79 4-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}>
                </div>

                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="bg-white/80 dark:bg-black/80 px-4 py-2 rounded-full backdrop-blur-sm shadow-sm">
                            <LoadingSpinner />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-x-0 top-0 p-2 z-10">
                        <div className="bg-red-500/90 text-white px-4 py-2 rounded-xl shadow-lg backdrop-blur-sm text-center text-xs font-bold flex items-center justify-center gap-2">
                            <span>⚠️ {error}</span>
                        </div>
                    </div>
                )}

                {messages.map((msg, index) => {
                    const isOwn = msg.uid === user.uid;
                    const isAI = (msg as any).isAI || msg.uid === 'doxa-ai';
                    const showHeader = index === 0 || messages[index - 1].uid !== msg.uid;

                    return (
                        <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} gap-1 max-w-[90%] sm:max-w-[75%] ${isOwn ? 'ml-auto' : 'mr-auto'}`}>
                            {showHeader && !isOwn && (
                                <button
                                    onClick={() => !isAI && onUserClick?.({ uid: msg.uid, displayName: msg.displayName, photoURL: msg.photoURL })}
                                    className="flex items-center gap-2 mb-1 group px-1"
                                    disabled={isAI}
                                >
                                    <div className={`w-6 h-6 rounded-full overflow-hidden border ${isAI ? 'border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-blue-500/20' : 'border-white/10'}`}>
                                        {isAI ? (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Bot size={14} className="text-purple-500" />
                                            </div>
                                        ) : msg.photoURL ? (
                                            <img src={msg.photoURL} alt="" />
                                        ) : (
                                            <div className="w-full h-full bg-church-green/20 flex items-center justify-center text-[8px] font-black text-church-green">{msg.displayName[0]}</div>
                                        )}
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isAI ? 'text-purple-500' : 'text-gray-500 group-hover:text-church-green'} transition-colors`}>
                                        {msg.displayName} {isAI && '✨'}
                                    </span>
                                </button>
                            )}

                            <div className={`px-4 py-2.5 rounded-[20px] shadow-sm relative shadow-black/5 ${isOwn
                                ? 'bg-church-green text-white rounded-tr-none'
                                : isAI
                                    ? 'bg-gradient-to-br from-purple-500/10 to-blue-500/10 dark:from-purple-500/20 dark:to-blue-500/20 text-gray-800 dark:text-white rounded-tl-none ring-1 ring-purple-500/20'
                                    : 'bg-white dark:bg-[#202c33] text-gray-800 dark:text-white rounded-tl-none ring-1 ring-black/[0.03] dark:ring-white/[0.05]'
                                }`}>
                                <div className="text-[14px] leading-relaxed font-medium pr-8 pb-1">
                                    {msg.text}
                                </div>
                                <div className={`absolute bottom-1.5 right-2 flex items-center gap-1 opacity-70 ${isOwn ? 'text-white/80' : isAI ? 'text-purple-500' : 'text-gray-400'}`}>
                                    {isAI && <Sparkles size={8} />}
                                    <span className="text-[9px] font-bold">
                                        {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white dark:bg-[#121b22] border-t border-gray-100 dark:border-white/5 relative z-[40] shrink-0 pb-safe">
                {/* Emoji Picker */}
                {showEmojiPicker && (
                    <div className="absolute bottom-full left-4 right-4 mb-2 p-3 bg-white dark:bg-[#2a3942] rounded-2xl shadow-premium border border-gray-100 dark:border-white/10 animate-in fade-in zoom-in-95">
                        <div className="grid grid-cols-6 gap-2">
                            {QUICK_EMOJIS.map((emoji, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => insertEmoji(emoji)}
                                    className="text-2xl p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all active:scale-90"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSendMessage} className="flex gap-2 items-end max-w-5xl mx-auto group">
                    <div className="flex-1 bg-gray-50 dark:bg-[#2a3942] rounded-[24px] shadow-inner border border-black/5 dark:border-white/5 flex items-end px-3 py-1.5 min-h-[48px] transition-all focus-within:ring-2 ring-church-green/20">
                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className={`p-2.5 transition-all mb-0.5 ${showEmojiPicker ? 'text-church-green' : 'text-gray-500 hover:text-church-green'}`}
                        >
                            <Smile size={24} />
                        </button>
                        <textarea
                            ref={textareaRef}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Message Community... (use @Doxa for AI)"
                            rows={1}
                            className="flex-1 bg-transparent border-none focus:ring-0 py-2.5 text-[15px] font-medium text-gray-800 dark:text-gray-100 placeholder-gray-500 resize-none max-h-32 hide-scrollbar"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e as any);
                                }
                            }}
                        />
                        <button type="button" className="p-2.5 text-gray-500 hover:text-church-green transition-all mb-0.5">
                            <Paperclip size={24} className="-rotate-45" />
                        </button>
                    </div>
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || aiProcessing}
                        className="w-[48px] h-[48px] shrink-0 flex items-center justify-center bg-church-green text-white rounded-full shadow-lg shadow-church-green/20 hover:scale-105 active:scale-90 transition-all disabled:opacity-50 disabled:grayscale"
                    >
                        <Send size={20} className={newMessage.trim() ? "translate-x-0.5" : ""} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default GroupChatScreen;
