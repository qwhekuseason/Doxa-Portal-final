import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { UserProfile } from '../types';
import { Loader2, X, CheckCircle2, QrCode } from 'lucide-react';
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
            // Identify if this is a "New Member" (Joined in the last 7 days)
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

            // 4. Update user stats (Remove streak increment)
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
            setLoading(false); // Allow retry
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black text-white flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all"
            >
                <X size={24} />
            </button>

            <div className="w-full max-w-md space-y-8 text-center">

                {status === 'scan' && (
                    <div className="space-y-6">
                        <div className="relative w-64 h-64 mx-auto rounded-3xl overflow-hidden border-4 border-church-green shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                            <Scanner
                                onScan={(results) => {
                                    if (results && results.length > 0) {
                                        handleScan(results[0].rawValue);
                                    }
                                }}
                                onError={(error: any) => console.log(error?.message)}
                                styles={{
                                    container: { width: '100%', height: '100%' }
                                }}
                            />
                            {/* Scanning Animation Overlay */}
                            <div className="absolute inset-0 border-t-4 border-church-green/50 animate-[scan_2s_infinite]"></div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">Scan QR Code</h2>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-2">Point camera at the screen</p>
                        </div>
                    </div>
                )}

                {status === 'processing' && (
                    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                        <QrCode size={64} className="text-church-green mb-6" />
                        <p className="text-lg font-black uppercase tracking-widest text-church-green">Verifying...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in duration-300">
                        <div className="w-24 h-24 bg-church-green rounded-full flex items-center justify-center mb-6 shadow-lg shadow-church-green/40">
                            <CheckCircle2 size={48} className="text-white" />
                        </div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter">Welcome!</h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-2">You are checked in.</p>
                        <div className="mt-8 px-6 py-2 bg-church-green/20 rounded-full text-church-green font-black uppercase text-xs tracking-[0.2em]">
                            Presence Recorded
                        </div>
                    </div>
                )}

                {status === 'fail' && (
                    <div className="flex flex-col items-center justify-center py-10">
                        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 text-red-500">
                            <X size={40} />
                        </div>
                        <p className="text-sm font-bold text-red-400 uppercase tracking-widest">Scan Failed. Try Again.</p>
                        <button
                            onClick={() => setStatus('scan')}
                            className="mt-8 px-8 py-3 bg-white text-black rounded-xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all"
                        >
                            Retry
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};
