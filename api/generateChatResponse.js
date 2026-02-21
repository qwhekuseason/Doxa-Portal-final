const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getSystemPrompt } = require('./aiContext');

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
        const { userMessage, userName, conversationContext, dynamicData } = req.body;
        console.log(`🤖 [AI] Request from ${userName || 'Unknown'}: "${userMessage?.substring(0, 30)}..."`);
        if (dynamicData) {
            console.log(`📊 [AI Context] Received ${dynamicData.upcomingEvents?.length || 0} events and ${dynamicData.upcomingBirthdays?.length || 0} birthdays.`);
        }

        if (!userMessage) {
            return res.status(400).json({
                error: 'invalid-argument',
                message: 'userMessage is required'
            });
        }

        const apiKey = process.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            console.error('❌ [AI] VITE_GEMINI_API_KEY is missing!');
            return res.status(500).json({
                error: 'configuration-error',
                message: 'AI service is not configured (missing API Key).'
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        const systemInstruction = getSystemPrompt(dynamicData);

        const contextText = Array.isArray(conversationContext)
            ? conversationContext.slice(-5).join('\n')
            : '';

        const fullPrompt = `${systemInstruction}\n\nRecent context:\n${contextText}\n\nUser (${userName || 'Member'}): ${userMessage}\nAI:`;

        console.log(`📡 [AI] Calling Gemini API...`);
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;

        if (!response) {
            throw new Error("No response object received from Gemini.");
        }

        const outputText = response.text() || "I'm sorry, I couldn't generate a response. Please try again.";
        console.log('✅ [AI] Response generated successfully.');

        return res.status(200).json({
            success: true,
            text: outputText
        });

    } catch (error) {
        console.error('❌ [AI Error]:', error);
        return res.status(500).json({
            success: false,
            error: 'internal',
            message: error.message || 'Failed to generate response'
        });
    }
};
