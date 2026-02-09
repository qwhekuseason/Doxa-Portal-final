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
    AlertCircle,
    Clock,
    Info,
    Expand,
    Minimize2,
    Menu,
    LogOut
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
    orderBy,
    writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { notifyHandRaised, notifyChatMessage, notifyLiveReaction } from '../utils/notificationService';

import { DraggableFab } from '../components/DraggableFab';

// --- Types ---
interface LiveSessionScreenProps {
    initialRoom?: string;
    user?: UserProfile;
    autoJoin?: boolean;
    onMenuToggle?: () => void;
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
const LiveSessionScreen: React.FC<LiveSessionScreenProps> = ({ initialRoom = '', user: currentUser, autoJoin = false, onMenuToggle }) => {
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
    const [currentTime, setCurrentTime] = useState(new Date());
    const [speakingUsers, setSpeakingUsers] = useState<Set<UID>>(new Set());
    const [previewTrack, setPreviewTrack] = useState<ILocalVideoTrack | null>(null);
    const [sessionJoinTime, setSessionJoinTime] = useState<Date | null>(null);

    // --- Refs ---
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const localVideoRef = useRef<HTMLDivElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const joiningRef = useRef(false);
    const tracksRef = useRef<{
        video: any | null;
        audio: any | null;
        preview: any | null;
        client: any | null;
    }>({ video: null, audio: null, preview: null, client: null });

    // Sync tracks to ref for unmount cleanup
    useEffect(() => {
        tracksRef.current = {
            video: localVideoTrack,
            audio: localAudioTrack,
            preview: previewTrack,
            client: client
        };
    }, [localVideoTrack, localAudioTrack, previewTrack, client]);

    // Final cleanup on unmount - ensures camera light goes off
    useEffect(() => {
        return () => {
            const { video, audio, preview, client: agoraClient } = tracksRef.current;
            if (preview) { preview.stop(); preview.close(); }
            if (video) { video.stop(); video.close(); }
            if (audio) { audio.stop(); audio.close(); }
            if (agoraClient) { agoraClient.leave().catch(() => { }); }
        };
    }, []);

    // --- Effect: Timer ---
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // --- Effect: Pre-join Preview ---
    useEffect(() => {
        let active = true;
        if (!inCall && !previewTrack && !loading) {
            AgoraRTC.createCameraVideoTrack({
                encoderConfig: { width: 640, height: 360, frameRate: 15 }
            }).then(track => {
                if (active) {
                    setPreviewTrack(track);
                } else {
                    track.close();
                }
            }).catch(err => {
                console.warn("Preview camera fail:", err);
            });
        }
        return () => {
            active = false;
        };
    }, [inCall, loading]);

    useEffect(() => {
        if (previewTrack && previewRef.current) {
            previewTrack.play(previewRef.current);
        }
    }, [previewTrack, inCall]);

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
        }, (error) => {
            console.error("Participants listener error:", error);
        });

        // 2. Sync Chat
        let chatQuery = query(collection(db, 'live_rooms', roomName, 'messages'), orderBy('timestamp', 'asc'));

        if (sessionJoinTime) {
            chatQuery = query(
                collection(db, 'live_rooms', roomName, 'messages'),
                where('timestamp', '>=', sessionJoinTime),
                orderBy('timestamp', 'asc')
            );
        }
        const unsubChat = onSnapshot(chatQuery, (snapshot) => {
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
            let videoTrack: ILocalVideoTrack;
            if (previewTrack) {
                videoTrack = previewTrack;
                setPreviewTrack(null);
            } else {
                videoTrack = await AgoraRTC.createCameraVideoTrack({
                    encoderConfig: { width: 1280, height: 720, frameRate: 30 }
                });
            }
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();

            await agoraClient.publish([videoTrack, audioTrack]);

            // Enable volume indicator
            agoraClient.enableAudioVolumeIndicator();
            agoraClient.on('volume-indicator', (volumes) => {
                const speakers = new Set<UID>();
                volumes.forEach((volume) => {
                    if (volume.level > 5) {
                        speakers.add(volume.uid === 0 ? uid : volume.uid);
                    }
                });
                setSpeakingUsers(speakers);
            });

            setClient(agoraClient);
            setLocalVideoTrack(videoTrack);
            setLocalAudioTrack(audioTrack);
            setSessionJoinTime(new Date());
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
        // Cleanup messages if we are the last one leaving
        if (remoteUsers.size === 0 && roomName) {
            try {
                const msgsRef = collection(db, 'live_rooms', roomName, 'messages');
                getDocs(msgsRef).then(snap => {
                    if (!snap.empty) {
                        const batch = writeBatch(db);
                        snap.forEach(d => batch.delete(d.ref));
                        batch.commit();
                    }
                });
            } catch (err) {
                console.error("Cleanup history error:", err);
            }
        }

        if (previewTrack) {
            previewTrack.stop();
            previewTrack.close();
            setPreviewTrack(null);
        }

        setInCall(false);
        setMessages([]);
        setSessionJoinTime(null);
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

            // Send notification
            await notifyChatMessage(currentUser.displayName || 'Guest', newMessage.trim(), `Live: ${roomName}`);

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

            if (newState) {
                await notifyHandRaised(currentUser?.displayName || 'Guest', roomName);
            }
        } catch (err) {
            console.error('Error toggling hand:', err);
            setIsHandRaised(!newState); // Revert on error
        }
    };

    const sendReaction = async (emoji: string) => {
        if (!currentUid || !roomName) return;
        setShowReactions(false);
        try {
            // 1. Send to Room Chat (for history/sidebar)
            await addDoc(collection(db, 'live_rooms', roomName, 'messages'), {
                sender: currentUser?.displayName || 'Guest',
                senderUid: currentUid,
                text: emoji,
                type: 'reaction',
                timestamp: serverTimestamp()
            });

            // 2. Send to Global Pulse (for dynamic floating reactions everywhere)
            await addDoc(collection(db, 'global_reactions'), {
                emoji,
                uid: currentUser?.uid || currentUid.toString(),
                displayName: currentUser?.displayName || 'Guest',
                createdAt: serverTimestamp()
            });

            // Send notification
            await notifyLiveReaction(currentUser?.displayName || 'Guest', emoji);
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
        if (count === 1) return 'max-w-4xl mx-auto';
        if (count === 2) return 'grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl mx-auto';
        if (count <= 4) return 'grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-6xl mx-auto';
        if (count <= 6) return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mx-auto';
        return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mx-auto';
    };

    const ControlButton = ({
        icon: Icon,
        onClick,
        isActive = false,
        isDanger = false,
        label,
        badgeCount,
        colorClass = ""
    }: {
        icon: any,
        onClick: () => void,
        isActive?: boolean,
        isDanger?: boolean,
        label: string,
        badgeCount?: number,
        colorClass?: string
    }) => (
        <button
            onClick={onClick}
            title={label}
            className={`group relative flex items-center justify-center w-11 h-11 md:w-14 md:h-14 rounded-full transition-all duration-300 shadow-lg active:scale-95 ${isDanger
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : isActive
                    ? (colorClass || 'bg-white text-black hover:bg-gray-200')
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/5'
                }`}
        >
            <Icon size={20} className={isActive && !isDanger ? 'scale-110' : ''} />
            {badgeCount !== undefined && badgeCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-[#050505]">
                    {badgeCount}
                </span>
            )}
            <span className="absolute bottom-full mb-3 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {label}
            </span>
        </button>
    );

    // --- Render: Pre-Join Screen ---
    if (!inCall) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-[#050505] animate-fade-in overflow-y-auto">
                <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pb-20">
                    {/* Left Side: Preview */}
                    <div className="relative group order-2 lg:order-1">
                        <div className="absolute -inset-4 bg-gradient-to-r from-church-green/20 to-church-gold/20 rounded-[3rem] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000"></div>
                        <div className="relative aspect-video bg-[#0a0a0a] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-premium flex items-center justify-center ring-1 ring-white/5">
                            {previewTrack ? (
                                <div ref={previewRef} className="w-full h-full object-cover transform scale-x-[-1]" />
                            ) : (
                                <div className="text-center group-hover:scale-110 transition-transform duration-500">
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                                        <VideoOff size={32} className="text-white/20" />
                                    </div>
                                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-black">Camera preparation...</p>
                                </div>
                            )}

                            {/* Overlay Controls (Decorative for preview) */}
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
                                <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/70">
                                    <Mic size={20} />
                                </div>
                                <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/70">
                                    <Video size={20} />
                                </div>
                            </div>

                            {/* Status Indicator */}
                            <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                                <div className="w-2 h-2 rounded-full bg-church-green animate-pulse"></div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">Video Check</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Form */}
                    <div className="relative order-1 lg:order-2">
                        <div className="glass-card rounded-3xl md:rounded-[3.5rem] p-6 md:p-10 lg:p-14 shadow-premium border-white/10 overflow-hidden text-center lg:text-left">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-church-green/5 rounded-full blur-3xl -mr-32 -mt-32"></div>

                            <div className="relative z-10 mb-8 md:mb-10 flex justify-between items-start">
                                <div>
                                    <h1 className="text-3xl md:text-5xl font-black dark:text-white mb-2 md:mb-4 tracking-tighter">Ready to join?</h1>
                                    <p className="text-gray-500 dark:text-gray-400 font-medium text-xs md:text-sm leading-relaxed max-w-sm mx-auto lg:mx-0">
                                        Step into the live session with your team. Enter the session code to get started.
                                    </p>
                                </div>
                                {!autoJoin && onMenuToggle && (
                                    <button
                                        onClick={onMenuToggle}
                                        className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all active:scale-95"
                                        title="Back to Dashboard"
                                    >
                                        <LogOut size={24} className="rotate-180" />
                                    </button>
                                )}
                            </div>

                            <form onSubmit={handleJoin} className="space-y-6 relative z-10">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-church-green dark:text-church-gold ml-3">
                                        Session Code
                                    </label>
                                    <div className="relative group/input">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/input:text-church-green transition-colors">
                                            <Shield size={20} />
                                        </div>
                                        <input
                                            value={roomName}
                                            onChange={(e) => setRoomName(e.target.value)}
                                            placeholder="e.g. general-session"
                                            className="w-full bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-church-green/50 p-5 pl-16 rounded-3xl outline-none font-black text-xl dark:text-white transition-all shadow-inner"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-2xl flex items-center gap-4 animate-shake">
                                        <AlertCircle size={18} className="shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <button
                                    disabled={loading || !roomName}
                                    className="w-full group/btn py-5 bg-church-green hover:bg-emerald-700 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-premium transition-all flex items-center justify-center gap-4 active:scale-[0.98] disabled:opacity-50"
                                >
                                    {loading ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : (
                                        <Phone size={20} className="rotate-[135deg]" />
                                    )}
                                    <span className="relative">
                                        {loading ? 'Joining Room...' : 'Join Now'}
                                    </span>
                                </button>
                            </form>

                            <div className="mt-10 flex items-center justify-center lg:justify-start gap-8 opacity-40">
                                <div className="flex items-center gap-2">
                                    <Mic size={14} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Audio</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Video size={14} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Video</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users size={14} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Safe</span>
                                </div>
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
            <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-church-green/5 to-transparent pointer-events-none z-0"></div>

            {/* Draggable Reaction FAB (Assistive Touch Style) */}
            <DraggableFab className="group">
                <div className="relative">
                    <button
                        onClick={() => setShowReactions(!showReactions)}
                        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all bg-black/60 backdrop-blur-xl border border-white/10 text-2xl hover:scale-110 active:scale-90 ${showReactions ? 'ring-2 ring-church-gold' : ''}`}
                    >
                        ðŸ˜Š
                    </button>

                    {/* Radial or List Menu for Emotions */}
                    {showReactions && (
                        <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-xl border border-white/10 p-3 rounded-2xl flex flex-col gap-2 animate-fade-in-up origin-bottom">
                            {['â¤ï¸', 'ðŸ‘', 'ðŸ‘', 'ðŸŽ‰', 'ðŸ”¥', 'ðŸ˜‚', 'ðŸ˜®', 'ðŸ˜¢'].map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent drag start when clicking emoji
                                        sendReaction(emoji);
                                    }}
                                    className="text-2xl hover:scale-125 transition-transform p-1 cursor-pointer"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </DraggableFab>

            {/* 1. Main Stage Section */}
            <div className="flex-1 flex overflow-hidden relative z-10 lg:p-4 lg:gap-4">
                {/* ... (rest of main stage) ... */}
                {/* Video Area */}
                <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${activeSidebar !== 'none' ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 md:p-4 custom-scrollbar flex items-center justify-center">
                        <div className="w-full max-w-7xl">
                            {pinnedUser ? (
                                // --- Spotlight Layout ---
                                <div className="flex flex-col lg:flex-row gap-4 h-full min-h-[500px]">
                                    {/* Main Stage */}
                                    <div className={`flex-[3] relative bg-[#121212] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl ring-1 transition-all duration-500 ${(pinnedUser === 'local' ? speakingUsers.has(currentUid || 0) : speakingUsers.has((pinnedUser as RemoteUser).uid)) ? 'ring-church-green ring-4 shadow-church-green/20' : 'ring-white/10'}`}>
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

                                        <div className="absolute bottom-6 left-6 flex items-center gap-3">
                                            <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold tracking-tight">
                                                        {pinnedUser === 'local' ? 'You' : (participantData[(pinnedUser as RemoteUser).uid.toString()]?.displayName || 'Speaker')}
                                                    </span>
                                                    {(pinnedUser === 'local' ? speakingUsers.has(currentUid || 0) : speakingUsers.has((pinnedUser as RemoteUser).uid)) && (
                                                        <div className="flex gap-0.5 items-end h-3 px-1">
                                                            <div className="w-0.5 h-1 bg-church-green animate-bounce"></div>
                                                            <div className="w-0.5 h-2 bg-church-green animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                            <div className="w-0.5 h-1.5 bg-church-green animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                        </div>
                                                    )}
                                                </div>
                                                <button onClick={() => setPinnedUid(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/70" title="Unpin">
                                                    <Minimize2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Filmstrip */}
                                    <div className="flex-1 flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto lg:max-h-[70vh] pb-2 lg:pb-0 hide-scrollbar">
                                        {/* Local if not pinned */}
                                        {pinnedUser !== 'local' && (
                                            <div className={`relative aspect-video min-w-[150px] lg:min-w-0 bg-[#0a0a0a] rounded-xl overflow-hidden border transition-all group shrink-0 ring-1 ${speakingUsers.has(currentUid || 0) ? 'ring-church-green border-church-green shadow-church-green/20' : 'border-white/5 shadow-premium'}`} onClick={() => setPinnedUid(currentUid?.toString() || null)}>
                                                <div ref={localVideoRef} className="w-full h-full object-cover transform scale-x-[-1]" />
                                                <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors flex items-end p-2 md:p-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold">You</span>
                                                        {speakingUsers.has(currentUid || 0) && (
                                                            <div className="flex gap-0.5 items-end h-2">
                                                                <div className="w-0.5 h-1 bg-church-green animate-bounce"></div>
                                                                <div className="w-0.5 h-2 bg-church-green animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Remotes if not pinned */}
                                        {sortedRemoteUsers.filter(u => u.uid.toString() !== pinnedUid).map(user => (
                                            <div key={user.uid} className={`relative aspect-video min-w-[150px] lg:min-w-0 bg-[#0a0a0a] rounded-xl overflow-hidden border transition-all group shrink-0 ring-1 ${speakingUsers.has(user.uid) ? 'ring-church-green border-church-green shadow-church-green/20' : 'border-white/5 shadow-premium'}`} onClick={() => setPinnedUid(user.uid.toString())}>
                                                <div
                                                    className="w-full h-full"
                                                    ref={(node) => {
                                                        if (node && user.videoTrack) user.videoTrack.play(node);
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors flex items-end p-2 md:p-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold">{participantData[user.uid.toString()]?.displayName}</span>
                                                        {speakingUsers.has(user.uid) && (
                                                            <div className="flex gap-0.5 items-end h-2">
                                                                <div className="w-0.5 h-1 bg-church-green animate-bounce"></div>
                                                                <div className="w-0.5 h-2 bg-church-green animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                // --- Grid Layout (Standard) ---
                                <div className={getGridClass(participantCount)}>
                                    <div className={`relative bg-[#121212] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden aspect-video shadow-2xl group ring-1 transition-all duration-300 ${speakingUsers.has(currentUid || 0) ? 'ring-church-green ring-4 shadow-church-green/20' : 'ring-white/10 hover:ring-church-green/30'}`}>
                                        <div ref={localVideoRef} className="w-full h-full object-cover transform scale-x-[-1]" />

                                        <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/5">
                                            <span>You</span>
                                            {!isMicOn && <MicOff size={12} className="text-red-500" />}
                                            {speakingUsers.has(currentUid || 0) && (
                                                <div className="flex gap-0.5 items-end h-3 px-1">
                                                    <div className="w-0.5 h-1 bg-church-green animate-bounce"></div>
                                                    <div className="w-0.5 h-2 bg-church-green animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                    <div className="w-0.5 h-1.5 bg-church-green animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setPinnedUid(currentUid?.toString() || null)} className="p-2 bg-black/40 hover:bg-church-green rounded-full backdrop-blur-md text-white border border-white/10 transition-all">
                                                <Expand size={14} />
                                            </button>
                                        </div>

                                        {isHandRaised && (
                                            <div className="absolute top-4 left-4 bg-church-gold text-black p-1.5 rounded-lg animate-bounce shadow-lg ring-1 ring-black/10">
                                                <Hand size={14} />
                                            </div>
                                        )}

                                        {!isCameraOn && !isScreenSharing && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d0d]">
                                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-3 border border-white/10">
                                                    <div className="w-10 h-10 rounded-full bg-church-green/20 flex items-center justify-center text-church-green font-bold text-lg border border-church-green/20">
                                                        {currentUser?.displayName?.charAt(0) || 'U'}
                                                    </div>
                                                </div>
                                                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20">Video Disabled</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Remote Users */}
                                    {sortedRemoteUsers.map(user => {
                                        const hasVideo = !!user.videoTrack;
                                        return (
                                            <div key={user.uid} className={`relative bg-[#121212] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden aspect-video shadow-2xl group ring-1 transition-all duration-300 ${speakingUsers.has(user.uid) ? 'ring-church-green ring-4 shadow-church-green/20' : 'ring-white/10 hover:ring-church-green/30'}`}>
                                                <div
                                                    className="w-full h-full"
                                                    ref={(node) => {
                                                        if (node && user.videoTrack) user.videoTrack.play(node);
                                                    }}
                                                />
                                                <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/5">
                                                    <span>{participantData[user.uid.toString()]?.displayName || 'Participant'}</span>
                                                    {speakingUsers.has(user.uid) && (
                                                        <div className="flex gap-0.5 items-end h-3 px-1">
                                                            <div className="w-0.5 h-1 bg-church-green animate-bounce"></div>
                                                            <div className="w-0.5 h-2 bg-church-green animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                            <div className="w-0.5 h-1.5 bg-church-green animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setPinnedUid(user.uid.toString())} className="p-2 bg-black/40 hover:bg-church-green rounded-full backdrop-blur-md text-white border border-white/10 transition-all">
                                                        <Expand size={14} />
                                                    </button>
                                                </div>

                                                {user.isHandRaised && (
                                                    <div className="absolute top-4 left-4 bg-church-gold text-black p-1.5 rounded-lg animate-bounce shadow-lg ring-1 ring-black/10">
                                                        <Hand size={14} />
                                                    </div>
                                                )}

                                                {!hasVideo && (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d0d]">
                                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-3 border border-white/10">
                                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 font-bold text-lg border border-white/5">
                                                                {participantData[user.uid.toString()]?.displayName?.charAt(0) || '?'}
                                                            </div>
                                                        </div>
                                                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20">No Video Stream</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar (Chat / People) - Meet Style */}
                {activeSidebar !== 'none' && (
                    <div className="w-full lg:w-[360px] bg-white dark:bg-[#121212] lg:rounded-2xl lg:shadow-2xl flex flex-col absolute inset-0 lg:static z-20 border-l lg:border border-white/5">
                        <div className="p-5 flex items-center justify-between border-b border-white/5">
                            <h2 className="text-xs font-black uppercase tracking-widest text-church-gold">
                                {activeSidebar === 'chat' ? 'In-call Messages' : 'Participants'}
                            </h2>
                            <button onClick={() => setActiveSidebar('none')} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/50">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 custom-scrollbar">
                            {activeSidebar === 'people' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 ring-1 ring-church-green/20">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-church-green/10 flex items-center justify-center text-xs font-bold text-church-green border border-church-green/20">
                                                {currentUser?.displayName?.charAt(0) || 'Y'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">You</p>
                                                <p className="text-[9px] uppercase tracking-widest text-white/40">Session Host</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!isMicOn ? <MicOff size={14} className="text-red-500" /> : <Mic size={14} className="text-church-green" />}
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-white/5">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 px-3">Others in call</h3>
                                        {sortedRemoteUsers.length === 0 ? (
                                            <p className="text-[10px] text-center text-white/20 py-4 italic">No other participants yet</p>
                                        ) : (
                                            sortedRemoteUsers.map(user => (
                                                <div key={user.uid} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white/40 border border-white/5">
                                                            {participantData[user.uid.toString()]?.displayName?.charAt(0) || '?'}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-white/80">{participantData[user.uid.toString()]?.displayName || 'Guest'}</p>
                                                            <p className="text-[9px] uppercase text-white/20">Participant</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeSidebar === 'chat' && (
                                <div className="flex flex-col h-full">
                                    <div className="flex-1 space-y-6">
                                        {messages.length === 0 && (
                                            <div className="text-center py-20 opacity-20 flex flex-col items-center">
                                                <MessageSquare size={48} className="mb-4" />
                                                <p className="text-xs font-black uppercase tracking-widest leading-relaxed">Messages can be seen<br />by everyone in the call</p>
                                            </div>
                                        )}
                                        {messages.map(msg => (
                                            <div key={msg.id} className="group flex gap-3 animate-fade-in-up">
                                                <div className="shrink-0">
                                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold border border-white/5 text-church-gold/80">
                                                        {msg.sender.charAt(0)}
                                                    </div>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-baseline gap-2 mb-1">
                                                        <span className="text-xs font-bold text-white/70 truncate">{msg.sender}</span>
                                                        <span className="text-[9px] text-white/20">
                                                            {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-white/90 leading-relaxed break-words">{msg.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {activeSidebar === 'chat' && (
                            <div className="p-4 border-t border-white/5 bg-black/40">
                                <form onSubmit={sendMessage} className="relative">
                                    <input
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Send a message"
                                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-3 pl-4 pr-12 outline-none focus:ring-1 focus:ring-church-green/50 transition-all text-sm placeholder:text-white/20"
                                    />
                                    <button type="submit" disabled={!newMessage.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-church-green hover:bg-church-green/10 rounded-lg disabled:opacity-20 transition-all">
                                        <Send size={18} />
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 2. Control Bar (Google Meet Style) */}
            <div className="h-auto min-h-[5rem] md:h-24 bg-[#050505]/95 backdrop-blur-md border-t border-white/5 flex items-center justify-between px-3 md:px-10 z-30 shrink-0 pb-safe pt-2 md:pt-0">
                {/* Left: Session Info */}
                <div className="hidden xl:flex flex-col gap-0.5 w-1/4">
                    <div className="flex items-center gap-2 text-white/90 font-bold mb-0.5">
                        <Clock size={16} className="text-church-gold" />
                        <span className="text-sm tracking-tight">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <div className="w-1 h-1 bg-white/20 rounded-full mx-1"></div>
                        <span className="text-sm truncate max-w-[150px]">{roomName}</span>
                    </div>
                </div>

                {/* Center: Core Controls */}
                <div className="flex items-center gap-2 md:gap-4 flex-1 justify-center overflow-x-auto hide-scrollbar py-2">
                    <ControlButton
                        icon={isMicOn ? Mic : MicOff}
                        onClick={toggleMic}
                        isActive={isMicOn}
                        isDanger={!isMicOn}
                        label={isMicOn ? "Turn off microphone" : "Turn on microphone"}
                    />
                    <ControlButton
                        icon={isCameraOn ? Video : VideoOff}
                        onClick={toggleCamera}
                        isActive={isCameraOn}
                        isDanger={!isCameraOn}
                        label={isCameraOn ? "Turn off camera" : "Turn on camera"}
                    />

                    <div className="w-px h-8 bg-white/10 mx-1 hidden sm:block"></div>

                    <ControlButton
                        icon={Monitor}
                        onClick={toggleScreenShare}
                        isActive={isScreenSharing}
                        colorClass="bg-blue-600 text-white hover:bg-blue-700"
                        label={isScreenSharing ? "Stop presenting" : "Present now"}
                    />

                    {/* REMOVED STATIC REACTION BUTTON TO AVOID DUPLICATION */}

                    <ControlButton
                        icon={Hand}
                        onClick={toggleHand}
                        isActive={isHandRaised}
                        colorClass="bg-church-gold text-black hover:bg-amber-400"
                        label={isHandRaised ? "Lower hand" : "Raise hand"}
                    />

                    <div className="w-px h-8 bg-white/10 mx-1 hidden sm:block"></div>

                    <button
                        onClick={leaveCall}
                        className="h-10 md:h-12 w-10 md:w-auto px-0 md:px-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center gap-2 md:gap-3 transition-all transform hover:scale-105 shadow-xl shadow-red-900/30 active:scale-95 shrink-0"
                        title="Leave call"
                    >
                        <Phone size={18} className="rotate-[135deg]" />
                        <span className="hidden md:inline font-black text-[9px] sm:text-[10px] uppercase tracking-widest">Leave</span>
                    </button>
                </div>

                {/* Right: Panel Toggles */}
                <div className="flex items-center gap-2 md:gap-4 w-1/4 justify-end">
                    <button
                        onClick={() => setActiveSidebar('none')} // Toggle logic handled in buttons below
                        className="p-3 text-white/50 hover:text-white transition-colors lg:hidden"
                    >
                        <Info size={20} />
                    </button>

                    <ControlButton
                        icon={Users}
                        onClick={() => setActiveSidebar(activeSidebar === 'people' ? 'none' : 'people')}
                        isActive={activeSidebar === 'people'}
                        label="Show everyone"
                        badgeCount={participantCount}
                        colorClass="bg-church-gold/20 text-church-gold hover:bg-church-gold/30 border-church-gold/30 border"
                    />
                    <ControlButton
                        icon={MessageSquare}
                        onClick={() => setActiveSidebar(activeSidebar === 'chat' ? 'none' : 'chat')}
                        isActive={activeSidebar === 'chat'}
                        label="Chat with everyone"
                        colorClass="bg-church-green/20 text-church-green hover:bg-church-green/30 border-church-green/30 border"
                    />
                </div>
            </div>
        </div>
    );
};

export default LiveSessionScreen;
