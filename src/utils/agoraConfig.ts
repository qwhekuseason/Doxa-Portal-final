// Agora RTC Configuration
// This file contains configuration for Agora video conferencing

/**
 * Get Agora App ID from environment variables
 * For development, this is set in .env.local
 * For production, ensure this is properly secured
 */
export const getAgoraAppId = (): string => {
    const appId = import.meta.env.VITE_AGORA_APP_ID;

    if (!appId) {
        console.error('VITE_AGORA_APP_ID is not set in environment variables');
        throw new Error('Agora App ID is not configured. Please check your .env.local file.');
    }

    return appId;
};

/**
 * Agora channel configuration options
 */
export interface AgoraChannelConfig {
    channelName: string;
    token: string | null;
    uid: string | number;
}

/**
 * Default RTC client configuration
 */
export const defaultRTCConfig = {
    mode: 'rtc' as const,
    codec: 'vp8' as const,
};

/**
 * Video encoding configuration
 */
export const videoEncoderConfig = {
    width: 1280,
    height: 720,
    frameRate: 30,
    bitrateMin: 400,
    bitrateMax: 1500,
};

/**
 * Audio encoding configuration
 */
export const audioEncoderConfig = {
    sampleRate: 48000,
    stereo: true,
    bitrate: 48,
};

/**
 * Validate channel name
 * Channel names should be alphanumeric with limited special characters
 */
export const isValidChannelName = (channelName: string): boolean => {
    if (!channelName || channelName.length === 0) {
        return false;
    }

    // Agora channel names:
    // - Must be less than 64 characters
    // - Can contain: a-z, A-Z, 0-9, -, _
    const channelNameRegex = /^[a-zA-Z0-9_-]{1,64}$/;
    return channelNameRegex.test(channelName);
};

/**
 * Clean channel name for Agora compatibility
 * Removes spaces and invalid characters
 */
export const cleanChannelName = (channelName: string): string => {
    return channelName
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .substring(0, 64);
};
