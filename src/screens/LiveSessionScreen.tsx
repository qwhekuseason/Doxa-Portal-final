import React, { useState, useEffect, useCallback } from 'react';
import AgoraRTC, {
    IAgoraRTCClient,
    ILocalVideoTrack,
    IMicrophoneAudioTrack,
    IRemoteVideoTrack,
    IRemoteAudioTrack,
    UID
} from 'agora-rtc-sdk-ng';
import { Video, Mic, MicOff, VideoOff, Monitor, Phone, Users, Loader2, AlertCircle, Shield } from 'lucide-react';
import { getAgoraAppId } from '../utils/agoraConfig';
import { prepareChannelName, generateUserId, handleAgoraError, isBrowserSupported, getAgoraToken } from '../utils/agoraService';

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
    getDocs
} from 'firebase/firestore';
import { db } from '../firebase';

interface LiveSessionScreenProps {
    initialRoom?: string;
    user?: UserProfile;
}

interface RemoteUser {
    uid: UID;
    displayName?: string;
    videoTrack?: IRemoteVideoTrack;
    audioTrack?: IRemoteAudioTrack;
}

const LiveSessionScreen: React.FC<LiveSessionScreenProps> = ({ initialRoom = '', user: currentUser }) => {
    const [roomName, setRoomName] = useState(initialRoom);
    const [inCall, setInCall] = useState(false);
    const [loading, setLoading] = useState(false);
    const [client, setClient] = useState<IAgoraRTCClient | null>(null);
    const [localVideoTrack, setLocalVideoTrack] = useState<ILocalVideoTrack | null>(null);
    const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [remoteUsers, setRemoteUsers] = useState<Map<UID, RemoteUser>>(new Map());
    const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
    const [error, setError] = useState<string>('');
    const [currentUid, setCurrentUid] = useState<number | null>(null);

    // Sync participant names for this room
    useEffect(() => {
        if (!inCall || !roomName) return;

        const q = query(collection(db, 'live_participants'), where('roomName', '==', roomName));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const names: Record<string, string> = {};
            snapshot.forEach((doc) => {
                const data = doc.data();
                names[data.uid.toString()] = data.displayName || 'Guest';
            });
            setParticipantNames(names);
        });

        return () => unsubscribe();
    }, [inCall, roomName]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (localVideoTrack) {
                localVideoTrack.close();
            }
            if (localAudioTrack) {
                localAudioTrack.close();
            }
            if (client) {
                client.leave();
                // Remove sync doc
                if (currentUid && roomName) {
                    deleteDoc(doc(db, 'live_participants', `${roomName}_${currentUid}`)).catch(console.error);
                }
            }
        };
    }, [client, localVideoTrack, localAudioTrack, currentUid, roomName]);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedRoom = roomName.trim();
        if (!trimmedRoom) return;

        setLoading(true);
        setError('');

        try {
            // Verify meeting code
            const q = query(collection(db, 'live_rooms'), where('channelName', '==', trimmedRoom));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                const qName = query(collection(db, 'live_rooms'), where('name', '==', trimmedRoom));
                const querySnapshotName = await getDocs(qName);

                if (querySnapshotName.empty) {
                    setError('Invalid meeting code. Please ask the host for the correct code.');
                    setLoading(false);
                    return;
                }
            }

            const channelName = prepareChannelName(trimmedRoom);
            const appId = getAgoraAppId();
            const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

            agoraClient.on('user-published', async (user, mediaType) => {
                await agoraClient.subscribe(user, mediaType);
                setRemoteUsers(prev => {
                    const newMap = new Map(prev);
                    const existingUser = newMap.get(user.uid) || { uid: user.uid };
                    if (mediaType === 'video') existingUser.videoTrack = user.videoTrack;
                    if (mediaType === 'audio') existingUser.audioTrack = user.audioTrack;
                    newMap.set(user.uid, existingUser);
                    return newMap;
                });
            });

            agoraClient.on('user-unpublished', (user, mediaType) => {
                setRemoteUsers(prev => {
                    const newMap = new Map(prev);
                    const existingUser = newMap.get(user.uid);
                    if (existingUser) {
                        if (mediaType === 'video') existingUser.videoTrack = undefined;
                        if (mediaType === 'audio') existingUser.audioTrack = undefined;
                        newMap.set(user.uid, existingUser);
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
            await agoraClient.join(appId, channelName, token, uid);

            // Register presence in Firestore for naming
            await setDoc(doc(db, 'live_participants', `${trimmedRoom}_${uid}`), {
                roomName: trimmedRoom,
                uid,
                displayName: currentUser?.displayName || 'Guest',
                photoURL: currentUser?.photoURL || '',
                joinedAt: serverTimestamp()
            });

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

        } catch (err: any) {
            setError(handleAgoraError(err));
            setLoading(false);
        }
    };

    const toggleCamera = useCallback(async () => {
        if (localVideoTrack) {
            await localVideoTrack.setEnabled(!isCameraOn);
            setIsCameraOn(!isCameraOn);
        }
    }, [localVideoTrack, isCameraOn]);

    const toggleMic = useCallback(async () => {
        if (localAudioTrack) {
            await localAudioTrack.setEnabled(!isMicOn);
            setIsMicOn(!isMicOn);
        }
    }, [localAudioTrack, isMicOn]);

    const toggleScreenShare = useCallback(async () => {
        if (!client) return;

        try {
            if (isScreenSharing) {
                if (localVideoTrack) {
                    await client.unpublish(localVideoTrack);
                    localVideoTrack.close();
                }
                const cameraTrack = await AgoraRTC.createCameraVideoTrack();
                cameraTrack.play('local-player');
                await client.publish(cameraTrack);
                setLocalVideoTrack(cameraTrack);
                setIsScreenSharing(false);
            } else {
                if (localVideoTrack) {
                    await client.unpublish(localVideoTrack);
                    localVideoTrack.close();
                }
                const screenTrack = await AgoraRTC.createScreenVideoTrack({
                    encoderConfig: { width: 1920, height: 1080, frameRate: 15 }
                }, 'auto');

                if (Array.isArray(screenTrack)) {
                    screenTrack[0].play('local-player');
                    await client.publish(screenTrack);
                    setLocalVideoTrack(screenTrack[0]);
                } else {
                    screenTrack.play('local-player');
                    await client.publish(screenTrack);
                    setLocalVideoTrack(screenTrack);
                    screenTrack.on('track-ended', () => {
                        setIsScreenSharing(false);
                        // Switch back to camera omitted here for simplicity, or we can call toggleScreenShare()
                        // But recursive calls in useCallback can be tricky. Let's just reset state.
                    });
                }
                setIsScreenSharing(true);
            }
        } catch (err) {
            console.error('Screen share error:', err);
            setError('Failed to share screen. Please try again.');
        }
    }, [client, localVideoTrack, isScreenSharing]);

    const leaveCall = useCallback(async () => {
        if (localVideoTrack) localVideoTrack.close();
        if (localAudioTrack) localAudioTrack.close();
        if (client) {
            await client.leave();
            setClient(null);
            if (currentUid && roomName) {
                deleteDoc(doc(db, 'live_participants', `${roomName}_${currentUid}`)).catch(console.error);
            }
        }
        setInCall(false);
        setRemoteUsers(new Map());
        setIsScreenSharing(false);
    }, [client, localVideoTrack, localAudioTrack, currentUid, roomName]);

    useEffect(() => {
        if (inCall && localVideoTrack) {
            localVideoTrack.play('local-player');
        }
    }, [inCall, localVideoTrack, isScreenSharing]);

    useEffect(() => {
        remoteUsers.forEach(user => {
            const el = document.getElementById(`user-${user.uid}`);
            if (el && user.videoTrack) user.videoTrack.play(el);
        });
    }, [remoteUsers]);

    if (inCall && client) {
        const participantCount = remoteUsers.size + 1;

        return (
            <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col overflow-hidden font-sans animate-fade-in">
                {/* Dynamic Video Grid */}
                <div className={`flex-1 p-4 md:p-8 grid gap-4 md:gap-8 overflow-y-auto content-center justify-items-center ${participantCount === 1 ? 'grid-cols-1' :
                    participantCount === 2 ? 'grid-cols-1 md:grid-cols-2' :
                        participantCount <= 4 ? 'grid-cols-2' :
                            'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                    }`}>

                    {/* Local Participant Tile */}
                    <div className={`group relative bg-gray-900 rounded-[3rem] overflow-hidden shadow-2xl border-2 transition-all duration-700 w-full h-full max-h-[85vh] ${isMicOn ? 'border-church-green/20' : 'border-red-500/20'
                        }`}>
                        <div id="local-player" className="w-full h-full object-cover scale-[1.02]"></div>
                        {!isCameraOn && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] z-10">
                                <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-xl border border-white/5">
                                    <VideoOff size={32} className="text-gray-500" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600">Camera Suspended</span>
                            </div>
                        )}

                        <div className="absolute top-8 right-8 flex flex-col gap-4 z-20">
                            {!isMicOn && (
                                <div className="bg-red-500/90 backdrop-blur-md p-4 rounded-2xl shadow-xl flex items-center justify-center animate-bounce border border-red-400/50">
                                    <MicOff size={18} className="text-white" />
                                </div>
                            )}
                        </div>

                        <div className="absolute bottom-8 left-8 flex items-center gap-4 bg-black/40 backdrop-blur-md px-6 py-4 rounded-[2rem] border border-white/10 z-20 shadow-2xl">
                            <div className="w-2.5 h-2.5 rounded-full bg-church-green animate-pulse"></div>
                            <span className="text-white text-xs font-black uppercase tracking-widest">
                                {currentUser?.displayName?.split(' ')[0] || 'Member'} (You)
                            </span>
                        </div>
                    </div>

                    {/* Remote Participant Tiles */}
                    {Array.from(remoteUsers.values()).map((user) => (
                        <div key={user.uid} className="relative bg-gray-900 rounded-[3rem] overflow-hidden shadow-2xl border-2 border-white/5 w-full h-full max-h-[85vh] hover:border-church-green/20 transition-all duration-500">
                            <div id={`user-${user.uid}`} className="w-full h-full object-cover scale-[1.02]"></div>
                            {!user.videoTrack && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] z-10">
                                    <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-xl border border-white/5">
                                        <Users size={32} className="text-gray-600" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Waiting for Stream...</span>
                                </div>
                            )}
                            <div className="absolute bottom-8 left-8 flex items-center gap-4 bg-black/40 backdrop-blur-md px-6 py-4 rounded-[2rem] border border-white/10 z-20">
                                <span className="text-white text-xs font-black uppercase tracking-widest">
                                    {participantNames[user.uid.toString()] || `Member ${user.uid}`}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Premium Toned-Down Control Bar */}
                <div className="h-32 bg-black/60 backdrop-blur-md border-t border-white/10 flex items-center justify-center px-12 pb-4">
                    <div className="w-full max-w-7xl flex items-center justify-between">
                        {/* Room Info */}
                        <div className="hidden lg:flex flex-col gap-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Session Identity</span>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-church-green animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.5)]"></div>
                                <p className="text-white/90 font-serif text-2xl font-bold italic tracking-tight">{roomName}</p>
                            </div>
                        </div>

                        {/* Centered Controls */}
                        <div className="flex items-center gap-4 md:gap-6 bg-white/5 p-3 rounded-[2.5rem] border border-white/5 shadow-2xl">
                            <button
                                onClick={toggleMic}
                                className={`group w-14 h-14 md:w-16 md:h-16 rounded-[1.75rem] flex items-center justify-center transition-all duration-500 ${isMicOn
                                    ? 'bg-white/10 hover:bg-white/20 text-white'
                                    : 'bg-red-550 text-white shadow-[0_0_25px_rgba(239,68,68,0.3)]'
                                    }`}
                                style={{ backgroundColor: !isMicOn ? '#ef4444' : undefined }}
                            >
                                {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
                            </button>

                            <button
                                onClick={toggleCamera}
                                className={`group w-14 h-14 md:w-16 md:h-16 rounded-[1.75rem] flex items-center justify-center transition-all duration-500 ${isCameraOn
                                    ? 'bg-white/10 hover:bg-white/20 text-white'
                                    : 'bg-red-550 text-white shadow-[0_0_25px_rgba(239,68,68,0.3)]'
                                    }`}
                                style={{ backgroundColor: !isCameraOn ? '#ef4444' : undefined }}
                            >
                                {isCameraOn ? <Video size={22} /> : <VideoOff size={22} />}
                            </button>

                            <button
                                onClick={toggleScreenShare}
                                className={`group w-14 h-14 md:w-16 md:h-16 rounded-[1.75rem] flex items-center justify-center transition-all duration-500 ${isScreenSharing
                                    ? 'bg-church-green text-white shadow-[0_0_25px_rgba(34,197,94,0.3)]'
                                    : 'bg-white/10 hover:bg-white/20 text-white'
                                    }`}
                            >
                                <Monitor size={22} />
                            </button>

                            <div className="w-px h-10 bg-white/10 mx-2"></div>

                            <button
                                onClick={leaveCall}
                                className="h-14 md:h-16 px-8 md:px-12 bg-red-600 hover:bg-red-700 text-white rounded-[1.75rem] font-black text-xs uppercase tracking-[0.2em] flex items-center gap-4 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-red-900/20"
                            >
                                <Phone size={20} className="transform rotate-[135deg]" />
                                <span className="hidden sm:inline">End Session</span>
                            </button>
                        </div>

                        {/* Status / Participants Overlay */}
                        <div className="hidden lg:flex items-center gap-5">
                            <div className="text-right">
                                <p className="text-white font-black text-xs tracking-widest">{participantCount} Members</p>
                                <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">Engagement Live</p>
                            </div>
                            <div className="flex -space-x-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-9 h-9 rounded-full bg-white/5 border-2 border-[#050505] flex items-center justify-center">
                                        <Users size={14} className="text-church-green/50" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

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
                                {loading ? 'Engaging Connection...' : 'Join Fellowship'}
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
};

export default LiveSessionScreen;
