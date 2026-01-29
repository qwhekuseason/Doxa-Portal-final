import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';

export const updateSpiritualStreak = async (user: UserProfile) => {
    if (!user || !user.uid) return;

    const today = new Date().toISOString().split('T')[0];
    const lastChecked = user.streak?.lastChecked || '';

    // If already checked today, do nothing
    if (lastChecked === today) return;

    const userRef = doc(db, 'users', user.uid);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newCount = 1;
    let newBest = user.streak?.best || 0;

    if (lastChecked === yesterdayStr) {
        // Continuous streak
        newCount = (user.streak?.count || 0) + 1;
        if (newCount > newBest) newBest = newCount;
    } else {
        // Streak broken, reset to 1
        newCount = 1;
    }

    try {
        await updateDoc(userRef, {
            'streak.count': newCount,
            'streak.lastChecked': today,
            'streak.best': newBest,
            lastActive: new Date().toISOString(),
            isOnline: true
        });
        console.log(`Streak updated: ${newCount}`);
    } catch (e) {
        console.error("Streak update fail", e);
    }
};
