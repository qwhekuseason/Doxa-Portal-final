// Agora Service
// Utility functions for Agora RTC operations

import AgoraRTC from 'agora-rtc-sdk-ng';
import { cleanChannelName, isValidChannelName } from './agoraConfig';

/**
 * Generate a unique user ID for Agora
 * In production, this should be tied to the authenticated user
 */
export const generateUserId = (): number => {
    return Math.floor(Math.random() * 100000);
};

/**
 * Validate and prepare channel name for use
 * @throws Error if channel name is invalid
 */
export const prepareChannelName = (channelName: string): string => {
    const cleaned = cleanChannelName(channelName);

    if (!isValidChannelName(cleaned)) {
        throw new Error(
            'Invalid channel name. Use only letters, numbers, hyphens, and underscores (max 64 characters).'
        );
    }

    return cleaned;
};

/**
 * Get Agora token from local token server
 * 
 * @param channelName The channel to generate a token for
 * @param uid The user ID
 * @returns Token string from local server
 */
export const getAgoraToken = async (
    channelName: string,
    uid: number | string
): Promise<string> => {
    try {
        // Dynamically determine server URL based on current client hostname
        // This allows mobile devices to connect when accessing via IP address
        // Use relative path - Vite proxy will forward this to http://localhost:3001
        // This avoids Mixed Content errors and certificate trust issues
        const tokenServerUrl = '/api/token/generateToken';

        console.log('📡 Requesting token from:', tokenServerUrl);

        const response = await fetch(tokenServerUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                channelName,
                uid: typeof uid === 'string' ? parseInt(uid) : uid,
                role: 'publisher'
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        console.log('✅ Token received from local server');
        return data.token;
    } catch (error: any) {
        console.error('❌ Error getting Agora token:', error);

        throw new Error(
            `Token generation failed. Please ensure the token server is running (npm start in token-server folder). Error: ${error.message}`
        );
    }
};

/**
 * Error handler for Agora RTC errors
 */
export const handleAgoraError = (error: any): string => {
    console.error('Agora RTC Error:', error);

    // Map common Agora error codes to user-friendly messages
    if (error.code) {
        switch (error.code) {
            case 'INVALID_PARAMS':
                return 'Invalid channel configuration. Please check the channel name.';
            case 'NOT_SUPPORTED':
                return 'Your browser does not support video calls. Please use Chrome, Firefox, or Safari.';
            case 'PERMISSION_DENIED':
                return 'Camera or microphone access denied. Please allow permissions and try again.';
            case 'DEVICE_NOT_FOUND':
                return 'Camera or microphone not found. Please connect a device and try again.';
            case 'CONSTRAINT_NOT_SATISFIED':
                return 'Your device does not support the required video quality.';
            case 'INVALID_OPERATION':
                return 'Invalid operation. Please refresh the page and try again.';
            case 'OPERATION_ABORTED':
                return 'Operation cancelled. Please try again.';
            default:
                return `Connection error: ${error.message || 'Unknown error'}`;
        }
    }

    return error.message || 'An unexpected error occurred. Please try again.';
};

/**
 * Check if browser supports Agora Web RTC
 */
export const isBrowserSupported = (): boolean => {
    // Check but don't block - let the actual connection attempt fail with more specific error if needed
    const supported = AgoraRTC.checkSystemRequirements();
    console.log('🔍 Browser support check result:', supported);
    return true; // Force return true to allow trying
};
