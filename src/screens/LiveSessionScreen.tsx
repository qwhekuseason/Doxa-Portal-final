import React, { useState, useEffect, useCallback, useRef } from 'react';
import AgoraRTC, {
    IAgoraRTCClient,
    ILocalVideoTrack,
    IMicrophoneAudioTrack,
    IRemoteVideoTrack,
    IRemoteAudioTrack,
    UID
} from 'agora-rtc-sdk-ng';
import {
    Video,
    Mic,
    MicOff,
    VideoOff,
    Monitor,
    Phone,
    Users,
    Loader2,
    MessageSquare,
    X,
    Send,
    MoreVertical,
    Layout,
    Hand,
    Shield,
    ChevronUp,
    AlertCircle
} from 'lucide-react';
import { getAgoraAppId } from '../utils/agoraConfig';
import { prepareChannelName, generateUserId, handleAgoraError, getAgoraToken } from '../utils/agoraService';
import { UserProfile } from '../types';
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    onSnapshot,
    query,
    where,
    serverTimestamp,
    getDocs,
    addDoc,
    orderBy
} from 'firebase/firestore';
import { db } from '../firebase';

// --- Types ---
interface LiveSessionScreenProps {
    initialRoom?: string;
    user?: UserProfile;
    autoJoin?: boolean;
}

interface RemoteUser {
    uid: UID;
    displayName?: string;
    videoTrack?: IRemoteVideoTrack;
    audioTrack?: IRemoteAudioTrack;
    isMuted?: boolean;
    isHandRaised?: boolean;
}

interface Reaction {
    id: string;
    senderUid: string;
    emoji: string;
    timestamp: any;
}

interface ChatMessage {
    id?: string;
    sender: string;
    senderUid: string;
    text: string;
    timestamp: any;
    photoURL?: string;
}

