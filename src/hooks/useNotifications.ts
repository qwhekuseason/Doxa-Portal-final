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

// Define ref outside
const notifsRef = collection(db, 'notifications');

export const useNotifications = (userId?: string, isAdminUser: boolean = false) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!userId && !isAdminUser) {
            setLoading(false);
            return;
        }

        // Only filter by UID if not an admin. Admins can see all, but for UI, we might still want to filter.
        // For now, let's follow the rule: normal users must filter by their UID.
        let q = query(notifsRef, orderBy('timestamp', 'desc'), limit(20));

        if (!isAdminUser && userId) {
            q = query(notifsRef, where('uid', '==', userId), orderBy('timestamp', 'desc'), limit(20));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs: Notification[] = [];
            let unread = 0;

            snapshot.forEach((doc) => {
                const data = doc.data();
                const notif = { id: doc.id, ...data } as Notification;
                msgs.push(notif);
                if (!notif.read) unread++;
            });

            setNotifications(msgs);
            setUnreadCount(unread);
            setLoading(false);
        }, (error) => {
            console.error("Notifications listener error:", error);
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
