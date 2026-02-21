import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface NotificationData {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    targetUsers?: string[]; // If empty/undefined, it's a global notification
    category?: 'message' | 'sermon' | 'event' | 'testimony' | 'prayer' | 'quiz' | 'study' | 'live' | 'gallery' | 'ebook';
    targetId?: string;
    senderUid?: string;
}

/**
 * Creates a notification in Firestore
 */
export const createNotification = async (data: NotificationData) => {
    try {
        await addDoc(collection(db, 'notifications'), {
            ...data,
            isGlobal: !data.targetUsers || data.targetUsers.length === 0,
            timestamp: serverTimestamp(),
            read: false,
            createdAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error creating notification:', error);
    }
};

/**
 * Sends a browser notification (if permission granted)
 */
export const sendBrowserNotification = async (title: string, body: string, tag: string = 'doxa-alert') => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
        const options = {
            body,
            icon: '/logo.png',
            badge: '/logo.png',
            vibrate: [100, 50, 100],
            tag,
            renotify: true
        };

        try {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                registration.showNotification(title, options);
            } else {
                new Notification(title, options);
            }
        } catch (err) {
            console.warn('System notification failed, falling back to window.Notification', err);
            try { new Notification(title, options); } catch (e) { }
        }
    }
};

/**
 * Helper functions for specific notification types
 */

export const notifyNewSermon = async (sermonId: string, sermonTitle: string) => {
    const notification: NotificationData = {
        title: '🎙️ New Sermon Available',
        message: `"${sermonTitle}" has been added to the library`,
        type: 'success',
        category: 'sermon',
        targetId: sermonId
    };

    await createNotification(notification);
};

export const notifyNewEvent = async (eventId: string, eventTitle: string, eventDate: string) => {
    const notification: NotificationData = {
        title: '📅 New Event Scheduled',
        message: `"${eventTitle}" on ${eventDate}`,
        type: 'info',
        category: 'event',
        targetId: eventId
    };

    await createNotification(notification);
};

export const notifyTestimonyApproved = async (authorName: string) => {
    const notification: NotificationData = {
        title: '✨ Testimony Approved',
        message: `${authorName}'s testimony has been approved and is now visible to the community`,
        type: 'success'
    };

    await createNotification(notification);
};

export const notifyPrayerApproved = async (authorName: string) => {
    const notification: NotificationData = {
        title: '🤝 Prayer Request Approved',
        message: `${authorName}'s prayer request has been approved`,
        type: 'success'
    };

    await createNotification(notification);
};

export const notifyNewGalleryImage = async (caption: string) => {
    const notification: NotificationData = {
        title: '📸 New Gallery Image',
        message: caption || 'A new image has been added to the gallery',
        type: 'info'
    };

    await createNotification(notification);
};

export const notifyNewQuiz = async (topic: string, difficulty: string) => {
    const notification: NotificationData = {
        title: '🧠 New Scripture Quiz',
        message: `Test your scripture knowledge: ${topic} (${difficulty})`,
        type: 'info'
    };

    await createNotification(notification);
};

export const notifyNewStudyPlan = async (planTitle: string, category: string) => {
    const notification: NotificationData = {
        title: '📖 New Study Plan Published',
        message: `Join the "${planTitle}" journey today! (${category})`,
        type: 'success'
    };

    await createNotification(notification);
};

export const notifyNewStory = async (authorName: string, type: string) => {
    const notification: NotificationData = {
        title: '✨ New Story Highlight',
        message: `${authorName} posted a new community ${type}`,
        type: 'info'
    };

    await createNotification(notification);
};

export const notifyNewPrayerRequest = async (authorName: string) => {
    const notification: NotificationData = {
        title: '🙏 New Prayer Request',
        message: `${authorName} has submitted a request for prayer`,
        type: 'warning'
    };

    await createNotification(notification);
};

export const notifyNewLiveMeeting = async (meetingCode: string) => {
    const notification: NotificationData = {
        title: '🎥 Live Meeting Started',
        message: `A new session has started! Join with code: ${meetingCode}`,
        type: 'success'
    };

    await createNotification(notification);
};

export const notifyChatMessage = async (senderName: string, text: string, senderUid: string, groupName: string = 'Community') => {
    const notification: NotificationData = {
        title: `💬 ${senderName} in ${groupName}`,
        message: text.length > 50 ? `${text.substring(0, 47)}...` : text,
        type: 'info',
        category: 'message',
        senderUid: senderUid
    };

    await createNotification(notification);
};

export const notifyHandRaised = async (userName: string, roomName: string) => {
    const notification: NotificationData = {
        title: '✋ Hand Raised',
        message: `${userName} raised their hand in ${roomName}`,
        type: 'warning'
    };

    await createNotification(notification);
};

export const notifyLiveReaction = async (userName: string, emoji: string, senderUid: string) => {
    const notification: NotificationData = {
        title: '✨ Live Interaction',
        message: `${userName} reacted with ${emoji}`,
        type: 'info',
        senderUid: senderUid
    };

    await createNotification(notification);
};

export const notifyNewEBook = async (title: string, author: string) => {
    const notification: NotificationData = {
        title: '📚 New eBook Added',
        message: `"${title}" by ${author} is now available in the library`,
        type: 'success'
    };

    await createNotification(notification);
};

export const notifyDirectMessage = async (senderUid: string, senderName: string, text: string, receiverUid: string) => {
    const notification: NotificationData = {
        title: `📧 Message from ${senderName}`,
        message: text.length > 50 ? `${text.substring(0, 47)}...` : text,
        type: 'info',
        targetUsers: [receiverUid],
        category: 'message',
        targetId: senderUid,
        senderUid: senderUid
    };

    await createNotification(notification);
};

export const notifyWatchStart = async (watchName: string, theme: string) => {
    const notification: NotificationData = {
        title: `⏰ ${watchName} Has Begun`,
        message: `It is time for "${theme}". Press in to prayer!`,
        type: 'info',
        category: 'prayer'
    };

    // We don't store this in DB to avoid spamming the log every 3 hours for everyone
    // But we will use the browser notification
    sendBrowserNotification(notification.title, notification.message, 'watch-reminder');
};
