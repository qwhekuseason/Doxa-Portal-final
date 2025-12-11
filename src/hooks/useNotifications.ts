import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where, limit } from 'firebase/firestore';
import { db } from '../firebase';

export interface Notification {
    id: string;
    title: string;
    message: string;
    timestamp: any;
    read: boolean;
    type: 'info' | 'success' | 'warning' | 'error';
}

export const useNotifications = (userId?: string) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        // If no user, maybe fetch public notifications or none
        const notifsRef = collection(db, 'notifications');

        // Simple query: get all recent notifications. 
        // In a real app, you might filter by userId or 'all' target.
        // For now, let's assume global notifications or user-specific ones if we had a field.
        // We will just fetch the latest 20.
        const q = query(notifsRef, orderBy('timestamp', 'desc'), limit(20));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs: Notification[] = [];
            let unread = 0;

            snapshot.forEach((doc) => {
                const data = doc.data();
                // Check if read by this user? 
                // Since we don't have a structured "readBy" array in the prompt description,
                // we will assume a local field 'read' for personal notifications, 
                // OR we store 'read' status in local storage for global notifications?
                // Let's implement a simple "read" field on the document for now, assuming 1:1 notifications.
                // If it's a broadcast system, we would need a separate collection 'user_notifications'.
                // For this task, "marking notification" implies some persistence.
                // I will assume the notification document has a 'read' boolean for simplicity as requested "make functionality work".

                const notif = { id: doc.id, ...data } as Notification;
                msgs.push(notif);
                if (!notif.read) unread++;
            });

            setNotifications(msgs);
            setUnreadCount(unread);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    const markAsRead = async (id: string) => {
        if (!id) return;
        try {
            const docRef = doc(db, 'notifications', id);
            await updateDoc(docRef, { read: true });
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    };

    const markAllAsRead = async () => {
        // Batch update would be better, but doing one by one for simplicity / safety limit
        const unread = notifications.filter(n => !n.read);
        unread.forEach(n => markAsRead(n.id));
    };

    return { notifications, unreadCount, markAsRead, markAllAsRead, loading };
};
