declare global {
    interface Window {
        google: any;
    }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient: any = null;
let accessToken: string | null = null;

let initPromise: Promise<void> | null = null;

/**
 * Initializes Google Identity Services and loads GAPI
 */
export const initGoogleAuth = () => {
    if (initPromise) return initPromise;

    console.log(`[Init] 🕵️ Checking for Google Identity Services...`);

    // Fallback: Dynamically inject script if not found in head
    if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
        console.log(`[Init] 💉 Script tag missing from HTML. Injecting dynamically...`);
        const script = document.createElement('script');
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    }

    initPromise = new Promise<void>((resolve) => {
        let attempts = 0;
        const checkLibrary = setInterval(() => {
            attempts++;
            const g = (window as any).google;
            const hasGoogle = !!g;
            const hasAccounts = hasGoogle && !!g.accounts;
            const hasOAuth2 = hasAccounts && !!g.accounts.oauth2;

            if (attempts % 10 === 0) {
                console.log(`[Init] 🧐 Check #${attempts}: google:${hasGoogle}, accounts:${hasAccounts}, oauth2:${hasOAuth2}`);
            }

            if (hasGoogle && hasAccounts && hasOAuth2) {
                clearInterval(checkLibrary);
                console.log(`[Init] 📚 Library detected! Initializing client...`);

                tokenClient = g.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: (response: any) => {
                        if (response.error !== undefined) {
                            console.error('[Init] ❌ Google Token Callback Error:', response);
                            return;
                        }
                        accessToken = response.access_token;
                        console.log("[Init] 🪙 Token updated via background callback.");
                    },
                });
                console.log("✅ [Init] Google Drive Service Ready");
                resolve();
            }

            if (attempts > 60) { // Stop after 30 seconds
                console.error("[Init] ❌ ERROR: Google Identity Services failed to load.");
                console.error("[Init] 💡 Possible Causes: 1. AdBlocker is blocking Google. 2. Your browser is blocking 'accounts.google.com'. 3. Internet is disconnected.");
                clearInterval(checkLibrary);
            }
        }, 500);
    });

    return initPromise;
};

/**
 * Ensures we have a valid access token, requesting one if necessary
 */
export const ensureAuthenticated = async (): Promise<string> => {
    console.log(`[Auth] 🔑 Checking existing token...`);
    if (!tokenClient) {
        console.log(`[Auth] 🔄 Initializing Google Auth Client...`);
        await initGoogleAuth();
    }

    return new Promise((resolve, reject) => {
        if (accessToken) {
            console.log(`[Auth] ✅ Found valid existing token.`);
            resolve(accessToken);
            return;
        }

        if (!tokenClient) {
            console.error(`[Auth] ❌ tokenClient is still null after initialization attempt.`);
            reject(new Error("Google Identity Services failed to initialize. Please check your internet connection and Client ID."));
            return;
        }

        console.log(`[Auth] 🛰️ Requesting new access token from Google...`);
        tokenClient.callback = (response: any) => {
            console.log(`[Auth] 📥 Received callback from Google Identity Services.`);
            if (response.error !== undefined) {
                console.error(`[Auth] ❌ Google Identity Error:`, response);
                reject(response);
                return;
            }
            accessToken = response.access_token;
            console.log(`[Auth] 🎯 New access token set successfully.`);
            // Clear token after 50 minutes (Google tokens usually last 1 hour)
            setTimeout(() => { accessToken = null; }, 50 * 60 * 1000);
            resolve(accessToken!);
        };

        tokenClient.requestAccessToken({ prompt: 'consent' });
        console.log(`[Auth] 🖥️ Popup/Consent window should be visible...`);
    });
};

/**
 * Uploads a file to Google Drive.
 * Small files (<5MB): Simple binary upload + Metadata patch (Very reliable).
 * Large files (>5MB): Resumable session (Industrial strength for sermons).
 */
