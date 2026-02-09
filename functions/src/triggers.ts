
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin (if not already initialized)
if (admin.apps.length === 0) {
    admin.initializeApp();
}

/**
 * Send Push Notification when a new message is posted in the Group Chat.
 */
export const onNewChatMessage = functions.firestore
    .document('messages/{messageId}')
    .onCreate(async (snap, context) => {
        const message = snap.data();
        if (!message) return;

        const payload = {
            notification: {
                title: `New Message from ${message.displayName || 'someone'}`,
                body: message.text || 'Sent an image or attachment',
                icon: '/logo.png',
                click_action: 'https://tfc-doxa-portal.com/' // Directs user to app
            },
            data: {
                url: 'https://tfc-doxa-portal.com/',
                type: 'chat_message'
            }
        };

        try {
            // Get all FCM tokens from users who have them
            // In a real production app, you might want to subscribe users to a topic instead to avoid listing all users
            // However, for this scale, listing users with tokens is acceptable.

            // To optimize: Only fetch users who have fcmTokens array
            const tokensSnapshot = await admin.firestore()
                .collection('users')
                .where('fcmTokens', '!=', null)
                .get();

            const tokens: string[] = [];

            tokensSnapshot.forEach(doc => {
                const userData = doc.data();
                // Don't send notification to the sender
                if (doc.id !== message.uid && userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
                    tokens.push(...userData.fcmTokens);
                }
            });

            if (tokens.length > 0) {
                // Send to all tokens
                // chunks of 500 (firebase limit per call is 500)
                const chunkSize = 500;
                for (let i = 0; i < tokens.length; i += chunkSize) {
                    const chunk = tokens.slice(i, i + chunkSize);
                    await admin.messaging().sendToDevice(chunk, payload);
                }
                console.log(`Sent notification to ${tokens.length} devices.`);
            }

        } catch (error) {
            console.error('Error sending chat notifications:', error);
        }
    });

/**
 * Send Push Notification for general system notifications (Sermons, Events, etc.)
 */
export const onNewNotification = functions.firestore
    .document('notifications/{notificationId}')
    .onCreate(async (snap, context) => {
        const notif = snap.data();
        if (!notif) return;

        const payload = {
            notification: {
                title: notif.title || 'Doxa Portal Update',
                body: notif.message || 'New content has been added.',
                icon: '/logo.png',
                click_action: 'https://tfc-doxa-portal.com/'
            },
            data: {
                url: 'https://tfc-doxa-portal.com/',
                type: notif.type || 'info'
            }
        };

        try {
            let tokensQuery: admin.firestore.Query = admin.firestore().collection('users');

            // If not global, target specific users
            if (notif.isGlobal === false && notif.targetUsers && notif.targetUsers.length > 0) {
                // Fetch only targeted users
                // Note: Firestore 'in' query limit is 30. For simplicity/larger groups, we query all with tokens and filter in code or send multiple queries.
                // For this project, we'll fetch users with tokens and match.
                tokensQuery = tokensQuery.where('uid', 'in', notif.targetUsers.slice(0, 30));
            }

            const tokensSnapshot = await tokensQuery.where('fcmTokens', '!=', null).get();
            const tokens: string[] = [];

            tokensSnapshot.forEach(doc => {
                const userData = doc.data();
                if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
                    tokens.push(...userData.fcmTokens);
                }
            });

            if (tokens.length > 0) {
                const chunkSize = 500;
                for (let i = 0; i < tokens.length; i += chunkSize) {
                    const chunk = tokens.slice(i, i + chunkSize);
                    await admin.messaging().sendToDevice(chunk, payload);
                }
                console.log(`Sent system notification to ${tokens.length} devices.`);
            }
        } catch (error) {
            console.error('Error sending system notifications:', error);
        }
    });

// Re-export existing functions
export * from './index';
