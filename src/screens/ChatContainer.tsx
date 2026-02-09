import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Conversation } from '../types';
import { LoadingSpinner } from '../components/UIComponents';
import { MessageSquare, Users, Search, Hash, Shield, Star, ChevronLeft, Menu } from 'lucide-react';
import { DirectMessagePanel } from '../components/chat/DirectMessagePanel';
import GroupChatScreen from './GroupChatScreen';
import { useUnreadDMs } from '../hooks/useUnreadDMs';

interface ChatContainerProps {
    user: UserProfile;
    initialTarget?: { uid: string, displayName: string, photoURL?: string } | null;
    onClearTarget?: () => void;
    onStateChange?: (isActive: boolean) => void;
    onMenuToggle?: () => void;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ user, initialTarget, onClearTarget, onStateChange, onMenuToggle }) => {
    const [selectedUser, setSelectedUser] = useState<{ uid: string; displayName: string; photoURL?: string } | null>(null);
    const [communityActive, setCommunityActive] = useState(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'community' | 'direct'>('direct');
    const [userStatuses, setUserStatuses] = useState<Record<string, { isOnline: boolean; lastActive?: any }>>({});

    const unreadTotal = useUnreadDMs(user.uid);

    useEffect(() => {
        onStateChange?.(!!selectedUser || communityActive);
    }, [selectedUser, communityActive, onStateChange]);

    useEffect(() => {
        if (initialTarget) {
            setSelectedUser(initialTarget);
            setCommunityActive(false);
            setActiveTab('direct');
            onClearTarget?.();
        }
    }, [initialTarget, onClearTarget]);

    // Fetch conversations
    useEffect(() => {
        const q = query(
            collection(db, 'conversations'),
            where('participants', 'array-contains', user.uid),
            orderBy('updatedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const convs = snapshot.docs.map(doc => ({
                uid: doc.id.replace(user.uid, '').replace('_', ''),
                ...doc.data()
            })) as Conversation[];
            setConversations(convs);
        }, (error) => {
            console.error("Error fetching conversations:", error);
            setError("Connection failed");
        });

        return () => unsubscribe();
    }, [user.uid]);

    // Fetch all users for search
    useEffect(() => {
        const fetchUsers = async () => {
            setLoadingUsers(true);
            const q = query(collection(db, 'users'), limit(50));
            const snapshot = await getDocs(q);
            const userData = snapshot.docs
                .map(doc => doc.data() as UserProfile)
                .filter(u => u.uid !== user.uid);
            setUsers(userData);
            setLoadingUsers(false);
        };
        fetchUsers();
    }, [user.uid]);

    // Fetch user statuses
    useEffect(() => {
        if (conversations.length === 0) return;
        const uids = conversations.map(c => c.uid).slice(0, 30);
        if (uids.length === 0) return;

        const q = query(collection(db, 'users'), where('uid', 'in', uids));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const statuses: Record<string, any> = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                statuses[doc.id] = {
                    isOnline: data.isOnline || false,
                    lastActive: data.lastActive,
                    displayName: data.displayName,
                    photoURL: data.photoURL
                };
            });
            setUserStatuses(prev => ({ ...prev, ...statuses }));
        });
        return () => unsubscribe();
    }, [conversations]);

    const filteredUsers = users.filter(u =>
        u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col lg:flex-row h-full w-full animate-fade-in relative bg-white dark:bg-[#121b22] lg:bg-transparent overflow-hidden">
            {/* Sidebar / Chat List */}
            <div className={`w-full lg:w-96 shrink-0 flex flex-col h-full bg-white dark:bg-[#121b22] lg:bg-transparent ${(selectedUser || communityActive) ? 'hidden lg:flex' : 'flex'} overflow-hidden transition-all duration-500`}>
                {/* Mobile Dashboard Header */}
                <div className="lg:hidden sticky top-0 z-20 px-4 pt-safe pb-3 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-gray-100 dark:border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onMenuToggle}
                                className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 active:scale-90 transition-all text-gray-800 dark:text-white"
                            >
                                <Menu size={24} />
                            </button>
                            <h1 className="text-2xl font-black dark:text-white tracking-tighter">Messages</h1>
                        </div>
                        <button className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-white/5 rounded-full text-gray-500 active:scale-90 transition-all">
                            <Search size={20} />
                        </button>
                    </div>

                    <div className="flex p-1.5 bg-gray-100 dark:bg-white/5 rounded-2xl relative isolate">
                        <button
                            onClick={() => { setActiveTab('community'); setSelectedUser(null); setCommunityActive(true); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'community' ? 'bg-white dark:bg-white/10 text-church-green shadow-sm shadow-black/5 ring-1 ring-black/5 dark:ring-white/5' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            <Hash size={14} /> Community
                        </button>
                        <button
                            onClick={() => { setActiveTab('direct'); setCommunityActive(false); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative ${activeTab === 'direct' ? 'bg-white dark:bg-white/10 text-church-green shadow-sm shadow-black/5 ring-1 ring-black/5 dark:ring-white/5' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            <MessageSquare size={14} /> Private
                            {unreadTotal > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                        </button>
                    </div>
                </div>

                {/* Desktop Tabs */}
                <div className="hidden lg:flex flex-col gap-3 p-4 bg-white dark:bg-white/5 rounded-3xl mb-4 shadow-sm border border-gray-100 dark:border-white/5">
                    <button
                        onClick={() => { setActiveTab('community'); setSelectedUser(null); setCommunityActive(true); }}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${activeTab === 'community'
                            ? 'bg-church-green text-white shadow-xl shadow-church-green/20 scale-[1.02]'
                            : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500'}`}
                    >
                        <Hash size={20} />
                        <span className="font-black text-xs uppercase tracking-[0.2em]">Community Feed</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('direct'); setCommunityActive(false); }}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${activeTab === 'direct'
                            ? 'bg-church-green border-church-green text-white shadow-xl shadow-church-green/30 scale-[1.02]'
                            : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 border-transparent'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <MessageSquare size={20} />
                            <span className="font-black text-xs uppercase tracking-[0.2em]">Private Inbox</span>
                        </div>
                        {unreadTotal > 0 && (
                            <span className="bg-red-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full shadow-lg shadow-red-500/20">
                                {unreadTotal}
                            </span>
                        )}
                    </button>
                </div>

                {/* List Area */}
                <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-transparent">
                    <div className="px-5 lg:px-4 py-3 flex items-center justify-between lg:mb-2 bg-gray-50/50 dark:bg-white/5 lg:bg-transparent border-b border-gray-100 dark:border-white/5 lg:border-none">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                            {activeTab === 'community' ? 'Group Chat' : 'Conversations'}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {activeTab === 'community' ? (
                            <div className="mx-4 my-6 p-6 md:p-8 rounded-[2rem] bg-gradient-to-br from-church-green/5 to-emerald-500/5 text-center space-y-4 border border-church-green/10">
                                <div className="w-16 h-16 rounded-2xl bg-church-green/10 flex items-center justify-center mx-auto mb-2">
                                    <Hash size={32} className="text-church-green" />
                                </div>
                                <h3 className="text-lg font-black dark:text-white tracking-tight">Community Hub</h3>
                                <p className="text-xs font-medium text-gray-500 leading-relaxed max-w-xs mx-auto">
                                    Join the massive family conversation. Share testimonies, ask questions, and fellowship.
                                </p>
                                <button
                                    onClick={() => { setCommunityActive(true); }}
                                    className="w-full py-4 bg-church-green text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-church-green/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    Enter Hub
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="px-4 mb-2 lg:mb-4">
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-church-green transition-colors" size={16} />
                                        <input
                                            placeholder="Search people..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-gray-100 dark:bg-white/5 border-none focus:ring-2 focus:ring-church-green/20 pl-11 pr-4 py-3.5 rounded-2xl text-[13px] font-medium dark:text-gray-100 placeholder-gray-500 transition-all"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="px-6 py-2 mb-2 text-center">
                                        <div className="bg-red-50 dark:bg-red-900/10 text-red-500 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg border border-red-100 dark:border-red-500/20">
                                            Offline
                                        </div>
                                    </div>
                                )}

                                {loadingUsers ? (
                                    <div className="py-10 flex justify-center"><LoadingSpinner /></div>
                                ) : (searchQuery ? filteredUsers : conversations).map((item: any) => {
                                    const isConv = !!item.lastMessage;
                                    const uid = item.uid;
                                    const details = userStatuses[uid] || item;
                                    const displayName = details.displayName || 'User';
                                    const photoURL = details.photoURL;
                                    const unreadCount = isConv ? (item[`unreadCount_${user.uid}`] || 0) : 0;

                                    return (
                                        <button
                                            key={uid}
                                            onClick={() => setSelectedUser({ uid, displayName, photoURL })}
                                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group relative overflow-hidden ${selectedUser?.uid === uid
                                                ? 'bg-church-green/10 dark:bg-white/10'
                                                : 'hover:bg-gray-50 dark:hover:bg-white/5 active:scale-[0.98]'
                                                }`}
                                        >
                                            <div className="relative shrink-0">
                                                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-church-green font-black text-lg group-hover:scale-105 transition-transform duration-500 overflow-hidden shadow-sm">
                                                    {photoURL ? <img src={photoURL} className="w-full h-full object-cover" /> : <span>{displayName[0]}</span>}
                                                </div>
                                                {userStatuses[uid]?.isOnline && (
                                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-church-green border-2 border-white dark:border-[#121b22] rounded-full shadow-sm"></div>
                                                )}
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <span className={`text-[15px] font-bold dark:text-gray-100 truncate tracking-tight transition-colors ${unreadCount > 0 ? 'text-gray-900' : 'text-gray-700 dark:text-gray-300'}`}>{displayName}</span>
                                                    {isConv && <span className="text-[10px] text-gray-400 font-bold uppercase">{item.updatedAt?.toDate ? new Date(item.updatedAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'New'}</span>}
                                                </div>
                                                <div className="flex justify-between items-center gap-3">
                                                    <p className={`text-[13px] ${(isConv && unreadCount > 0) ? 'text-church-green font-bold' : 'text-gray-400 font-medium'} truncate line-clamp-1 flex-1`}>
                                                        {isConv ? item.lastMessage : 'Start a new conversation'}
                                                    </p>
                                                    {(isConv && unreadCount > 0) && (
                                                        <span className="bg-church-green text-white text-[10px] font-black min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full shrink-0 shadow-lg shadow-church-green/20 animate-pulse">
                                                            {unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}

                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={`flex-1 h-full min-w-0 ${selectedUser || communityActive ? 'flex' : 'hidden lg:flex'} flex-col overflow-hidden`}>
                {selectedUser ? (
                    <DirectMessagePanel
                        currentUser={user}
                        targetUser={selectedUser}
                        onBack={() => setSelectedUser(null)}
                    />
                ) : communityActive ? (
                    <GroupChatScreen
                        user={user}
                        onBack={() => setCommunityActive(false)}
                        onUserClick={(tgt) => {
                            setActiveTab('direct');
                            setSelectedUser(tgt);
                            setCommunityActive(false);
                        }}
                    />
                ) : (
                    <div className="hidden lg:flex h-full glass-card rounded-[3rem] flex-col items-center justify-center p-20 text-center space-y-8 bg-white/30 dark:bg-white/5 border border-white/10 backdrop-blur-xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-church-green/5 to-transparent pointer-events-none"></div>
                        <div className="relative group">
                            <div className="absolute inset-0 bg-church-green blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-church-green to-emerald-700 flex items-center justify-center text-white shadow-2xl relative z-10 transform -rotate-6 group-hover:rotate-0 transition-transform duration-700">
                                <MessageSquare size={40} />
                            </div>
                        </div>
                        <div className="max-w-md space-y-4 relative z-10">
                            <h3 className="text-3xl font-black uppercase tracking-tight dark:text-white leading-none">Doxa Messenger</h3>
                            <p className="text-sm text-gray-400 font-medium leading-relaxed">
                                Experience seamless communication with the Doxa family. Select a contact from the sidebar to start a secure conversation or participate in the community chat.
                            </p>
                            <div className="flex items-center justify-center gap-6 pt-4">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center"><Shield size={20} /></div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Secure</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center"><Star size={20} /></div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Premium</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center"><Users size={20} /></div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Family</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatContainer;