// --- Component ---
const LiveSessionScreen: React.FC<LiveSessionScreenProps> = ({ initialRoom = '', user: currentUser, autoJoin = false }) => {
    // --- State: Room & Connection ---
    const [roomName, setRoomName] = useState(initialRoom);
    const [inCall, setInCall] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [client, setClient] = useState<IAgoraRTCClient | null>(null);
    const [currentUid, setCurrentUid] = useState<number | null>(null);

    // --- State: Tracks ---
    const [localVideoTrack, setLocalVideoTrack] = useState<ILocalVideoTrack | null>(null);
    const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
    const [remoteUsers, setRemoteUsers] = useState<Map<UID, RemoteUser>>(new Map());

    // --- State: Controls ---
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [activeSidebar, setActiveSidebar] = useState<'none' | 'chat' | 'people'>('none');
    const [pinnedUid, setPinnedUid] = useState<string | null>(null);
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [lastReaction, setLastReaction] = useState<Reaction | null>(null);
    const [showReactions, setShowReactions] = useState(false);

    // --- State: Data ---
    const [participantData, setParticipantData] = useState<Record<string, { displayName: string; isHandRaised: boolean }>>({});
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');

    // --- Refs ---
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const localVideoRef = useRef<HTMLDivElement>(null);
    const joiningRef = useRef(false);

    // --- Effects: Sync Participants & Chat ---
    useEffect(() => {
        if (!inCall || !roomName) return;

        // 1. Sync Participants
        const qParticipants = query(collection(db, 'live_participants'), where('roomName', '==', roomName));
        const unsubParticipants = onSnapshot(qParticipants, (snapshot) => {
            const dataMap: Record<string, { displayName: string; isHandRaised: boolean }> = {};
            const now = Date.now();
            snapshot.forEach((doc) => {
                const data = doc.data();
                // Heartbeat Filter: Ignore users who haven't pinged in 20 seconds
                const lastPing = data.lastPing?.toMillis?.() || 0;
                const isAlive = (now - lastPing) < 20000;

                if (isAlive) {
                    dataMap[data.uid.toString()] = {
                        displayName: data.displayName || 'Guest',
                        isHandRaised: data.isHandRaised || false
                    };
                }
            });
            setParticipantData(dataMap);
        });

        // 2. Sync Chat
        const qChat = query(collection(db, 'live_rooms', roomName, 'messages'), orderBy('timestamp', 'asc'));
        const unsubChat = onSnapshot(qChat, (snapshot) => {
            const msgs: ChatMessage[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                msgs.push({ id: doc.id, ...data } as ChatMessage);
            });
            setMessages(msgs);

            // Check for new reactions
            const latest = msgs[msgs.length - 1];
            if (latest && (latest as any).type === 'reaction' && Date.now() - (latest.timestamp?.toMillis?.() || 0) < 5000) {
                // Simple debitter: only show if very recent (prevent flood on load)
                setLastReaction({
                    id: latest.id!,
                    senderUid: latest.senderUid,
                    emoji: (latest as any).text, // We store emoji in text field for simplicity
                    timestamp: latest.timestamp
                });
            }

            if (activeSidebar === 'chat') {
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        });

        return () => {
            unsubParticipants();
            unsubChat();
        };
    }, [inCall, roomName, activeSidebar]);

    // --- Effect: Heartbeat Writer (Ping every 5s) ---
    useEffect(() => {
        if (!inCall || !roomName || !currentUid) return;

        const interval = setInterval(async () => {
            try {
                await setDoc(doc(db, 'live_participants', `${roomName}_${currentUid}`), {
                    lastPing: serverTimestamp()
                }, { merge: true });
            } catch (err) {
                console.error("Heartbeat error:", err);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [inCall, roomName, currentUid]);

    // --- Effects: Local Video Playback ---
    useEffect(() => {
        if (inCall && localVideoTrack && localVideoRef.current) {
            localVideoTrack.play(localVideoRef.current);
        }
    }, [inCall, localVideoTrack]);

    // --- Effect: Auto Join ---
    useEffect(() => {
        if (autoJoin && initialRoom && !inCall) {
            handleJoin(new Event('submit') as any);
        }
    }, [autoJoin, initialRoom]);

    // --- Agora: Join Logic ---
    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (joiningRef.current || inCall) return;

        const trimmedRoom = roomName.trim();
        if (!trimmedRoom) return;

        // If not already in a dedicated window (autoJoin is false) and we want to enforce new tab:
        // However, user might want to join here. 
        // Let's change the behavior: Main button opens new tab. 

        if (!autoJoin) {
            // Open in new window
            const width = 1280;
            const height = 720;
            const left = (window.screen.width - width) / 2;
            const top = (window.screen.height - height) / 2;

            window.open(
                `?mode=live_window&room=${encodeURIComponent(trimmedRoom)}`,
                'DoxaLiveSession',
                `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes`
            );
            return;
        }

        // Actual Join Logic (runs in the new window)
        setLoading(true);
        setError('');
        joiningRef.current = true;

        try {
            // Check Live Room existence (Optional strict check)
            const q = query(collection(db, 'live_rooms'), where('channelName', '==', trimmedRoom));
            const querySnapshot = await getDocs(q);

            let validRoom = !querySnapshot.empty;
            if (!validRoom) {
                const qName = query(collection(db, 'live_rooms'), where('name', '==', trimmedRoom));
                const snapName = await getDocs(qName);
                validRoom = !snapName.empty;
            }

            // For now, proceeding even if "loose" to allow ad-hoc testing, 
            // but in production you might want: if (!validRoom) throw new Error('Room not found');

            const channelName = prepareChannelName(trimmedRoom);
            const appId = getAgoraAppId();
            const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

            agoraClient.on('user-published', async (user, mediaType) => {
                await agoraClient.subscribe(user, mediaType);
                setRemoteUsers(prev => {
                    const newMap = new Map(prev);
                    const existing = newMap.get(user.uid) || { uid: user.uid };
                    if (mediaType === 'video') existing.videoTrack = user.videoTrack;
                    if (mediaType === 'audio') {
                        existing.audioTrack = user.audioTrack;
                        user.audioTrack?.play();
                    }
                    newMap.set(user.uid, existing);
                    return newMap;
                });
            });

            agoraClient.on('user-unpublished', (user, mediaType) => {
                setRemoteUsers(prev => {
                    const newMap = new Map(prev);
                    const existing = newMap.get(user.uid);
                    if (existing) {
                        if (mediaType === 'video') existing.videoTrack = undefined;
                        newMap.set(user.uid, existing);
                    }
                    return newMap;
                });
            });

            agoraClient.on('user-left', (user) => {
                setRemoteUsers(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(user.uid);
                    return newMap;
                });
            });

            const uid = generateUserId();
            setCurrentUid(uid);

            const token = await getAgoraToken(channelName, uid);


            // Cleanup old sessions for this user (deduplication)
            const qCleanup = query(
                collection(db, 'live_participants'),
                where('roomName', '==', trimmedRoom),
                where('firebaseUid', '==', currentUser?.uid)
            );
            const snapshots = await getDocs(qCleanup);
            snapshots.forEach((doc) => {
                deleteDoc(doc.ref).catch(console.error);
            });

            // Secondary Cleanup: Check for displayName (legacy ghosts)
            const qCleanupLegacy = query(
                collection(db, 'live_participants'),
                where('roomName', '==', trimmedRoom),
                where('displayName', '==', currentUser?.displayName || 'Guest')
            );
            const snapshotsLegacy = await getDocs(qCleanupLegacy);
            snapshotsLegacy.forEach((doc) => {
                // Verify it's not the same doc we just deleted (though Firestore handles this gracefully)
                // and maybe ensure we don't delete someone else with same name if possible? 
                // For now, assuming distinct names or single active user session is priority.
                deleteDoc(doc.ref).catch(console.error);
            });

            await agoraClient.join(appId, channelName, token, uid);

            // Register Participant
            await setDoc(doc(db, 'live_participants', `${trimmedRoom}_${uid}`), {
                roomName: trimmedRoom,
                uid,
                firebaseUid: currentUser?.uid,
                displayName: currentUser?.displayName || 'Guest',
                photoURL: currentUser?.photoURL || '',
                isHandRaised: false,

                joinedAt: serverTimestamp(),
                lastPing: serverTimestamp()
            });

            // Local Tracks
            const videoTrack = await AgoraRTC.createCameraVideoTrack({
                encoderConfig: { width: 1280, height: 720, frameRate: 30 }
            });
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();

            await agoraClient.publish([videoTrack, audioTrack]);

            setClient(agoraClient);
            setLocalVideoTrack(videoTrack);
            setLocalAudioTrack(audioTrack);
            setInCall(true);
            setLoading(false);
            joiningRef.current = false;

        } catch (err: any) {
            console.error('Join error:', err);
            setError(handleAgoraError(err));
            setLoading(false);
            joiningRef.current = false;
        }
    };

    // --- Agora: Controls ---
    const toggleCamera = async () => {
        if (localVideoTrack) {
            await localVideoTrack.setEnabled(!isCameraOn);
            setIsCameraOn(!isCameraOn);
        }
    };

    const toggleMic = async () => {
        if (localAudioTrack) {
            await localAudioTrack.setEnabled(!isMicOn);
            setIsMicOn(!isMicOn);
        }
    };

    const leaveCall = async () => {
        if (localVideoTrack) {
            localVideoTrack.close();
            setLocalVideoTrack(null);
        }
        if (localAudioTrack) {
            localAudioTrack.close();
            setLocalAudioTrack(null);
        }
        if (client) {
            await client.leave();
            setClient(null);
            if (currentUid && roomName) {
                deleteDoc(doc(db, 'live_participants', `${roomName}_${currentUid}`)).catch(console.error);
            }
        }
        setInCall(false);
        setRemoteUsers(new Map());

        // If in standalone mode, close the window on leave
        if (autoJoin) {
            window.close();
        }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser || !roomName) return;

        try {
            await addDoc(collection(db, 'live_rooms', roomName, 'messages'), {
                sender: currentUser.displayName || 'Guest',
                senderUid: currentUser.uid,
                photoURL: currentUser.photoURL || '',
                text: newMessage.trim(),
                timestamp: serverTimestamp()
            });
            setNewMessage('');
        } catch (err) {
            console.error('Send message error:', err);
        }
    }


    const toggleHand = async () => {
        if (!currentUid || !roomName) return;
        const newState = !isHandRaised;
        setIsHandRaised(newState);
        try {
            await setDoc(doc(db, 'live_participants', `${roomName}_${currentUid}`), {
                isHandRaised: newState
            }, { merge: true });
        } catch (err) {
            console.error('Error toggling hand:', err);
            setIsHandRaised(!newState); // Revert on error
        }
    };

    const sendReaction = async (emoji: string) => {
        if (!currentUid || !roomName) return;
        setShowReactions(false);
        try {
            await addDoc(collection(db, 'live_rooms', roomName, 'messages'), {
                sender: currentUser?.displayName || 'Guest',
                senderUid: currentUid,
                text: emoji,
                type: 'reaction',
                timestamp: serverTimestamp()
            });
        } catch (err) {
            console.error('Error sending reaction:', err);
        }
    };

    const toggleScreenShare = async () => {
        if (!client) return;

        try {
            if (isScreenSharing) {
                // STOP Sharing -> Switch back to Camera
                if (localVideoTrack) {
                    localVideoTrack.close();
                    await client.unpublish(localVideoTrack);
                }

                const camTrack = await AgoraRTC.createCameraVideoTrack({
                    encoderConfig: { width: 1280, height: 720, frameRate: 30 }
                });

                await client.publish(camTrack);
                setLocalVideoTrack(camTrack);
                setIsScreenSharing(false);
                setIsCameraOn(true); // Assume camera comes back on
            } else {
                // START Sharing
                // Create screen track
                // @ts-ignore - Agora types might return array or track depending on version, forcing cast for simplicity in this context if needed, but normally returns track or [track, audio]
                const screenTracks = await AgoraRTC.createScreenVideoTrack({
                    encoderConfig: "1080p_1",
                    optimizationMode: "detail" // Good for text
                });

                // If it returns an array (video + audio), take video. If single track, take it.
                const screenVideoTrack = Array.isArray(screenTracks) ? screenTracks[0] : screenTracks;

                if (localVideoTrack) {
                    // Unpublish camera
                    await client.unpublish(localVideoTrack);
                    // We don't necessarily close it if we want to quick-switch back, but for resource saving we close it.
                    localVideoTrack.close();
                }

                await client.publish(screenVideoTrack);
                setLocalVideoTrack(screenVideoTrack as ILocalVideoTrack);
                setIsScreenSharing(true);

                // Handle browser native "Stop Sharing" button
                (screenVideoTrack as any).on('track-ended', () => {
                    if (isScreenSharing) return; // Prevent double toggle if strict strict state
                    // We need to switch back to camera programmatically
                    // But we can't easily call toggleScreenShare() inside itself as it relies on closure state which might be stale? 
                    // Better to just force reload or handle strictly. 
                    // For now, let's manually replicate the "stop" logic:
                    // ideally we'd trigger a state update that invokes an effect, but direct call is okay if state is ref'd.
                    // Simplified: User usually has to click "Stop" in app to restore camera properly or we just let them be without video until they toggle camera.
                    // Let's just set state to false and let user re-enable camera manually to avoid complexity.
                    setIsScreenSharing(false);
                    setLocalVideoTrack(null);
                });
            }
        } catch (e) {
            console.error("Screen share error:", e);
        }
    };

    // --- UI Helpers ---
    const getGridClass = (count: number) => {
        if (count === 1) return 'grid-cols-1';
        if (count === 2) return 'grid-cols-1 md:grid-cols-2';
        if (count <= 4) return 'grid-cols-2';
        return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    };

    // --- Render: Pre-Join Screen (Restored Thematic UI) ---
    if (!inCall) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 animate-fade-in pb-20">
                <div className="w-full max-w-xl group relative">
                    {/* Background Glow */}
                    <div className="absolute -inset-4 bg-gradient-to-r from-church-green/20 to-church-gold/20 rounded-[4rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                    <div className="relative glass-card rounded-[3.5rem] p-10 md:p-14 shadow-premium border-white/10 overflow-hidden">
                        {/* Visual Decor */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-church-green/5 rounded-full blur-3xl -mr-32 -mt-32"></div>

                        <div className="relative z-10 text-center mb-12">
                            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-church-green to-emerald-700 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-church-green/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700">
                                <Video size={44} className="text-white" />
                            </div>
                            <h1 className="text-4xl font-black dark:text-white mb-4 tracking-tighter">Connect Live</h1>
                            <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm mx-auto leading-relaxed">
                                Join our spiritual fellowship in real-time. Enter your session code below to enter the room.
                            </p>
                        </div>

                        <form onSubmit={handleJoin} className="space-y-8 relative z-10">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-church-green dark:text-church-gold ml-4">
                                    Meeting Code
                                </label>
                                <div className="relative group/input">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/input:text-church-green transition-colors">
                                        <Shield size={20} />
                                    </div>
                                    <input
                                        value={roomName}
                                        onChange={(e) => setRoomName(e.target.value)}
                                        placeholder="e.g. sunday-service"
                                        className="w-full bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-church-green/50 p-5 pl-16 rounded-3xl outline-none font-black text-xl dark:text-white transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-bold rounded-2xl flex items-center gap-4 animate-shake">
                                    <AlertCircle size={20} className="shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button
                                disabled={loading || !roomName}
                                className="w-full group/btn py-5 bg-church-green hover:bg-emerald-700 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-premium hover:shadow-church-green/40 transition-all flex items-center justify-center gap-4 active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <Phone size={20} className="group-hover:rotate-12 transition-transform" />
                                )}
                                <span className="relative">
                                    {loading ? 'Engaging Connection...' : 'Open Live Session'}
                                </span>
                            </button>
                        </form>

                        <div className="mt-10 flex items-center justify-center gap-8 opacity-40">
                            <div className="flex items-center gap-2">
                                <Mic size={14} />
                                <span className="text-[9px] font-black uppercase tracking-tighter">Audio Sync</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Video size={14} />
                                <span className="text-[9px] font-black uppercase tracking-tighter">HD Video</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users size={14} />
                                <span className="text-[9px] font-black uppercase tracking-tighter">Secure</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- Render: In-Call (Thematic + Responsive) ---
    const participantCount = remoteUsers.size + 1;
    // Filter out users who are connected to Agora but don't have a matching Firestore participant doc (ghosts/stale)
    const sortedRemoteUsers = Array.from(remoteUsers.values()).filter(u => participantData[u.uid.toString()]);
    const pinnedUser = pinnedUid ? (pinnedUid === currentUid?.toString() ? 'local' : sortedRemoteUsers.find(u => u.uid.toString() === pinnedUid)) : null;

    return (
        <div className="fixed inset-0 bg-[#050505] flex flex-col font-sans text-white overflow-hidden animate-fade-in">
            {/* Background Ambiance */}
            <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-church-green/10 to-transparent pointer-events-none z-0"></div>

            {/* Reaction Overlay (Floating) */}
            {lastReaction && (
                <div key={lastReaction.id} className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-float-up text-6xl">
                    {lastReaction.emoji}
                </div>
            )}

            {/* 1. Main Stage */}
            <div className="flex-1 flex overflow-hidden relative z-10">
                {/* Video Grid or Spotlight */}
                <div className={`flex-1 p-4 md:p-6 overflow-y-auto w-full transition-all duration-300 ${activeSidebar !== 'none' ? 'hidden lg:flex' : 'flex'}`}>

                    {pinnedUser ? (
                        // --- Spotlight Layout ---
                        <div className="w-full h-full flex flex-col gap-4">
                            {/* Main Stage (Pinned User) */}
                            <div className="flex-1 relative glass-card border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                                {pinnedUser === 'local' ? (
                                    <div ref={localVideoRef} className="w-full h-full object-contain transform scale-x-[-1]" />
                                ) : (
                                    <div
                                        className="w-full h-full"
                                        ref={(node) => {
                                            if (node && (pinnedUser as RemoteUser).videoTrack) (pinnedUser as RemoteUser).videoTrack!.play(node);
                                        }}
                                    />
                                )}

                                {/* Info Badge */}
                                <div className="absolute bottom-6 left-6 bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl text-lg font-black uppercase tracking-wider flex items-center gap-3 border border-white/10">
                                    <span>{pinnedUser === 'local' ? 'You (Pinned)' : (participantData[(pinnedUser as RemoteUser).uid.toString()]?.displayName || 'Speaker')}</span>
                                    <button onClick={() => setPinnedUid(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors" title="Unpin">
                                        <Layout size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Filmstrip (Others) */}
                            <div className="h-32 flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                {/* Show Local if not pinned */}
                                {pinnedUser !== 'local' && (
                                    <div className="relative aspect-video min-w-[160px] glass-card rounded-xl overflow-hidden border border-white/5 cursor-pointer hover:border-church-green transition-all" onClick={() => setPinnedUid(currentUid?.toString() || null)}>
                                        <div ref={localVideoRef} className="w-full h-full object-cover transform scale-x-[-1]" />
                                        <div className="absolute inset-0 bg-black/20 hover:bg-transparent transition-colors"></div>
                                    </div>
                                )}

                                {/* Show Remotes if not pinned */}
                                {sortedRemoteUsers.filter(u => u.uid.toString() !== pinnedUid).map(user => (
                                    <div key={user.uid} className="relative aspect-video min-w-[160px] glass-card rounded-xl overflow-hidden border border-white/5 cursor-pointer hover:border-church-green transition-all" onClick={() => setPinnedUid(user.uid.toString())}>
                                        <div
                                            className="w-full h-full"
                                            ref={(node) => {
                                                if (node && user.videoTrack) user.videoTrack.play(node);
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-black/20 hover:bg-transparent transition-colors"></div>
                                        <div className="absolute bottom-2 left-2 text-[10px] font-bold">{participantData[user.uid.toString()]?.displayName}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        // --- Grid Layout (Standard) ---
                        <div className={`grid gap-4 md:gap-6 w-full h-full content-center ${getGridClass(participantCount)} max-h-[85vh] mx-auto`}>
                            {/* Local User */}
                            <div className="relative glass-card border border-white/5 rounded-[2rem] overflow-hidden aspect-video shadow-2xl group ring-2 ring-church-green/20 hover:ring-church-green/50 transition-all">
                                <div ref={localVideoRef} className="w-full h-full object-cover transform scale-x-[-1]" />
                                <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 border border-white/10">
                                    <span>You</span>
                                    {!isMicOn && <MicOff size={12} className="text-red-500" />}
                                </div>

                                {/* Pin Button Hover */}
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setPinnedUid(currentUid?.toString() || null)} className="p-2 bg-black/40 hover:bg-church-green rounded-full backdrop-blur-md text-white border border-white/10 transition-colors">
                                        <Layout size={14} />
                                    </button>
                                </div>

                                {/* Hand Indicator */}
                                {isHandRaised && (
                                    <div className="absolute top-4 left-4 bg-church-gold text-black p-2 rounded-xl animate-bounce shadow-lg">
                                        <Hand size={16} />
                                    </div>
                                )}

                                {!isCameraOn && !isScreenSharing && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a]">
                                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                                            <div className="w-10 h-10 rounded-full bg-church-green/20 flex items-center justify-center text-church-green font-black text-lg">
                                                {currentUser?.displayName?.charAt(0) || 'U'}
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">Camera Off</span>
                                    </div>
                                )}
                            </div>

                            {/* Remote Users */}
                            {sortedRemoteUsers.map(user => {
                                const hasVideo = !!user.videoTrack;
                                return (
                                    <div key={user.uid} className="relative glass-card border border-white/5 rounded-[2rem] overflow-hidden aspect-video shadow-2xl group">
                                        <div
                                            id={`user-video-${user.uid}`}
                                            className="w-full h-full"
                                            ref={(node) => {
                                                if (node && user.videoTrack) user.videoTrack.play(node);
                                            }}
                                        />
                                        <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 border border-white/10">
                                            <span>{participantData[user.uid.toString()]?.displayName || 'Member'}</span>
                                        </div>

                                        {/* Pin Button Hover */}
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setPinnedUid(user.uid.toString())} className="p-2 bg-black/40 hover:bg-church-green rounded-full backdrop-blur-md text-white border border-white/10 transition-colors">
                                                <Layout size={14} />
                                            </button>
                                        </div>

                                        {/* Hand Indicator */}
                                        {user.isHandRaised && (
                                            <div className="absolute top-4 left-4 bg-church-gold text-black p-2 rounded-xl animate-bounce shadow-lg">
                                                <Hand size={16} />
                                            </div>
                                        )}

                                        {!hasVideo && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a]">
                                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-black text-lg">
                                                        {participantData[user.uid.toString()]?.displayName?.charAt(0) || '?'}
                                                    </div>
                                                </div>
                                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">Video Off</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Sidebar (Chat / People) */}
                {activeSidebar !== 'none' && (
                    <div className="w-full md:w-96 glass-card border-l border-white/5 flex flex-col absolute inset-0 md:static z-20 backdrop-blur-xl bg-black/60">
                        {/* Header */}
                        <div className="p-6 flex items-center justify-between border-b border-white/5">
                            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-church-gold">
                                {activeSidebar === 'chat' ? 'Live Chat' : 'Participants'}
                            </h2>
                            <button onClick={() => setActiveSidebar('none')} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                            {activeSidebar === 'people' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-church-green/20 flex items-center justify-center text-xs font-bold text-church-green border border-church-green/20">
                                                {currentUser?.displayName?.charAt(0) || 'Y'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">You</p>
                                                <p className="text-[10px] uppercase tracking-wider text-white/50">Host</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!isMicOn ? <MicOff size={14} className="text-red-500" /> : <Mic size={14} className="text-church-green" />}
                                        </div>
                                    </div>
                                    {sortedRemoteUsers.map(user => (
                                        <div key={user.uid} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white/70">
                                                    {participantData[user.uid.toString()]?.displayName?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-white/90">{participantData[user.uid.toString()]?.displayName || 'Guest'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeSidebar === 'chat' && (
                                <div className="space-y-4">
                                    {messages.length === 0 && (
                                        <div className="text-center py-10 opacity-30">
                                            <MessageSquare size={32} className="mx-auto mb-2" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Quiet Room</p>
                                        </div>
                                    )}
                                    {messages.map(msg => (
                                        <div key={msg.id} className="flex gap-3 animate-fade-in-up">
                                            <div className="mt-1">
                                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold border border-white/5">
                                                    {msg.sender.charAt(0)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-xs font-bold text-church-gold">{msg.sender}</span>
                                                    <span className="text-[9px] text-white/30 lowercase">
                                                        {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-white/90 mt-0.5 leading-relaxed">{msg.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </div>

                        {/* Chat Input */}
                        {activeSidebar === 'chat' && (
                            <div className="p-4 border-t border-white/5 bg-black/20">
                                <form onSubmit={sendMessage} className="relative">
                                    <input
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type a blessing..."
                                        className="w-full bg-white/5 border border-white/10 text-white rounded-2xl py-3 pl-5 pr-12 outline-none focus:border-church-green/50 transition-all text-sm placeholder:text-white/20"
                                    />
                                    <button type="submit" disabled={!newMessage.trim()} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-church-green hover:text-white disabled:opacity-20 transition-colors">
                                        <Send size={16} />
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 2. Bottom Control Bar (Glassmorphism) */}
            <div className="h-24 bg-gradient-to-t from-black via-black/90 to-transparent flex items-end justify-center pb-6 md:pb-8 px-6 z-30 shrink-0 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-4 md:gap-6 bg-white/5 backdrop-blur-xl p-3 md:p-4 rounded-[2.5rem] border border-white/10 shadow-2xl">
                    <button
                        onClick={toggleMic}
                        title="Toggle Microphone"
                        className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isMicOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 text-white shadow-lg shadow-red-500/30'}`}
                    >
                        {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                    </button>
                    <button
                        onClick={toggleCamera}
                        title="Toggle Camera"
                        className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isCameraOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 text-white shadow-lg shadow-red-500/30'}`}
                    >
                        {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
                    </button>

                    <button
                        onClick={toggleScreenShare}
                        title="Share Screen"
                        className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isScreenSharing ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                    >
                        <Monitor size={20} />
                    </button>

                    <div className="w-px h-8 bg-white/10 hidden md:block"></div>

                    {/* Reactions */}
                    <div className="relative">
                        <button
                            onClick={() => setShowReactions(!showReactions)}
                            className="w-12 h-12 md:w-14 md:h-14 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-white transition-all"
                            title="Refactions"
                        >
                            <span className="text-xl">😊</span>
                        </button>
                        {showReactions && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 p-3 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl flex gap-2 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
                                {['❤️', '👍', '🙏', '🎉', '🔥'].map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => sendReaction(emoji)}
                                        className="text-2xl hover:scale-125 transition-transform p-2 cursor-pointer"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Hand Raise */}
                    <button
                        onClick={toggleHand}
                        title={isHandRaised ? "Lower Hand" : "Raise Hand"}
                        className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isHandRaised ? 'bg-church-gold text-black shadow-lg shadow-church-gold/20' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                    >
                        <Hand size={20} />
                    </button>

                    <div className="w-px h-8 bg-white/10 hidden md:block"></div>

                    <button
                        onClick={leaveCall}
                        title="Leave Call"
                        className="h-12 md:h-14 px-8 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center gap-3 transition-all transform hover:scale-105 shadow-xl shadow-red-900/40"
                    >
                        <Phone size={20} className="rotate-[135deg]" />
                        <span className="hidden md:inline font-black text-xs uppercase tracking-[0.2em]">End</span>
                    </button>

                    <div className="w-px h-8 bg-white/10 hidden md:block"></div>

                    <button
                        onClick={() => setActiveSidebar(activeSidebar === 'people' ? 'none' : 'people')}
                        title="Participants"
                        className={`p-4 rounded-full transition-all duration-300 ${activeSidebar === 'people' ? 'bg-church-gold text-black shadow-lg shadow-church-gold/20' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                    >
                        <div className="relative">
                            <Users size={20} />
                            <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                                {participantCount}
                            </span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveSidebar(activeSidebar === 'chat' ? 'none' : 'chat')}
                        title="Chat"
                        className={`p-4 rounded-full transition-all duration-300 ${activeSidebar === 'chat' ? 'bg-church-green text-white shadow-lg shadow-church-green/20' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                    >
                        <MessageSquare size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LiveSessionScreen;
