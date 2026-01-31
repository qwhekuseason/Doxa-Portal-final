import React, { useState, useEffect } from 'react';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    doc,
    setDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import QRCode from 'react-qr-code';
import { Loader2, Users, Maximize2, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface Attendee {
    uid: string;
    displayName: string;
    photoURL?: string;
    scannedAt?: any;
    isOnline?: boolean;
    isNewMember?: boolean;
}

export const AttendanceProjector: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    // Session state
    const [sessionId, setSessionId] = useState<string>('');
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [totalAttendees, setTotalAttendees] = useState(0);
    const [lastAttendee, setLastAttendee] = useState<Attendee | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Create unique session ID based on current date (e.g., "2024-03-24")
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setSessionId(today);

        // Create the session document if it doesn't exist
        const createSession = async () => {
            try {
                const sessionRef = doc(db, 'attendance_sessions', today);
                console.log("📝 Initializing attendance session for:", today);
                await setDoc(sessionRef, {
                    createdAt: serverTimestamp(),
                    active: true,
                    code: today
                }, { merge: true });
                console.log("✅ Session initialized successfully");
            } catch (err: any) {
                console.error("❌ Failed to create attendance session:", err);
                if (err.code === 'permission-denied') {
                    setError("You don't have permission to start a session. Are you logged in as Admin?");
                }
            }
        };

        createSession();

        // Listen for real-time attendance updates
        // We remove the server-side orderBy to avoid index requirement issues
        const q = query(
            collection(db, 'attendance_sessions', today, 'attendees')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newAttendees = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            } as Attendee));

            // Manual sort by scannedAt desc to avoid needing a Firestore index
            newAttendees.sort((a, b) => {
                const timeA = a.scannedAt?.toDate?.()?.getTime() || 0;
                const timeB = b.scannedAt?.toDate?.()?.getTime() || 0;
                return timeB - timeA;
            });

            setAttendees(newAttendees);
            setTotalAttendees(snapshot.size);

            // Check if a new attendee just checked in (compare logic)
            if (newAttendees.length > 0 && loading === false) {
                // The first one is the latest after our manual sort
                setLastAttendee(newAttendees[0]);
                setTimeout(() => setLastAttendee(null), 5000); // Clear highlight after 5s
            }

            setLoading(false);
            console.log("📊 Attendance snapshot updated:", newAttendees.length, "present");
        }, (error) => {
            console.error("❌ Attendance Projector Snapshot Error:", error);
            setLoading(false);
            setError(`Connection Error: ${error.message}`);
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="fixed inset-0 z-[200] bg-black text-white flex flex-col items-center justify-center overflow-hidden">
            {/* Background Animations */}
            <div className="absolute inset-0 bg-gradient-to-br from-church-green/20 via-black to-blue-900/20 animate-pulse-slow"></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-church-green to-transparent animate-shimmer"></div>

            {/* Header / Controls */}
            <div className="absolute top-8 right-8 z-50 flex gap-4">
                <button onClick={onClose} className="p-4 bg-white/10 hover:bg-white/20 rounded-full transition-all">
                    <X size={24} />
                </button>
            </div>

            <div className="relative z-10 w-full max-w-7xl px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center h-full max-h-[90vh]">

                {/* Left Side: QR Code & Status */}
                <div className="flex flex-col items-center justify-center space-y-8 animate-in slide-in-from-left duration-700">
                    <div className="text-center space-y-2">
                        <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Check In Now
                        </h1>
                        <p className="text-xl md:text-2xl font-bold text-church-green uppercase tracking-[0.3em]">
                            Live Attendance System
                        </p>
                    </div>

                    <div className="p-8 bg-white rounded-[2.5rem] shadow-[0_0_100px_rgba(255,255,255,0.1)] transform hover:scale-105 transition-all duration-500">
                        {loading ? (
                            <div className="w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
                                <Loader2 className="animate-spin text-church-green" size={48} />
                            </div>
                        ) : error ? (
                            <div className="w-64 h-64 md:w-80 md:h-80 flex flex-col items-center justify-center text-center p-6">
                                <AlertCircle className="text-red-500 mb-4" size={48} />
                                <p className="text-black text-sm font-bold">{error}</p>
                            </div>
                        ) : (
                            <QRCode
                                value={`ATTENDANCE:${sessionId}`}
                                size={256}
                                className="w-64 h-64 md:w-80 md:h-80"
                                fgColor="#000000"
                                bgColor="#ffffff"
                                level="H"
                            />
                        )}
                    </div>

                    <div className="bg-white/5 backdrop-blur-lg border border-white/10 px-8 py-4 rounded-full flex items-center gap-4">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-black uppercase tracking-widest text-gray-400">
                            Scan with Doxa App
                        </span>
                    </div>
                </div>

                {/* Right Side: Live Feed of Attendees */}
                <div className="h-full max-h-[800px] flex flex-col bg-white/5 backdrop-blur-md rounded-[3rem] border border-white/10 overflow-hidden animate-in slide-in-from-right duration-700 relative">
                    {/* Header */}
                    <div className="p-8 border-b border-white/5 bg-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Users size={24} className="text-church-green" />
                            <span className="text-lg font-black uppercase tracking-widest">Present Today</span>
                        </div>
                        <div className="px-5 py-2 bg-church-green text-white rounded-xl font-black text-2xl">
                            {totalAttendees}
                        </div>
                    </div>

                    {/* Active Attendee Animation (Pop-up) */}
                    {lastAttendee && (
                        <div className="absolute top-24 left-4 right-4 z-20 mx-auto animate-in zoom-in slide-in-from-bottom duration-500">
                            <div className="bg-gradient-to-r from-church-green to-emerald-600 p-1 rounded-3xl shadow-2xl">
                                <div className="bg-[#111] rounded-[1.3rem] p-6 flex items-center gap-6">
                                    <img
                                        src={lastAttendee.photoURL || `https://ui-avatars.com/api/?name=${lastAttendee.displayName}&background=fff&color=000`}
                                        className="w-20 h-20 rounded-2xl object-cover border-2 border-white"
                                    />
                                    <div>
                                        <div className="flex items-center gap-2 text-church-green mb-1">
                                            <CheckCircle2 size={20} className={lastAttendee.isNewMember ? "text-church-gold" : "text-church-green"} />
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${lastAttendee.isNewMember ? "text-church-gold" : "text-church-green"}`}>
                                                {lastAttendee.isNewMember ? '🎉 New Member Alert!' : 'Just Checked In!'}
                                            </span>
                                        </div>
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">{lastAttendee.displayName}</h3>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                                            {lastAttendee.isNewMember ? 'Let\'s give them a warm welcome' : 'Welcome to Service'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Scrollable List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {attendees.map((attendee, index) => (
                            <div
                                key={attendee.uid}
                                className={`flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all ${index === 0 ? 'border-church-green/30 bg-church-green/5' : ''}`}
                            >
                                <div className="relative">
                                    <img
                                        src={attendee.photoURL || `https://ui-avatars.com/api/?name=${attendee.displayName}`}
                                        className="w-12 h-12 rounded-xl object-cover"
                                    />
                                    {index === 0 && (
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-church-green rounded-full border border-black animate-ping"></div>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-sm text-white">{attendee.displayName}</p>
                                        {attendee.isNewMember && (
                                            <span className="bg-church-gold/20 text-church-gold text-[8px] font-black px-1.5 py-0.5 rounded-md border border-church-gold/20 uppercase tracking-tighter animate-pulse">New Member</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                                        {attendee.scannedAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Just now'}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {attendees.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center opacity-30">
                                <Users size={48} className="mb-4" />
                                <p className="text-sm font-black uppercase tracking-widest">Waiting for arrivals...</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
