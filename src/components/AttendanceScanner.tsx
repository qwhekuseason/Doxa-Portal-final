import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { UserProfile } from '../types';
import { Loader2, X, CheckCircle2 } from 'lucide-react';
import { useToast } from './UIComponents';

interface AttendanceScannerProps {
    user: UserProfile;
    onClose: () => void;
}

export const AttendanceScanner: React.FC<AttendanceScannerProps> = ({ user, onClose }) => {
    const { addToast } = useToast();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'scan' | 'processing' | 'success' | 'fail'>('scan');

    const handleScan = async (result: string | null) => {
        if (!result || scanned || loading) return;

        // Verify QR Code format
        if (!result.startsWith('ATTENDANCE:')) {
            addToast("Invalid QR Code", 'error');
            return;
        }

        const sessionId = result.split(':')[1];
        setLoading(true);
        setStatus('processing');

        try {
            // 1. Check if session exists
            const sessionRef = doc(db, 'attendance_sessions', sessionId);
            const sessionSnap = await getDoc(sessionRef);

            if (!sessionSnap.exists()) {
                throw new Error("Attendance session not found.");
            }

            // 2. Check if session is still active
            if (sessionSnap.data()?.active === false) {
                setStatus('fail');
                addToast("This session has been closed. No more check-ins allowed.", 'error');
                setTimeout(onClose, 3000);
                return;
            }

            // 3. Check if user already scanned in
            const attendeeRef = doc(db, 'attendance_sessions', sessionId, 'attendees', user.uid);
            const attendeeSnap = await getDoc(attendeeRef);

            if (attendeeSnap.exists()) {
                addToast("You've already checked in!", 'info');
                setScanned(true);
                setStatus('success');
                setTimeout(onClose, 2000);
                return;
            }

            // 3. Mark user as present
            const joinedDate = user.createdAt ? (typeof user.createdAt === 'string' ? new Date(user.createdAt) : (user.createdAt as any).toDate ? (user.createdAt as any).toDate() : new Date()) : new Date();
            const isNewMember = (new Date().getTime() - joinedDate.getTime()) < (7 * 24 * 60 * 60 * 1000);

            await setDoc(attendeeRef, {
                uid: user.uid,
                displayName: user.displayName,
                photoURL: user.photoURL,
                scannedAt: serverTimestamp(),
                role: user.role,
                isNewMember: isNewMember
            });

            // 4. Update user stats
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                'stats.attendanceCount': increment(1),
                lastActive: serverTimestamp()
            });

            setScanned(true);
            setStatus('success');
            addToast(isNewMember ? "Welcome to the family! Checked in." : "Checked In Successfully!", 'success');

            // Close after delay
            setTimeout(onClose, 3000);

        } catch (error: any) {
            console.error("Check-in error:", error);
            setStatus('fail');
            addToast(error.message || "Failed to check in.", 'error');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            {/* The "Screen" / Scanner Card */}
            <div className="relative w-full max-w-sm bg-[#050505] rounded-[2.5rem] flex flex-col items-center p-6 pb-10 border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">

                {/* Background Accent */}
                <div className="absolute inset-0 bg-gradient-to-b from-church-green/5 to-transparent pointer-events-none rounded-[2.5rem]"></div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all active:scale-90 border border-white/5"
                    title="Close"
                >
                    <X size={20} className="text-white/60" />
                </button>

                <div className="w-full flex flex-col items-center justify-center space-y-6 relative z-10">
                    {status === 'scan' && (
                        <>
                            <div className="text-center space-y-1">
                                <h2 className="text-xl font-black uppercase tracking-tight text-white">Check In</h2>
                                <p className="text-[10px] font-bold text-church-green uppercase tracking-[0.2em]">Scan QR Code</p>
                            </div>

                            {/* Scanner Box - Compact Size */}
                            <div className="relative w-full aspect-square max-w-[280px] rounded-[2rem] overflow-hidden border-4 border-church-green shadow-[0_0_40px_rgba(34,197,94,0.2)] bg-black">
                                <Scanner
                                    onScan={(results) => {
                                        if (results && results.length > 0) {
                                            handleScan(results[0].rawValue);
                                        }
                                    }}
                                    onError={(error: any) => console.log(error?.message)}
                                    styles={{
                                        container: { width: '100%', height: '100%' },
                                        video: { objectFit: 'cover' }
                                    }}
                                />
                                {/* Scanning Animation Overlay */}
                                <div className="absolute inset-x-0 top-0 h-1 bg-church-green shadow-[0_0_15px_#22c55e] animate-[scan_2s_infinite] pointer-events-none z-20"></div>

                                {/* Corner Accents - Smaller */}
                                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-white/20 rounded-tl-lg pointer-events-none"></div>
                                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-white/20 rounded-tr-lg pointer-events-none"></div>
                                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-white/20 rounded-bl-lg pointer-events-none"></div>
                                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-white/20 rounded-br-lg pointer-events-none"></div>
                            </div>

                            <div className="text-center px-4">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-relaxed">
                                    Align the QR code within the frame
                                </p>
                            </div>
                        </>
                    )}

                    {status === 'processing' && (
                        <div className="flex flex-col items-center justify-center py-10 animate-pulse">
                            <div className="w-16 h-16 bg-church-green/10 rounded-full flex items-center justify-center mb-4 border border-church-green/20">
                                <Loader2 size={32} className="text-church-green animate-spin" />
                            </div>
                            <p className="text-sm font-black uppercase tracking-widest text-church-green">Processing...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex flex-col items-center justify-center py-6 animate-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-church-green rounded-full flex items-center justify-center mb-6 shadow-lg shadow-church-green/20">
                                <CheckCircle2 size={40} className="text-white" />
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-1">Success!</h2>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Attendance Recorded</p>
                        </div>
                    )}

                    {status === 'fail' && (
                        <div className="flex flex-col items-center justify-center py-6 animate-in shake">
                            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 text-red-500 border border-red-500/10">
                                <X size={40} />
                            </div>
                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-6">Scan Failed</p>
                            <button
                                onClick={() => setStatus('scan')}
                                className="px-8 py-3 bg-white text-black rounded-xl font-black uppercase text-xs tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all"
                            >
                                Retry
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
