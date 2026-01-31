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
            <div className={`w-full lg:w-96 shrink-0 flex flex-col h-full bg-white dark:bg-[#121b22] lg:bg-transparent ${(selectedUser || communityActive) ? 'hidden lg:flex' : 'flex'} overflow-hidden`}>
                {/* Mobile Dashboard Header */}
                <div className="lg:hidden px-6 pt-safe pb-2">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onMenuToggle}
                                className="p-2 -ml-2 bg-gray-100 dark:bg-white/5 rounded-xl text-gray-500 hover:text-church-green"
                            >
                                <Menu size={24} />
                            </button>
                            <h1 className="text-2xl font-black dark:text-gray-100 tracking-tight">Messages</h1>
                        </div>
                        <div className="p-2 bg-gray-100 dark:bg-white/5 rounded-full text-gray-500">
                            <Search size={20} />
                        </div>
                    </div>

                    <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl mb-4">
                        <button
                            onClick={() => { setActiveTab('community'); setSelectedUser(null); setCommunityActive(true); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'community' ? 'bg-white dark:bg-white/10 text-church-green shadow-sm shadow-black/5' : 'text-gray-400'}`}
                        >
                            <Hash size={16} /> Community
                        </button>
                        <button
                            onClick={() => { setActiveTab('direct'); setCommunityActive(false); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'direct' ? 'bg-white dark:bg-white/10 text-church-green shadow-sm shadow-black/5' : 'text-gray-400'}`}
                        >
                            <MessageSquare size={16} /> Private
                            {unreadTotal > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
                        </button>
                    </div>
                </div>

                {/* Desktop Tabs */}
                <div className="hidden lg:flex flex-col gap-3 p-4 bg-white dark:bg-white/5 rounded-3xl mb-4">
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
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 lg:px-4 py-2 flex items-center justify-between lg:mb-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                            {activeTab === 'community' ? 'Group Chat' : 'Conversations'}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto hide-scrollbar">
                        {activeTab === 'community' ? (
                            <div className="px-6 py-10 text-center space-y-3">
                                <Hash size={40} className="mx-auto text-church-green opacity-20" />
                                <p className="text-[12px] font-bold text-gray-400 uppercase leading-snug">
                                    Join the massive family conversation in our Community Hub.
                                </p>
                                <button
                                    onClick={() => { setCommunityActive(true); }}
                                    className="px-6 py-2 bg-church-green/10 text-church-green text-[10px] font-black uppercase rounded-full"
                                >
                                    Open Hub
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="px-6 lg:px-0 mb-4">
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-church-green transition-colors" size={16} />
                                        <input
                                            placeholder="Search people..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-gray-100 dark:bg-white/5 border-none focus:ring-2 focus:ring-church-green/20 pl-11 pr-4 py-3 rounded-2xl text-[14px] font-medium dark:text-gray-100 placeholder-gray-500"
                                        />
                                    </div>
                                </div>

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
                                            className={`w-full flex items-center gap-4 px-6 lg:px-4 py-4 transition-all group ${selectedUser?.uid === uid
                                                ? 'bg-church-green/5 dark:bg-church-green/10 lg:border-r-4 border-church-green'
                                                : 'hover:bg-gray-50 dark:hover:bg-white/5'
                                                }`}
                                        >
                                            <div className="relative shrink-0">
                                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-church-green/20 to-emerald-500/20 flex items-center justify-center text-church-green group-hover:scale-110 transition-transform duration-500 overflow-hidden">
                                                    {photoURL ? <img src={photoURL} className="w-full h-full object-cover" /> : <span className="font-black text-sm uppercase">{displayName[0]}</span>}
                                                </div>
                                                {userStatuses[uid]?.isOnline && (
                                                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-church-green border-2 border-white dark:border-[#121b22] rounded-full"></div>
                                                )}
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="flex justify-between items-baseline mb-0.5">
                                                    <span className="text-[15px] font-black dark:text-gray-100 truncate tracking-tight">{displayName}</span>
                                                    {isConv && <span className="text-[10px] text-gray-400 font-bold uppercase">{item.updatedAt?.toDate ? new Date(item.updatedAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'New'}</span>}
                                                </div>
                                                <div className="flex justify-between items-center gap-2">
                                                    <p className={`text-[13px] ${(isConv && unreadCount > 0) ? 'text-church-green font-black' : 'text-gray-500 font-medium'} truncate line-clamp-1`}>
                                                        {isConv ? item.lastMessage : 'Start a new conversation'}
                                                    </p>
                                                    {(isConv && unreadCount > 0) && (
                                                        <span className="bg-church-green text-white text-[10px] font-black min-w-[20px] h-5 flex items-center justify-center px-1 rounded-full shrink-0 shadow-lg shadow-church-green/20">
                                                            {unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                                <div className="h-24 lg:hidden" /> {/* Mobile Spacer */}
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
