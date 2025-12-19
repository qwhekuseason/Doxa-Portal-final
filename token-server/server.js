const express = require('express');
const cors = require('cors');
const https = require('https');
const selfsigned = require('selfsigned');
const { RtcTokenBuilder, RtcRole } = require('agora-token');

const app = express();
const PORT = 3001;

// Agora credentials
const AGORA_APP_ID = '33e2fbf899a04c90a3fa9edf66f2db2a';
const AGORA_APP_CERTIFICATE = 'eed5525bbbd64ba2a3c9fa163e7e7f9c';

// Enable CORS for all origins (useful if dev server is on different port)
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        version: '2.0',
        message: 'Agora Token Server Running (HTTP)',
        appId: AGORA_APP_ID
    });
});

// Token generation endpoint
app.post('/generateToken', (req, res) => {
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
        res.json({
            token,
            appId: AGORA_APP_ID,
            expiresAt: privilegeExpiredTs,
            channel: channelName,
            uid: numericUid
        });

    } catch (error) {
        console.error('❌ Error generating token:', error);
        res.status(500).json({
            error: 'internal',
            message: error.message || 'Failed to generate token'
        });
    }
});

// Start HTTP server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════╗
║   🎥 Agora Token Server Running (HTTP)    ║
║                                            ║
║   Port: ${PORT}                              ║
║   Local: http://localhost:${PORT}              ║
║   Proxy: /api/token -> http://localhost:3001 ║
║                                            ║
║   Ready to generate tokens! ✅             ║
╚════════════════════════════════════════════╝
    `);
});
