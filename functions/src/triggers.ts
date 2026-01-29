
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

// Re-export existing functions
export * from './index';
