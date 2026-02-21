// Vercel Serverless Function for AI Bible Insights using Google Gemini
const { GoogleGenerativeAI } = require('@google/generative-ai');

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

    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'method-not-allowed',
            message: 'Only POST requests are allowed'
        });
    }

    try {
        const { book, chapter, content } = req.body;

        if (!book || !chapter || !content) {
            return res.status(400).json({
                error: 'invalid-argument',
                message: 'book, chapter, and content are required'
            });
        }

        const apiKey = process.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({
                error: 'configuration-error',
                message: 'AI service is not configured.'
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        const prompt = `Summarize the spiritual essence of ${book} ${chapter} in exactly 2 professional and inspiring sentences. Base it on this text: ${content.substring(0, 3000)}`;

        console.log(`📡 [AI Progress] Sending insight request to Gemini for ${book} ${chapter}...`);
        const result = await model.generateContent(prompt);
        console.log('⏳ [AI Progress] Waiting for API response...');
        const response = await result.response;
        console.log('✅ [AI Progress] API Response received!');
        const text = response.text();

        return res.status(200).json({
            success: true,
            insight: text
        });

    } catch (error) {
        console.error('❌ Error in generateInsight:', error);
        return res.status(500).json({
            error: 'internal',
            message: error.message || 'Failed to generate insight'
        });
    }
};
