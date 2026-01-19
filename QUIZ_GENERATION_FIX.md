# Quiz Generation Fix - Deployment Guide

## Problem Summary
The quiz generation feature was failing on Vercel with the error: **"AI generation failed. Please check your topic and try again."**

### Root Cause
The application was trying to call the Hugging Face API directly from the browser (client-side), which has two critical issues:
1. **Security Risk**: API keys were exposed in the client-side code
2. **Environment Variables**: Browser code can't access server-side environment variables in production

## Solution
We've implemented a **serverless API endpoint** that handles quiz generation server-side, keeping API keys secure and properly configured.

## Changes Made

### 1. New Serverless Function
**File**: `api/generateQuiz.js`
- Handles all Hugging Face API calls server-side
- Validates input parameters
- Provides proper error handling
- Keeps API keys secure

### 2. Updated QuizScreen Component
**File**: `src/screens/QuizScreen.tsx`
- Removed direct Hugging Face API calls
- Now calls `/api/generateQuiz` endpoint
- Removed `@huggingface/inference` import (no longer needed client-side)

### 3. Updated Vercel Configuration
**File**: `vercel.json`
- Added routing for `/api/generateQuiz`
- Configured function with 30-second timeout (AI generation can take time)

### 4. Updated API Dependencies
**File**: `api/package.json`
- Added `@huggingface/inference` dependency (updated to latest version to support new router endpoint)
- **Updated API Endpoint**: Using `router.huggingface.co` which is required by newer library versions and API changes

## Deployment Steps

### Step 1: Set Environment Variable in Vercel
You **MUST** configure the Hugging Face API key in Vercel:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new environment variable:
   - **Name**: `HUGGINGFACE_API_KEY`
   - **Value**: `YOUR_HUGGINGFACE_API_KEY`
   - **Environments**: Check all (Production, Preview, Development)
4. Click **Save**

### Step 2: Deploy to Vercel
```bash
# Commit all changes
git add .
git commit -m "Fix quiz generation with serverless API"

# Push to trigger deployment
git push
```

### Step 3: Verify Deployment
After deployment completes:
1. Go to your deployed site
2. Login as an admin user
3. Navigate to the Quiz/Temple of Wisdom page
4. Click "Create Quest"
5. Enter a topic (e.g., "Noah's Ark")
6. Select difficulty and question count
7. Click "Generate Quiz"

## Testing Locally

To test the serverless function locally:

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Run in development mode
vercel dev
```

This will start a local server that simulates the Vercel environment, including serverless functions.

## API Endpoint Details

### Request
```
POST /api/generateQuiz
Content-Type: application/json

{
  "topic": "Noah's Ark",
  "difficulty": "medium",
  "questionCount": 5
}
```

### Response (Success)
```json
{
  "success": true,
  "quiz": {
    "topic": "Noah's Ark",
    "difficulty": "medium",
    "questions": [
      {
        "question": "How many days and nights did it rain?",
        "options": ["30", "40", "50", "60"],
        "correctIndex": 1
      }
      // ... more questions
    ]
  }
}
```

### Response (Error)
```json
{
  "error": "ai-response-error",
  "message": "AI generation failed. The response was not valid. Please try again."
}
```

## Troubleshooting

### Error: "AI generation is not configured"
- **Cause**: `HUGGINGFACE_API_KEY` environment variable is not set in Vercel
- **Fix**: Follow Step 1 above to add the environment variable

### Error: "Function execution timed out"
- **Cause**: AI generation took longer than 30 seconds
- **Fix**: This is rare, but you can increase `maxDuration` in `vercel.json` (max is 60 seconds on Pro plan)

### Error: "Invalid response from server"
- **Cause**: The AI model returned malformed JSON
- **Fix**: Try again with a different topic or simpler prompt

### Testing the API Directly
You can test the API endpoint using curl:

```bash
curl -X POST https://your-domain.vercel.app/api/generateQuiz \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "David and Goliath",
    "difficulty": "easy",
    "questionCount": 3
  }'
```

## Security Notes

✅ **What's Secure Now**:
- API keys are stored server-side only
- No sensitive credentials in client code
- Environment variables properly configured

⚠️ **Important**:
- Never commit `.env.local` to git (it's already in `.gitignore`)
- Always set environment variables in Vercel dashboard
- Rotate API keys if they're ever exposed

## Next Steps

After successful deployment:
1. Monitor the Vercel function logs for any errors
2. Test quiz generation with various topics
3. Consider adding rate limiting if needed
4. Monitor Hugging Face API usage/quotas

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify environment variable is set correctly
4. Test the API endpoint directly with curl
