
import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, MessageSquare, Loader2 } from 'lucide-react';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { generateAIResponse } from '../utils/aiService';
import { UserProfile, CalendarEvent } from '../types';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: any;
}

interface DoxaAIProps {
    user: UserProfile | null;
}

export const DoxaAI: React.FC<DoxaAIProps> = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [aiContextData, setAiContextData] = useState<any>(null);
    const lastFetchRef = useRef<number>(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Load messages from Firestore
    useEffect(() => {
        if (!user?.uid) return;

        const q = query(
            collection(db, 'ai_conversations'),
            where('uid', '==', user.uid),
            orderBy('createdAt', 'asc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty && messages.length === 0) {
                // Initial welcome message if no history
                setMessages([
                    {
                        id: 'welcome',
                        text: `Hi ${user.displayName.split(' ')[0]}! I'm Doxa AI. How can I assist you today with your spiritual journey or family activities? 🙏`,
                        sender: 'ai',
                        timestamp: new Date()
                    }
                ]);
            } else {
                const history = snapshot.docs.map(doc => ({
                    id: doc.id,
                    text: doc.data().text,
                    sender: doc.data().sender,
                    timestamp: doc.data().createdAt?.toDate() || new Date()
                })) as Message[];

                // Sort client-side to avoid composite index requirement
                history.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

                // If history is empty after fetching (unlikely due to first block but safe)
                if (history.length === 0) {
                    setMessages([
                        {
                            id: 'welcome',
                            text: `Hi ${user.displayName.split(' ')[0]}! I'm Doxa AI. How can I assist you today with your spiritual journey or family activities? 🙏`,
                            sender: 'ai',
                            timestamp: new Date()
                        }
                    ]);
                } else {
                    setMessages(history);
                }
            }
        }, (error) => {
            console.error("🔥 [Doxa AI] Snapshot error:", error);
            if (error.code === 'permission-denied') {
                setMessages([{
                    id: 'error-perm',
                    text: "I don't have permission to access your chat history. Please contact an administrator. 🔒",
                    sender: 'ai',
                    timestamp: new Date()
                }]);
            } else if (error.message.includes('requires an index')) {
                setMessages([{
                    id: 'error-index',
                    text: "The chat system needs an index to display your history. Please open your Browser Console (F12) and click the provided Firebase link to create it! It takes about 2 minutes to activate. 🚀",
                    sender: 'ai',
                    timestamp: new Date()
                }]);
            } else {
                setMessages([{
                    id: 'error-general',
                    text: `Chat sync failed: ${error.message}. Please refresh.`,
                    sender: 'ai',
                    timestamp: new Date()
                }]);
            }
        });

        return () => unsubscribe();
    }, [user?.uid]);

    // Fetch dynamic context (events, birthdays)
    const refreshAIContext = async () => {
        if (!user) return;

        // Caching: If we have data and fetched in the last 5 minutes, skip
        const nowMs = Date.now();
        if (aiContextData && (nowMs - lastFetchRef.current < 5 * 60 * 1000)) {
            console.log("💾 [Doxa AI] Using cached context");
            return;
        }

        try {
            // 1. Upcoming Events - Use same format as EventManager for consistent comparison
            const tzoffset = (new Date()).getTimezoneOffset() * 60000;
            const now = new Date(Date.now() - tzoffset).toISOString().slice(0, 16);

            const eventSnap = await getDocs(query(collection(db, 'events'), where('date', '>=', now), limit(10)));
            const events = eventSnap.docs.map(d => ({
                title: d.data().title,
                date: d.data().date,
                type: d.data().type,
                location: d.data().location || 'Family Portal'
            }));

            // 2. Birthdays (Current month and next month)
            // Optimization: Only fetch a subset of users or use a dedicated birthday field if possible
            // For now, we'll limit to 100 recent users to avoid crashing on large databases
            const userSnap = await getDocs(query(collection(db, 'users'), limit(100)));
            const today = new Date();
            const currentMonth = today.getMonth() + 1;
            const nextMonth = (currentMonth % 12) + 1;

            const upcomingBirthdays = userSnap.docs
                .map(d => d.data())
                .filter(u => {
                    if (!u.dateOfBirth) return false;
                    try {
                        const dob = new Date(u.dateOfBirth);
                        if (isNaN(dob.getTime())) return false;
                        const month = dob.getMonth() + 1;
                        return month === currentMonth || month === nextMonth;
                    } catch { return false; }
                })
                .map(u => ({
                    name: u.displayName,
                    birthday: u.dateOfBirth
                }))
                .slice(0, 15);

            const newContext = {
                upcomingEvents: events,
                upcomingBirthdays,
                userRole: user.role,
                currentDate: new Date().toLocaleDateString(),
                currentTime: new Date().toLocaleTimeString()
            };

            setAiContextData(newContext);
            lastFetchRef.current = Date.now();
            console.log("📊 [Doxa AI] Context refreshed:", newContext);
        } catch (err) {
            console.error("❌ [Doxa AI] Failed to fetch context:", err);
        }
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            // Only refresh context if it's been more than 5 minutes or haven't fetched yet
            refreshAIContext();
        }
    }, [isOpen]); // Removed messages dependency to avoid excessive fetching

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || isLoading || !user?.uid) return;

        const userText = inputText;
        setInputText('');
        setIsLoading(true);

        try {
            console.log("🚀 [Doxa AI] Getting response for:", userText);
            // 1. Save User Message to Firestore
            await addDoc(collection(db, 'ai_conversations'), {
                uid: user.uid,
                text: userText,
                sender: 'user',
                createdAt: serverTimestamp()
            });

            // 2. Get AI Response
            console.log("📡 [Doxa AI] Calling AI service...");
            const context = messages.slice(-5).map(m => `${m.sender === 'user' ? 'User' : 'AI'}: ${m.text}`);
            const response = await generateAIResponse(userText, user.displayName, context, aiContextData);
            console.log("✅ [Doxa AI] Response received!");

            // 3. Save AI Response to Firestore
            console.log("✨ [Doxa AI] Saving response to history...");
            await addDoc(collection(db, 'ai_conversations'), {
                uid: user.uid,
                text: response.text,
                sender: 'ai',
                createdAt: serverTimestamp()
            });
            console.log("🎉 [Doxa AI] Process complete.");

        } catch (error) {
            console.error('💥 [Doxa AI] Failed to get response:', error);
            // We don't save error messages to Firestore
            const errorMsg: Message = {
                id: 'error-' + Date.now(),
                text: "I'm having trouble connecting right now. Please try again later. 😔",
                sender: 'ai',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Floating Action Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-24 right-5 md:bottom-28 md:right-8 z-[1000] group flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 animate-fade-in ring-4 ring-white/10"
                >
                    <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse"></div>
                    <Bot size={28} className="relative z-10 drop-shadow-lg" />
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        Ask AI
                    </span>
                </button>
            )}

            {/* Chat Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-[2001] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Chat Window */}
                    <div className="glass-morphic w-full sm:w-[400px] h-[85vh] sm:h-[600px] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col pointer-events-auto overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 relative border border-white/20 dark:border-white/10">
                        {/* Header */}
                        <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
                                    <Bot size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-black text-white text-lg tracking-tight flex items-center gap-2">
                                        Doxa AI <Sparkles size={14} className="text-yellow-300 animate-pulse" />
                                    </h3>
                                    <p className="text-purple-100 text-xs font-medium">Your spiritual assistant</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent custom-scrollbar">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}
                                >
                                    <div className={`
                    max-w-[85%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed shadow-sm
                    ${msg.sender === 'user'
                                            ? 'bg-purple-600 text-white rounded-tr-none'
                                            : 'bg-white dark:bg-[#202c33] text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-white/5'
                                        }
                  `}>
                                        {msg.text}
                                        <div className={`text-[9px] mt-1 font-bold opacity-60 ${msg.sender === 'user' ? 'text-purple-200 text-right' : 'text-gray-400'}`}>
                                            {msg.timestamp instanceof Date ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex justify-start animate-in fade-in">
                                    <div className="bg-white dark:bg-[#202c33] px-4 py-3 rounded-2xl rounded-tl-none border border-gray-100 dark:border-white/5 flex items-center gap-2">
                                        <Loader2 size={16} className="animate-spin text-purple-600" />
                                        <span className="text-xs text-gray-500 font-medium">Thinking...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white/20 dark:bg-black/20 backdrop-blur-md border-t border-white/10 dark:border-white/5 shrink-0">
                            <form
                                onSubmit={handleSendMessage}
                                className="flex items-end gap-2 bg-gray-100 dark:bg-[#2a3942] p-1.5 rounded-[24px] border border-transparent focus-within:border-purple-500/30 focus-within:ring-2 focus-within:ring-purple-500/10 transition-all"
                            >
                                <div className="pl-3 py-2 flex items-center justify-center text-gray-400">
                                    <MessageSquare size={20} />
                                </div>
                                <textarea
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Ask anything..."
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-[16px] max-h-32 min-h-[44px] py-2.5 px-2 text-gray-800 dark:text-gray-100 placeholder-gray-500 resize-none leading-relaxed"
                                    rows={1}
                                />
                                <button
                                    type="submit"
                                    disabled={!inputText.trim() || isLoading}
                                    className="w-11 h-11 shrink-0 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:bg-gray-400 text-white rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-purple-600/20"
                                >
                                    <Send size={18} className={inputText.trim() ? 'translate-x-0.5' : ''} />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