export const uploadFileToDrive = async (file: File, onProgress?: (progress: number) => void) => {
    console.log(`[Drive] 🟢 Starting upload for: ${file.name}`);

    console.log(`[Drive] 🔑 Ensuring authentication...`);
    const token = await ensureAuthenticated();
    console.log(`[Drive] ✅ Authentication successful.`);

    const isLargeFile = file.size > 5 * 1024 * 1024;
    console.log(`[Drive] 📊 File size: ${(file.size / 1024).toFixed(1)} KB. Mode: ${isLargeFile ? 'RESUMABLE' : 'SIMPLE'}`);

    if (isLargeFile) {
        console.log(`[Drive] 🛰️ Initiating resumable session...`);
        const initiateResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json; charset=UTF-8',
                'X-Upload-Content-Type': file.type,
                'X-Upload-Content-Length': file.size.toString(),
            },
            body: JSON.stringify({ name: file.name, mimeType: file.type }),
        });

        if (!initiateResponse.ok) {
            console.error(`[Drive] ❌ Failed to initiate session: ${initiateResponse.status}`, await initiateResponse.text());
            throw new Error('Could not start upload session');
        }

        const sessionUrl = initiateResponse.headers.get('Location');
        if (!sessionUrl) {
            console.error(`[Drive] ❌ No session URL in headers`, initiateResponse.headers);
            throw new Error('CORS Error: Missing session URL');
        }
        console.log(`[Drive] 🔗 Session URL obtained.`);

        const fileId = await performUploadXHR(sessionUrl, file, token, onProgress);
        return finalizeFile(fileId, token);
    } else {
        console.log(`[Drive] 📤 Starting simple media upload...`);
        const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=media';
        const fileId = await performUploadXHR(uploadUrl, file, token, onProgress);

        console.log(`[Drive] 📝 Patching metadata for file ID: ${fileId}`);
        const patchResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: file.name })
        });

        if (!patchResponse.ok) {
            console.warn(`[Drive] ⚠️ Metadata patch failed (file uploaded but not renamed):`, await patchResponse.text());
        } else {
            console.log(`[Drive] ✅ Metadata patched successfully.`);
        }

        return finalizeFile(fileId, token);
    }
};

/**
 * Shared XHR helper for raw binary/resumable upload
 */
const performUploadXHR = async (url: string, body: any, token: string, onProgress?: (p: number) => void): Promise<string> => {
    console.log(`[Drive] 📡 XHR: Opening connection...`);
    if (onProgress) onProgress(1);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const method = (url.includes('session') || url.includes('resumable')) ? 'PUT' : 'POST';

        xhr.open(method, url);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        if (body instanceof File) {
            xhr.setRequestHeader('Content-Type', body.type);
        }

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                console.log(`[Drive] 📥 Progress: ${percent}% (${event.loaded} / ${event.total} bytes)`);
                if (onProgress) onProgress(Math.max(1, percent));
            } else {
                console.log(`[Drive] 📥 Progress: Uploading... (length not computable)`);
            }
        };

        xhr.onload = () => {
            console.log(`[Drive] 🏁 XHR: Finished with status ${xhr.status}`);
            if (xhr.status >= 200 && xhr.status < 300) {
                const response = JSON.parse(xhr.responseText);
                console.log(`[Drive] 🆔 Created File ID: ${response.id}`);
                resolve(response.id);
            } else {
                console.error('[Drive] ❌ Drive Error Response:', xhr.responseText);
                reject(new Error(`Drive rejected upload (${xhr.status})`));
            }
        };

        xhr.onerror = (err) => {
            console.error(`[Drive] ❌ Network Error during XHR:`, err);
            reject(new Error('Network error during Google Drive upload. Check your connection.'));
        };

        xhr.send(body);
    });
};

/**
 * Finalize permissions and generate links
 */
const finalizeFile = async (fileId: string, token: string) => {
    console.log(`[Drive] 🔒 Finalizing permissions...`);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });

    if (!response.ok) {
        console.warn(`[Drive] ⚠️ Permission update failed:`, await response.text());
    } else {
        console.log(`[Drive] ✅ Permissions set to public.`);
    }

    return {
        fileId,
        viewLink: `https://drive.google.com/file/d/${fileId}/view`,
        downloadLink: `https://drive.google.com/uc?export=download&id=${fileId}`,
    };
};

// Add to window for debugging if needed (optional)
if (typeof window !== 'undefined') {
    (window as any).googleDriveService = { initGoogleAuth, uploadFileToDrive };
}
