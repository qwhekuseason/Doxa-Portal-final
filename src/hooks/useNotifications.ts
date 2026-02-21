import { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    updateDoc,
    doc,
    getDocs,
    getDoc,
    serverTimestamp,
    limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { sendBrowserNotification } from '../utils/notificationService';

export interface DoxaNotification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    timestamp: any;
    targetUsers?: string[];
    isGlobal?: boolean;
    category?: 'message' | 'sermon' | 'event' | 'testimony' | 'prayer' | 'quiz' | 'study' | 'live' | 'gallery' | 'ebook';
    targetId?: string;
    senderUid?: string;
}

export const useNotifications = (userId?: string, isAdmin: boolean = false) => {
    const [notifications, setNotifications] = useState<DoxaNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [lastClearedAt, setLastClearedAt] = useState<any>(null);

    // Fetch user's "clear all" timestamp first
    useEffect(() => {
        if (!userId) return;
        const fetchClearTimestamp = async () => {
            const userSnap = await getDoc(doc(db, 'users', userId));
            if (userSnap.exists()) {
                setLastClearedAt(userSnap.data().lastClearedNotifications || null);
            }
        };
        fetchClearTimestamp();
    }, [userId]);

    useEffect(() => {
        if (!userId) return;

        // Query: 
        // 1. Where targetUsers contains userId OR isGlobal is true
        // 2. Order by timestamp DESC
        const q = query(
            collection(db, 'notifications'),
            orderBy('timestamp', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // Handle NEW notifications for browser alerts
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data() as DoxaNotification;
                    const notifId = change.doc.id;

                    // Filter logic for browser notification
                    const isForMe = data.isGlobal || data.targetUsers?.includes(userId) || isAdmin;
                    const isMyOwnAction = (data.targetId === userId) || (data.senderUid === userId);

                    // Time check to prevent blasting old notifications on reload
                    // We only notify for things created in the last 30 seconds
                    const now = Date.now();
                    const notifTime = data.timestamp?.toMillis ? data.timestamp.toMillis() : new Date(data.timestamp || now).getTime();
                    const isRecent = (now - notifTime) < 30000;

                    if (isForMe && !isMyOwnAction && isRecent && !data.read) {
                        sendBrowserNotification(data.title, data.message);
                    }
                }
            });

            const allNotifs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as DoxaNotification));

            // Client-side filtering because Firestore "OR" queries with "orderBy" are complex
            const filtered = allNotifs.filter(n => {
                // 1. Check if it's for this user
                const isForMe = n.isGlobal || n.targetUsers?.includes(userId) || isAdmin;
                if (!isForMe) return false;

                // 2. Check if it was cleared by the user recently
                if (lastClearedAt && n.timestamp) {
                    const clearTime = lastClearedAt.toMillis ? lastClearedAt.toMillis() : new Date(lastClearedAt).getTime();
                    const notifTime = n.timestamp.toMillis ? n.timestamp.toMillis() : new Date(n.timestamp).getTime();
                    if (notifTime <= clearTime) return false;
                }

                return true;
            });

            setNotifications(filtered);
            setUnreadCount(filtered.filter(n => !n.read).length);
            setLoading(false);
        }, (error) => {
            // Suppress permission errors to avoid console spam
            if (error.code !== 'permission-denied') {
                console.error("Notifications listener error:", error);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId, isAdmin, lastClearedAt]);

    const markAsRead = async (notificationId: string) => {
        try {
            await updateDoc(doc(db, 'notifications', notificationId), {
                read: true
            });
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const markAllAsRead = async () => {
        const unread = notifications.filter(n => !n.read);
        if (unread.length === 0) return;

        try {
            const batch = unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true }));
            await Promise.all(batch);
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    const clearAll = async () => {
        if (!userId) return;
        try {
            await markAllAsRead();

            // Update user profile to hide current notifications
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                lastClearedNotifications: serverTimestamp()
            });

            // Local state update for immediate feedback
            setNotifications([]);
            setUnreadCount(0);
        } catch (error) {
            console.error("Error clearing notifications:", error);
        }
    };

    return { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, loading };
};
