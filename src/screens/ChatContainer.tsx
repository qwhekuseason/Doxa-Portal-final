import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Conversation } from '../types';
import { LoadingSpinner } from '../components/UIComponents';
import { MessageSquare, Users, Search, Menu, X, Star } from 'lucide-react';
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

    // Merge recent conversations and users for the list
    const filteredUsers = useMemo(() => {
        const queryLower = searchQuery.toLowerCase();

        // Start with known conversation users
        const recentUids = new Set(conversations.map(c => c.uid));
        const recentUsersList = users.filter(u => recentUids.has(u.uid));
        const otherUsersList = users.filter(u => !recentUids.has(u.uid));

        const combined = [...recentUsersList, ...otherUsersList];

        if (!queryLower) return combined;

        return combined.filter(u =>
            u.displayName.toLowerCase().includes(queryLower) ||
            u.role?.toLowerCase().includes(queryLower)
        );
    }, [conversations, users, searchQuery]);

    useEffect(() => {
        if (filteredUsers.length === 0) return;
        const uids = filteredUsers.map(u => u.uid).slice(0, 30);

        const q = query(collection(db, 'users'), where('uid', 'in', uids));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const statuses: Record<string, any> = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                statuses[doc.id] = {
                    isOnline: data.isOnline || false,
                    lastActive: data.lastActive
                };
            });
            setUserStatuses(prev => ({ ...prev, ...statuses }));
        });

        return () => unsubscribe();
    }, [filteredUsers]);

    // Sync with URL for back navigation support (Gestures)
    useEffect(() => {
        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search);
            const targetUid = params.get('target');
            const mode = params.get('mode');

            if (mode === 'community') {
                setCommunityActive(true);
                setSelectedUser(null);
            } else if (targetUid) {
                // Try to find the user in loaded users or conversations
                // Note: If users aren't loaded yet, this might miss. 
                // Improvements: Loading state handling or lazy lookup.
                const foundUser = users.find(u => u.uid === targetUid) ||
                    conversations.find(c => c.uid === targetUid); // conversation has uid/displayName/photoURL

                if (foundUser) {
                    // Normalize to required format
                    setSelectedUser({
                        uid: foundUser.uid,
                        displayName: foundUser.displayName,
                        photoURL: foundUser.photoURL
                    });
                    setCommunityActive(false);
                }
            } else {
                // Back to list
                setSelectedUser(null);
                setCommunityActive(false);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [users, conversations]);

    return (
        <div className="flex h-full overflow-hidden bg-transparent rounded-[2.5rem]">
            {/* Conversations Sidebar */}
            <div className={`${(selectedUser || communityActive) ? 'hidden lg:flex' : 'flex'} w-full lg:w-96 flex-col glass-sidebar z-10 animate-page-enter animate-stagger-1`}>
                <div className="p-8 pb-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">Hub</h2>
                            <p className="text-[10px] font-black text-church-green uppercase tracking-[0.2em] mt-1">Divine Fellowship</p>
                        </div>
                        <button onClick={onMenuToggle} className="lg:hidden w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-white/5 rounded-2xl text-gray-600 dark:text-gray-400 spring-interaction">
                            <Menu size={24} />
                        </button>
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-church-green transition-colors">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Connect with people..."
                            className="w-full pl-14 pr-6 py-4 rounded-2xl glass-card !bg-white/50 dark:!bg-white/5 border border-gray-100 dark:border-white/5 outline-none focus:ring-2 focus:ring-church-green/30 transition-all text-sm font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2">
                        {[
                            { id: 'direct', label: 'Inbox', icon: <MessageSquare size={14} /> },
                            { id: 'community', label: 'Community', icon: <Users size={14} /> },
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => {
                                    const newMode = t.id;
                                    const params = new URLSearchParams(window.location.search);

                                    if (newMode === 'community') {
                                        params.set('mode', 'community');
                                        params.delete('target');
                                        window.history.pushState({}, '', `?${params.toString()}`);
                                        setCommunityActive(true);
                                        setSelectedUser(null);
                                    } else {
                                        // Direct tab just switches the list view, doesn't open a chat
                                        setActiveTab('direct');
                                        setCommunityActive(false);
                                        setSelectedUser(null);
                                        // Clear params to show list
                                        params.delete('mode');
                                        params.delete('target');
                                        window.history.pushState({}, '', `?${params.toString()}`);
                                    }
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all spring-interaction ${activeTab === t.id
                                    ? 'bg-church-green text-white shadow-lg shadow-church-green/20'
                                    : 'bg-white/40 dark:bg-white/5 text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                {t.icon} {t.label}
                                {t.id === 'direct' && unreadTotal > 0 && (
                                    <span className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-black text-white ml-1">
                                        {unreadTotal}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto hide-scrollbar px-6 pb-20 space-y-1">
                    {loadingUsers ? (
                        <div className="flex flex-col gap-4 py-10">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex gap-4 p-4 animate-pulse">
                                    <div className="w-12 h-12 bg-gray-200 dark:bg-white/5 rounded-xl"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-200 dark:bg-white/5 rounded w-1/3"></div>
                                        <div className="h-3 bg-gray-200 dark:bg-white/5 rounded w-1/2"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        filteredUsers.map((u, i) => (
                            <button
                                key={u.uid}
                                onClick={() => {
                                    const params = new URLSearchParams(window.location.search);
                                    params.set('target', u.uid);
                                    params.delete('mode');
                                    window.history.pushState({}, '', `?${params.toString()}`);
                                    setSelectedUser(u);
                                    setCommunityActive(false);
                                }}
                                className={`w-full flex items-center gap-4 p-4 rounded-[2rem] transition-all spring-interaction group ${selectedUser?.uid === u.uid
                                    ? 'glass-card !bg-church-green text-white shadow-lg shadow-church-green/20'
                                    : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-church-green'
                                    }`}
                                style={{ transform: `translateY(${i * 2}px)` }}
                            >
                                <div className="relative shrink-0">
                                    <img
                                        src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`}
                                        className={`w-12 h-12 rounded-xl object-cover border-2 ${selectedUser?.uid === u.uid ? 'border-white/40' : 'border-transparent group-hover:border-church-green/50'} transition-all`}
                                        alt=""
                                    />
                                    {userStatuses[u.uid]?.isOnline && (
                                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-church-green border-2 border-white dark:border-black rounded-full shadow-[0_0_8px_#10b981]"></div>
                                    )}
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <h4 className={`text-sm font-black truncate leading-none ${selectedUser?.uid === u.uid ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{u.displayName}</h4>
                                    <p className={`text-[9px] font-black uppercase tracking-widest mt-1.5 opacity-60`}>
                                        {u.role || 'Fellow Member'}
                                    </p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 relative overflow-hidden flex flex-col animate-page-enter animate-stagger-2">
                {!selectedUser && !communityActive ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8">
                        <div className="relative">
                            <div className="w-24 h-24 bg-church-green/10 rounded-[2rem] flex items-center justify-center text-church-green animate-pulse">
                                <MessageSquare size={40} />
                            </div>
                            <div className="absolute -top-4 -right-4 w-12 h-12 bg-church-green rounded-2xl flex items-center justify-center text-white shadow-xl animate-bounce">
                                <Star size={20} fill="currentColor" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter mb-3">Begin a Conversation</h3>
                            <p className="max-w-xs text-gray-500 font-medium text-sm">Select a fellow member from the hub to start a divine fellowship or join the community stream.</p>
                        </div>
                    </div>
                ) : communityActive ? (
                    <GroupChatScreen user={user} onBack={() => window.history.back()} />
                ) : (
                    <DirectMessagePanel
                        currentUser={user}
                        targetUser={selectedUser!}
                        onBack={() => window.history.back()}
                    />
                )}
            </div>
        </div>
    );
};

export default ChatContainer;
