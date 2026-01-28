import React, { useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useToast } from './UIComponents';

export const ReminderSystem: React.FC<{ userId: string }> = ({ userId }) => {
    const { addToast } = useToast();

    useEffect(() => {
        const checkReminders = async () => {
            const today = new Date();
            const todayStr = today.toISOString().slice(5, 10); // MM-DD
            const fullTodayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

            try {
                // 1. Check Birthdays
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('publicProfile', '==', true));
                const userSnapshot = await getDocs(q);

                userSnapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.dateOfBirth && data.dateOfBirth.slice(5, 10) === todayStr) {
                        if (data.uid === userId) {
                            addToast("Happy Birthday! We celebrate you today! 🎂", "success");
                        } else {
                            addToast(`It's ${data.displayName}'s birthday today! Send a wish! 🎈`, "info");
                        }
                    }
                });

                // 2. Check Events
                const eventsRef = collection(db, 'events');
                const eq = query(eventsRef, where('date', '>=', fullTodayStr + 'T00:00'), where('date', '<=', fullTodayStr + 'T23:59'));
                const eventSnapshot = await getDocs(eq);

                eventSnapshot.forEach(doc => {
                    const event = doc.data();
                    addToast(`Event Today: "${event.title}" at ${new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, "warning");
                });

            } catch (error) {
                console.error("Reminder check failed:", error);
            }
        };

        // Delay slightly for better UX (let page load first)
        const timer = setTimeout(checkReminders, 3000);
        return () => clearTimeout(timer);
    }, [userId]);

    return null;
};
