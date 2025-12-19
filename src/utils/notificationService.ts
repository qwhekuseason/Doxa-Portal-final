import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface NotificationData {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    targetUsers?: string[]; // If empty/undefined, it's a global notification
}

/**
 * Creates a notification in Firestore
 */
export const createNotification = async (data: NotificationData) => {
    try {
        await addDoc(collection(db, 'notifications'), {
            ...data,
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
export const sendBrowserNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body,
            icon: '/logo.png',
            badge: '/logo.png'
        });
    }
};

/**
 * Helper functions for specific notification types
 */

export const notifyNewSermon = async (sermonTitle: string) => {
    const notification: NotificationData = {
        title: '🎙️ New Sermon Available',
        message: `"${sermonTitle}" has been added to the sermon library`,
        type: 'success'
    };

    await createNotification(notification);
    sendBrowserNotification(notification.title, notification.message);
};

export const notifyNewEvent = async (eventTitle: string, eventDate: string) => {
    const notification: NotificationData = {
        title: '📅 New Event Scheduled',
        message: `"${eventTitle}" on ${eventDate}`,
        type: 'info'
    };

    await createNotification(notification);
    sendBrowserNotification(notification.title, notification.message);
};

export const notifyTestimonyApproved = async (authorName: string) => {
    const notification: NotificationData = {
        title: '✨ Testimony Approved',
        message: `${authorName}'s testimony has been approved and is now visible to the community`,
        type: 'success'
    };

    await createNotification(notification);
    sendBrowserNotification(notification.title, notification.message);
};

export const notifyPrayerApproved = async (authorName: string) => {
    const notification: NotificationData = {
        title: '🙏 Prayer Request Approved',
        message: `${authorName}'s prayer request has been approved`,
        type: 'success'
    };

    await createNotification(notification);
    sendBrowserNotification(notification.title, notification.message);
};

export const notifyNewGalleryImage = async (caption: string) => {
    const notification: NotificationData = {
        title: '📸 New Gallery Image',
        message: caption || 'A new image has been added to the gallery',
        type: 'info'
    };

    await createNotification(notification);
    sendBrowserNotification(notification.title, notification.message);
};

export const notifyNewQuiz = async (topic: string, difficulty: string) => {
    const notification: NotificationData = {
        title: '🧠 New Bible Quiz',
        message: `Test your knowledge: ${topic} (${difficulty})`,
        type: 'info'
    };

    await createNotification(notification);
    sendBrowserNotification(notification.title, notification.message);
};
