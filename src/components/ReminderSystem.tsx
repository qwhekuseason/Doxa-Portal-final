import React, { useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useToast } from './UIComponents';
import { sendBrowserNotification } from '../utils/notificationService';

export const ReminderSystem: React.FC<{ userId?: string }> = ({ userId }) => {
    const { addToast } = useToast();

    useEffect(() => {
        if (!userId) return;

        const checkReminders = async () => {
            const now = new Date();
            const todayStr = now.toISOString().slice(5, 10); // MM-DD
            const fullTodayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

            const storageKey = `doxa_notified_${userId}_${fullTodayStr}`;
            const notifiedStr = localStorage.getItem(storageKey) || '{}';
            const remindedItems = JSON.parse(notifiedStr);

            try {
                // 1. Check Birthdays
                const usersRef = collection(db, 'users');
                const bq = query(usersRef, where('publicProfile', '==', true));
                const userSnapshot = await getDocs(bq);

                userSnapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.dateOfBirth && data.dateOfBirth.slice(5, 10) === todayStr) {
                        const birthKey = `birthday_${doc.id}`;
                        if (!remindedItems[birthKey]) {
                            if (data.uid === userId) {
                                sendBrowserNotification("Happy Birthday!", "We celebrate you today! 🎂");
                            } else {
                                sendBrowserNotification("Birthday Reminder", `It's ${data.displayName}'s birthday today! 🎈`);
                            }
                            remindedItems[birthKey] = true;
                        }
                    }
                });

                // 2. Check Events
                const eventsRef = collection(db, 'events');
                const eq = query(eventsRef, where('date', '>=', fullTodayStr + 'T00:00'));
                const eventSnapshot = await getDocs(eq);

                eventSnapshot.forEach(doc => {
                    const event = doc.data();
                    const eventDate = new Date(event.date);
                    const diffMs = eventDate.getTime() - now.getTime();
                    const diffMins = Math.floor(diffMs / 60000);

                    let reminderType = '';
                    let message = '';

                    if (diffMins > 115 && diffMins <= 125) { // ~2 hours before
                        reminderType = '2h';
                        message = `Reminder: "${event.title}" starts in 2 hours! ⏳`;
                    } else if (diffMins > 55 && diffMins <= 65) { // ~1 hour before
                        reminderType = '1h';
                        message = `Starting in 1 hour: "${event.title}"! Get ready! ⏰`;
                    } else if (diffMins > 25 && diffMins <= 35) { // ~30 mins before
                        reminderType = '30m';
                        message = `30 minutes to go: "${event.title}" is about to start! ❤️`;
                    }

                    if (reminderType) {
                        const eventKey = `event_${doc.id}_${reminderType}`;
                        if (!remindedItems[eventKey]) {
                            sendBrowserNotification("Event Reminder", message);
                            remindedItems[eventKey] = true;
                        }
                    }
                });

                localStorage.setItem(storageKey, JSON.stringify(remindedItems));

                // Cleanup old logic
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key?.startsWith('doxa_notified_') && !key.endsWith(fullTodayStr)) {
                        localStorage.removeItem(key);
                    }
                }

            } catch (error) {
                console.error("Reminder check failed:", error);
            }
        };

        const initialTimer = setTimeout(checkReminders, 3000);
        const intervalTimer = setInterval(checkReminders, 5 * 60 * 1000);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(intervalTimer);
        };
    }, [userId, addToast]);

    return null;
};
