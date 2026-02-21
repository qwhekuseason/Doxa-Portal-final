import React, { useState } from 'react';
import { Video, Plus, Trash2, Loader2, Copy, Check } from 'lucide-react';
import { addDoc, collection, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { prepareChannelName } from '../../utils/agoraService';
import { notifyNewLiveMeeting } from '../../utils/notificationService';

interface LiveRoom {
    id: string;
    name: string;
    channelName: string;
    createdAt: string;
    createdBy: string;
}

export const LiveRoomManager: React.FC = () => {
    const [rooms, setRooms] = useState<LiveRoom[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    React.useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'live_rooms'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const roomsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as LiveRoom));
            setRooms(roomsData);
        } catch (error) {
            console.error('Error fetching rooms:', error);
        } finally {
            setLoading(false);
        }
    };

    // Generate random meeting code (e.g., abc-def-ghi)
    const generateMeetingCode = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        const part = () => Array(3).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
        return `${part()}-${part()}-${part()}`;
    };

    const handleCreateRoom = async () => {
        setCreating(true);
        try {
            const meetingCode = generateMeetingCode();

            // Channel name is the same as meeting code for simplicity
            const channelName = meetingCode;

            await addDoc(collection(db, 'live_rooms'), {
                name: `Meeting ${meetingCode}`,
                code: meetingCode,
                channelName: channelName,
                createdAt: new Date().toISOString(),
                createdBy: 'admin',
                active: true
            });

            await notifyNewLiveMeeting(meetingCode);

            fetchRooms();
            // Don't show alert, just update UI
        } catch (error: any) {
            console.error('Error creating room:', error);
            alert(error.message || 'Failed to create room. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteRoom = async (roomId: string, roomName: string) => {
        if (!confirm(`Delete room "${roomName}"?`)) return;

        try {
            // Delete from Firestore
            // Note: Agora channels don't need explicit deletion
            // They expire automatically after inactivity
            await deleteDoc(doc(db, 'live_rooms', roomId));

            fetchRooms();
            alert('Room deleted successfully!');
        } catch (error) {
            console.error('Error deleting room:', error);
            alert('Failed to delete room.');
        }
    };

    const copyChannelName = (channelName: string, roomId: string) => {
        navigator.clipboard.writeText(channelName);
        setCopiedId(roomId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in-up pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black dark:text-white tracking-tighter uppercase mb-1">Live Rooms</h2>
                    <p className="text-gray-500 font-medium text-xs md:text-sm uppercase tracking-wide">Manage your video conference channels.</p>
                </div>
            </div>

            {/* Create Room Section */}
            <div className="glass-card p-6 md:p-8 rounded-[2rem] border-white/40 shadow-premium">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h3 className="text-lg md:text-xl font-black dark:text-white flex items-center gap-3 mb-2">
                            <span className="w-10 h-10 rounded-xl bg-church-green/10 text-church-green flex items-center justify-center">
                                <Video size={20} />
                            </span>
                            New Meeting
                        </h3>
                        <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest pl-1">
                            Generate a secure code for live sessions
                        </p>
                    </div>

                    <button
                        onClick={handleCreateRoom}
                        disabled={creating}
                        className="px-6 py-4 bg-church-green text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50 shadow-lg shadow-church-green/20"
                    >
                        {creating ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                        Create Instant Meeting
                    </button>
                </div>

                <div className="p-4 md:p-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex gap-4">
                    <div className="shrink-0 p-2.5 bg-blue-500/10 text-blue-500 rounded-xl h-fit">
                        <Video size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
                            Google Meet-style Sessions
                        </p>
                        <p className="text-[11px] leading-relaxed text-blue-600/70 dark:text-blue-400/70 font-medium">
                            Clicking "Create Instant Meeting" generates a unique code (e.g., <code className="bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded font-mono text-blue-700 dark:text-blue-300 font-bold">abc-def-ghi</code>). Share this code with members to let them join. Up to 50 people can join a single call.
                        </p>
                    </div>
                </div>
            </div>

            {/* Rooms List */}
            <div className="glass-card rounded-[2rem] overflow-hidden border-white/40 shadow-premium">
                <div className="p-6 md:p-8 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Active Rooms ({rooms.length})</h3>
                </div>

                {loading ? (
                    <div className="p-16 text-center">
                        <Loader2 className="animate-spin mx-auto text-church-green mb-4" size={32} />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Rooms...</p>
                    </div>
                ) : rooms.length === 0 ? (
                    <div className="p-16 text-center text-gray-400">
                        <div className="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <Video size={32} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest">No active rooms found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                        {rooms.map((room) => (
                            <div key={room.id} className="p-6 md:p-8 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="text-base font-black dark:text-white tracking-tight truncate">{room.name}</h4>
                                            <span className="px-2.5 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-green-500/20">
                                                Active
                                            </span>
                                        </div>
                                        <div className="space-y-1.5 pl-1">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                <span className="font-bold uppercase tracking-wider text-[9px] opacity-70">Code:</span>
                                                <code className="bg-gray-100 dark:bg-white/10 px-2 py-1 rounded-lg text-church-green font-mono font-bold tracking-wider text-xs border border-gray-200 dark:border-white/5 group-hover:scale-105 transition-transform">{room.channelName}</code>
                                            </p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                                                Created {new Date(room.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-4 md:pt-0 border-t md:border-none border-gray-100 dark:border-white/5">
                                        <button
                                            onClick={() => copyChannelName(room.channelName, room.id)}
                                            className="flex-1 md:flex-none px-4 py-3 bg-gray-100 dark:bg-white/5 hover:bg-church-green/10 hover:text-church-green text-gray-600 dark:text-gray-300 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                                        >
                                            {copiedId === room.id ? (
                                                <>
                                                    <Check size={14} className="text-church-green" />Copied
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={14} /> Copy Code
                                                </>
                                            )}
                                        </button>

                                        <button
                                            onClick={() => handleDeleteRoom(room.id, room.name)}
                                            className="p-3 text-red-400 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all active:scale-90"
                                            title="Delete room"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="glass-card p-6 rounded-2xl border-church-green/20 bg-gradient-to-r from-church-green/5 to-emerald-500/5">
                <h4 className="font-black text-gray-900 dark:text-white mb-4 text-xs uppercase tracking-widest">How to use</h4>
                <div className="space-y-3">
                    {[
                        "Click 'Create Instant Meeting' to generate a unique code.",
                        "Copy the meeting code (e.g., abc-def-ghi).",
                        "Share it with members to let them join via 'Live Sessions'.",
                        "Up to 50 people can join a single call."
                    ].map((step, i) => (
                        <div key={i} className="flex gap-3 text-xs md:text-sm text-gray-600 dark:text-gray-300 font-medium">
                            <span className="font-black text-church-green w-4">{i + 1}.</span>
                            <span>{step}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
