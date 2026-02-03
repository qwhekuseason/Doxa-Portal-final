import React, { useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useToast } from './UIComponents';
import { sendBrowserNotification } from '../utils/notificationService';

export const ReminderSystem: React.FC<{ userId: string }> = ({ userId }) => {
    const { addToast } = useToast();

    useEffect(() => {
        const checkReminders = async () => {
            const now = new Date();
            const todayStr = now.toISOString().slice(5, 10); // MM-DD
            const fullTodayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

            // Storage key for notified items to avoid duplicates
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
                                addToast("Happy Birthday! We celebrate you today! 🎂", "success");
                                sendBrowserNotification("Happy Birthday!", "We celebrate you today! 🎂");
                            } else {
                                addToast(`It's ${data.displayName}'s birthday today! Send a wish! 🎈`, "info");
                                sendBrowserNotification("Birthday Reminder", `It's ${data.displayName}'s birthday today! 🎈`);
                            }
                            remindedItems[birthKey] = true;
                        }
                    }
                });

                // 2. Check Events
                const eventsRef = collection(db, 'events');
                // Fetch events from today onwards
                const eq = query(eventsRef, where('date', '>=', fullTodayStr + 'T00:00'));
                const eventSnapshot = await getDocs(eq);

                eventSnapshot.forEach(doc => {
                    const event = doc.data();
                    const eventDate = new Date(event.date);
                    const diffMs = eventDate.getTime() - now.getTime();
                    const diffMins = Math.floor(diffMs / 60000);

                    let reminderType = '';
                    let message = '';

                    if (diffMins > 1430 && diffMins <= 1445) { // ~24 hours before
                        reminderType = '24h';
                        message = `Reminder: "${event.title}" is tomorrow at ${eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}! 📅`;
                    } else if (diffMins > 55 && diffMins <= 65) { // ~1 hour before
                        reminderType = '1h';
                        message = `Starting in 1 hour: "${event.title}"! Get ready! ⏳`;
                    } else if (diffMins > 25 && diffMins <= 35) { // ~30 mins before
                        reminderType = '30m';
                        message = `30 minutes to go: "${event.title}" is about to start! ❤️`;
                    } else if (diffMins > -15 && diffMins <= 5) { // Just started or starting
                        reminderType = 'now';
                        message = `LIVE NOW: "${event.title}" has started! Join in! ✨`;
                    }

                    if (reminderType) {
                        const eventKey = `event_${doc.id}_${reminderType}`;
                        if (!remindedItems[eventKey]) {
                            addToast(message, reminderType === 'now' ? "success" : "info");
                            sendBrowserNotification("Doxa Portal Event", message);
                            remindedItems[eventKey] = true;
                        }
                    }
                });

                // Save updated notified items
                localStorage.setItem(storageKey, JSON.stringify(remindedItems));

                // Cleanup old storage entries (older than today)
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

        // Run immediately after 3s
        const initialTimer = setTimeout(checkReminders, 3000);

        // Then run every 5 minutes
        const intervalTimer = setInterval(checkReminders, 5 * 60 * 1000);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(intervalTimer);
        };
    }, [userId, addToast]);

    return null;
};
