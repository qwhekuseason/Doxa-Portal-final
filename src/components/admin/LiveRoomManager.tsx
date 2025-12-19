import React, { useState } from 'react';
import { Video, Plus, Trash2, Loader2, Copy, Check } from 'lucide-react';
import { addDoc, collection, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { prepareChannelName } from '../../utils/agoraService';

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
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold font-serif dark:text-white">Live Room Management</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Create and manage video conference rooms</p>
                </div>
            </div>

            {/* Create Room Section */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                            <Video size={20} className="text-church-green" />
                            New Meeting
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Generate a unique code for a new video session
                        </p>
                    </div>

                    <button
                        onClick={handleCreateRoom}
                        disabled={creating}
                        className="px-6 py-3 bg-church-green hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-church-green/20"
                    >
                        {creating ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                        Create Instant Meeting
                    </button>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg h-fit">
                        <Video size={20} className="text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-1">
                            Google Meet-style Sessions
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-200">
                            Clicking "Create Instant Meeting" will generate a unique code (e.g., <code className="bg-white dark:bg-black/20 px-1 py-0.5 rounded font-mono">abc-def-ghi</code>). Share this code with members to let them join. Up to 17 people can join a single call.
                        </p>
                    </div>
                </div>
            </div>

            {/* Rooms List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold dark:text-white">Active Rooms ({rooms.length})</h3>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="animate-spin mx-auto text-church-green" size={32} />
                    </div>
                ) : rooms.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <Video size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No rooms created yet. Create your first room above!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {rooms.map((room) => (
                            <div key={room.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="text-lg font-bold dark:text-white">{room.name}</h4>
                                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">
                                                Active
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                <strong>Code:</strong> <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-sm text-church-green font-bold tracking-wider">{room.channelName}</code>
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Created {new Date(room.createdAt).toLocaleDateString()} at {new Date(room.createdAt).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => copyChannelName(room.channelName, room.id)}
                                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                                            title="Copy channel name"
                                        >
                                            {copiedId === room.id ? (
                                                <>
                                                    <Check size={16} className="text-green-600" />
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={16} />
                                                    Copy Name
                                                </>
                                            )}
                                        </button>

                                        <button
                                            onClick={() => handleDeleteRoom(room.id, room.name)}
                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Delete room"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="bg-gradient-to-r from-church-green/10 to-emerald-600/10 dark:from-church-green/20 dark:to-emerald-600/20 p-6 rounded-2xl border border-church-green/20">
                <h4 className="font-bold text-gray-900 dark:text-white mb-3">How to use:</h4>
                <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li className="flex gap-2">
                        <span className="font-bold text-church-green">1.</span>
                        <span>Click "Create Instant Meeting" to generate a unique secure code</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold text-church-green">2.</span>
                        <span>Copy the meeting code (e.g., abc-def-ghi) and share it with others</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold text-church-green">3.</span>
                        <span>Members paste the code in "Live Sessions" to join the call</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold text-church-green">4.</span>
                        <span>Multiple people (up to 17) can join the same call using the code</span>
                    </li>
                </ol>
            </div>
        </div>
    );
};
