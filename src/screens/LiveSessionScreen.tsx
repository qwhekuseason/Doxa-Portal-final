import React, { useState } from 'react';
import { Video, Mic, Share2, Users, Loader2 } from 'lucide-react';

const LiveSessionScreen: React.FC<{ initialRoom?: string }> = ({ initialRoom = '' }) => {
    const [roomName, setRoomName] = useState(initialRoom);
    const [inCall, setInCall] = useState(false);
    const [loading, setLoading] = useState(false);

    // Auto-join if initialRoom is provided
    React.useEffect(() => {
        if (initialRoom && !inCall) {
            setRoomName(initialRoom);
        }
    }, [initialRoom]);

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomName.trim()) return;
        setLoading(true);
        // Simulate connection delay for better UX
        setTimeout(() => {
            setInCall(true);
            setLoading(false);
        }, 1500);
    };

    if (inCall) {
        return (
            <div className="flex flex-col h-[calc(100vh-80px)] lg:h-screen bg-black animate-in fade-in">
                {/* Jitsi Iframe */}
                <iframe
                    allow="camera; microphone; fullscreen; display-capture; autoplay"
                    src={`https://meet.jit.si/doxa-portal-${roomName.replace(/\s+/g, '-').toLowerCase()}`}
                    className="flex-1 w-full border-none"
                    title="Live Session"
                ></iframe>

                <div className="bg-gray-900 p-4 flex justify-between items-center text-white border-t border-gray-800">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        <span className="font-bold tracking-wider text-sm">LIVE: {roomName}</span>
                    </div>
                    <button
                        onClick={() => setInCall(false)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-fullscreen font-bold text-sm transition-colors"
                    >
                        Leave Meeting
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 animate-fade-in-up">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/20 rounded-3xl flex items-center justify-center mb-6 text-church-green">
                        <Video size={40} className="fill-current" />
                    </div>
                    <h1 className="text-3xl font-serif font-bold mb-2 dark:text-white">Live Sessions</h1>
                    <p className="text-gray-500 dark:text-gray-400">Join a Connect Group or Service instantly.</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700">
                    <form onSubmit={handleJoin} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">Room Name</label>
                            <div className="relative">
                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    value={roomName}
                                    onChange={(e) => setRoomName(e.target.value)}
                                    placeholder="e.g. SundayService"
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 rounded-xl font-bold border-none focus:ring-2 focus:ring-church-green/50 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <button
                            disabled={!roomName.trim() || loading}
                            className="w-full py-4 rounded-xl bg-church-green text-white font-bold text-lg shadow-lg shadow-church-green/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Join Session'}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-center text-xs text-gray-400 mb-4">POWERED BY JITSI MEET</p>
                        <div className="flex justify-center gap-6 opacity-50 grayscale transition-all hover:grayscale-0">
                            <div className="flex flex-col items-center gap-1">
                                <Video size={20} />
                                <span className="text-[10px] font-bold">HD Video</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <Mic size={20} />
                                <span className="text-[10px] font-bold">Clear Audio</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <Share2 size={20} />
                                <span className="text-[10px] font-bold">Screen Share</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveSessionScreen;
