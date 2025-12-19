/**
 * Helper to convert Google Drive sharing links to direct image links.
 * Works for both /file/d/ID/view and /uc?id=ID patterns.
 */
export const getGoogleDriveDirectLink = (url: string) => {
    if (!url) return '';
    if (!url.includes('drive.google.com')) return url;

    // Pattern 1: /file/d/ID/view or /d/ID
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
        return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
    }

    // Pattern 2: ?id=ID
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
        return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
    }

    return url;
};

export const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1510133539744-11d206f9abe2?auto=format&fit=crop&q=80&w=1000';
