import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export const useUnreadDMs = (userId?: string) => {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!userId) return;

        const q = query(
            collection(db, 'direct_messages'),
            where('participants', 'array-contains', userId),
            where('read', '==', false),
            where('receiverUid', '==', userId)
        );

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                setUnreadCount(snapshot.size);
            },
            (error) => {
                console.error("Unread DMs listener error:", error);
            }
        );

        return () => unsubscribe();
    }, [userId]);

    return unreadCount;
};
