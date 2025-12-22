# Deployment Instructions for Vercel

## ✅ What Was Done

1. **Created Serverless Function**: `api/generateToken.js`
   - Vercel automatically routes `/api/generateToken` to this function
   - Handles token generation with CORS support
   - Uses environment variables for credentials

2. **Updated Frontend**: `src/utils/agoraService.ts`
   - Production: Uses `/api/generateToken` (Vercel serverless function)
   - Development: Uses `/api/token/generateToken` (local token server)

3. **Added Configuration**: `vercel.json`
   - Configures serverless function memory and timeout

## 🚀 Deployment Steps

### Step 1: Set Environment Variables in Vercel

Go to your Vercel project dashboard → Settings → Environment Variables and add:

```
AGORA_APP_ID=33e2fbf899a04c90a3fa9edf66f2db2a
AGORA_APP_CERTIFICATE=eed5525bbbd64ba2a3c9fa163e7e7f9c
```

> **Important**: Add these to all environments (Production, Preview, Development)

### Step 2: Deploy to Vercel

```bash
# If not already connected to Vercel
vercel

# Or if already connected, just push to Git
git add .
git commit -m "Add Vercel serverless function for token generation"
git push
```

Vercel will automatically:
- Detect the `api/` folder
- Deploy `generateToken.js` as a serverless function
- Route `/api/generateToken` requests to it

### Step 3: Test in Production

After deployment, test the token endpoint:

```bash
curl -X POST https://your-app.vercel.app/api/generateToken \
  -H "Content-Type: application/json" \
  -d '{"channelName":"test","uid":12345}'
```

You should get a response like:
```json
{
  "token": "...",
  "appId": "33e2fbf899a04c90a3fa9edf66f2db2a",
  "expiresAt": 1234567890,
  "channel": "test",
  "uid": 12345
}
```

## 🧪 Local Development

Your local setup remains unchanged:

1. **Terminal 1**: `npm run dev` (Vite dev server with proxy)
2. **Terminal 2**: `cd token-server && node server.js` (Local token server)

The frontend automatically uses the local token server in development.

## 📝 Notes

- **Security**: Consider moving credentials to environment variables (already set up)
- **CORS**: The serverless function allows all origins (`*`). Restrict this in production if needed.
- **Token Expiration**: Tokens expire after 24 hours
- **No Changes Needed**: Your existing local development workflow stays the same

## ⚠️ Troubleshooting

If token generation fails in production:

1. **Check Environment Variables**: Ensure they're set in Vercel dashboard
2. **Check Logs**: View function logs in Vercel dashboard → Deployments → Function Logs
3. **Test Endpoint**: Use the curl command above to test directly
4. **Redeploy**: Sometimes a fresh deployment helps: `vercel --prod`
