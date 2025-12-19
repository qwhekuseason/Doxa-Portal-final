/**
 * Firebase Cloud Functions for Agora Token Generation
 * 
 * This function generates Agora RTC tokens for secure video calling.
 * The App Certificate is stored as an environment variable for security.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { RtcTokenBuilder, RtcRole } from 'agora-token';

// Initialize Firebase Admin
admin.initializeApp();

// Agora configuration from environment variables
const AGORA_APP_ID = process.env.AGORA_APP_ID || '33e2fbf899a04c90a3fa9edf66f2db2a';
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || 'eed5525bbbd64ba2a3c9fa163e7e7f9c';

/**
 * Generate Agora RTC Token with CORS enabled
 */
export const generateAgoraToken = functions.https.onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    // Only allow POST
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        // Extract parameters from request body
        const { channelName, uid, role = 'publisher' } = req.body.data || req.body;

        // Validate inputs
        if (!channelName || typeof channelName !== 'string') {
            res.status(400).json({
                error: 'invalid-argument',
                message: 'channelName is required and must be a string'
            });
            return;
        }

        if (uid === undefined || uid === null) {
            res.status(400).json({
                error: 'invalid-argument',
                message: 'uid is required'
            });
            return;
        }

        // Convert uid to number if it's a string
        const numericUid = typeof uid === 'string' ? parseInt(uid, 10) : uid;

        if (isNaN(numericUid)) {
            res.status(400).json({
                error: 'invalid-argument',
                message: 'uid must be a valid number'
            });
            return;
        }

        // Validate role
        const agoraRole = role === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;

        // Token expiration time: 24 hours from now
        const expirationTimeInSeconds = 86400; // 24 hours
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

        // Generate token with agora-token API
        const token = RtcTokenBuilder.buildTokenWithUid(
            AGORA_APP_ID,
            AGORA_APP_CERTIFICATE,
            channelName,
            numericUid,
            agoraRole,
            privilegeExpiredTs,
            privilegeExpiredTs  // privilegeExpire parameter
        );

        // Log for monitoring
        console.log(`Token generated for channel: ${channelName}, uid: ${numericUid}`);

        // Return token and metadata
        res.status(200).json({
            data: {
                token,
                appId: AGORA_APP_ID,
                expiresAt: privilegeExpiredTs,
                channel: channelName,
                uid: numericUid
            }
        });

    } catch (error: any) {
        console.error('Error generating Agora token:', error);
        res.status(500).json({
            error: 'internal',
            message: error.message || 'Failed to generate token'
        });
    }
});
