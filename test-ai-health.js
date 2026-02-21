import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Manual env loading
const envContent = fs.readFileSync('.env.local', 'utf8');
const apiKeyMatch = envContent.match(/VITE_GEMINI_API_KEY=([^\r\n]+)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1] : null;

console.log('🔑 Testing with API Key:', apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING');

if (!apiKey) {
    console.error('❌ VITE_GEMINI_API_KEY not found in .env.local');
    process.exit(1);
}

async function test() {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        console.log('📡 Sending request...');
        const result = await model.generateContent('Generate a 1-day reading plan for "Hope" in JSON format.');
        const response = await result.response;
        console.log('✅ Response received!');
        console.log('📝 Content:', response.text().substring(0, 100) + '...');
    } catch (error) {
        console.error('❌ FAIL:', error);
    }
}

test();
