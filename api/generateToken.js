// Vercel Serverless Function for Agora Token Generation
// This replaces the local token-server for production deployment

const { RtcTokenBuilder, RtcRole } = require('agora-token');

// Agora credentials - should be set as environment variables in Vercel
const AGORA_APP_ID = process.env.AGORA_APP_ID || '33e2fbf899a04c90a3fa9edf66f2db2a';
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || 'eed5525bbbd64ba2a3c9fa163e7e7f9c';

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'method-not-allowed',
            message: 'Only POST requests are allowed'
        });
    }

    try {
        const { channelName, uid, role = 'publisher' } = req.body;

        // Validate inputs
        if (!channelName || typeof channelName !== 'string') {
            return res.status(400).json({
                error: 'invalid-argument',
                message: 'channelName is required and must be a string'
            });
        }

        if (uid === undefined || uid === null) {
            return res.status(400).json({
                error: 'invalid-argument',
                message: 'uid is required'
            });
        }

        // Convert uid to number
        const numericUid = typeof uid === 'string' ? parseInt(uid, 10) : uid;

        if (isNaN(numericUid)) {
            return res.status(400).json({
                error: 'invalid-argument',
                message: 'uid must be a valid number'
            });
        }

        // Token expiration: 24 hours
        const expirationTimeInSeconds = 86400;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

        // Determine role
        const agoraRole = role === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;

        // Generate token
        const token = RtcTokenBuilder.buildTokenWithUid(
            AGORA_APP_ID,
            AGORA_APP_CERTIFICATE,
            channelName,
            numericUid,
            agoraRole,
            privilegeExpiredTs,
            privilegeExpiredTs
        );

        console.log(`✅ Token generated for channel: ${channelName}, uid: ${numericUid}`);

        // Return token
        return res.status(200).json({
            token,
            appId: AGORA_APP_ID,
            expiresAt: privilegeExpiredTs,
            channel: channelName,
            uid: numericUid
        });

    } catch (error) {
        console.error('❌ Error generating token:', error);
        return res.status(500).json({
            error: 'internal',
            message: error.message || 'Failed to generate token'
        });
    }
};
