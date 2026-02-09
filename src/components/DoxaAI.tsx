
import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, MessageSquare, Loader2 } from 'lucide-react';
import { generateAIResponse } from '../utils/aiService';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

export const DoxaAI: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            text: "Hi! I'm Doxa AI. How can I assist you today with your spiritual journey or church activities? 🙏",
            sender: 'ai',
            timestamp: new Date()
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: inputText,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsLoading(true);

        try {
            // Get recent context (last 5 messages) to provide continuity
            const context = messages.slice(-5).map(m => `${m.sender === 'user' ? 'User' : 'AI'}: ${m.text}`);

            const response = await generateAIResponse(userMsg.text, 'User', context);

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: response.text,
                sender: 'ai',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error('Failed to get AI response:', error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
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
                    <div className="bg-white dark:bg-[#121b22] w-full sm:w-[400px] h-[85vh] sm:h-[600px] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col pointer-events-auto overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 relative border border-white/10">
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
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-[#0b141a] custom-scrollbar">
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
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                        <div className="p-3 bg-white dark:bg-[#202c33] border-t border-gray-100 dark:border-white/5 shrink-0">
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
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] max-h-32 min-h-[44px] py-2.5 px-2 text-gray-800 dark:text-gray-100 placeholder-gray-500 resize-none leading-relaxed"
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
