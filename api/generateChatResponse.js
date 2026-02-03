const { HfInference } = require('@huggingface/inference');

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

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'method-not-allowed',
            message: 'Only POST requests are allowed'
        });
    }

    try {
        const { userMessage, userName, conversationContext } = req.body;

        if (!userMessage) {
            return res.status(400).json({
                error: 'invalid-argument',
                message: 'userMessage is required'
            });
        }

        const apiKey = process.env.HUGGINGFACE_API_KEY;
        if (!apiKey) {
            return res.status(500).json({
                error: 'configuration-error',
                message: 'AI service is not configured.'
            });
        }

        const hf = new HfInference(apiKey);

        const contextMessages = conversationContext?.slice(-5).join('\n') || '';

        const systemInstruction = `You are "Doxa AI", a friendly and knowledgeable Christian assistant for the Doxa Portal church community. You help members with:
- Biblical questions and scripture references
- Prayer requests and spiritual guidance
- Church event information
- General Christian fellowship and encouragement

Respond in a warm, encouraging, and concise manner (2-3 sentences max). Use emojis appropriately. If asked about church-specific events or details you don't know, politely suggest they check the Events or Admin sections.`;

        const userQuery = `Context from recent messages:
${contextMessages}

${userName || 'A member'} asked: ${userMessage}`;

        const response = await hf.chatCompletion({
            model: 'meta-llama/Llama-3.1-8B-Instruct',
            messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: userQuery }
            ],
            max_tokens: 300,
            temperature: 0.7,
        });

        return res.status(200).json({
            success: true,
            text: response.choices[0].message.content
        });

    } catch (error) {
        console.error('❌ Error in generateChatResponse:', error);

        // Check for specific Hugging Face errors
        if (error.message && error.message.includes('auth')) {
            return res.status(500).json({
                error: 'auth-error',
                message: 'Authentication failed. Please check your HUGGINGFACE_API_KEY.'
            });
        }

        return res.status(500).json({
            error: 'internal',
            message: `AI Error: ${error.message || 'Unknown error'}`
        });
    }
};
