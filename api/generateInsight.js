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
        const { book, chapter, content } = req.body;

        if (!book || !chapter || !content) {
            return res.status(400).json({
                error: 'invalid-argument',
                message: 'book, chapter, and content are required'
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
        const response = await hf.chatCompletion({
            model: 'google/gemma-2-9b-it',
            messages: [
                {
                    role: 'user',
                    content: `Summarize the spiritual essence of ${book} ${chapter} in exactly 2 professional and inspiring sentences. Base it on this text: ${content.substring(0, 2000)}`
                }
            ],
            max_tokens: 200,
            temperature: 0.7,
        });

        return res.status(200).json({
            success: true,
            insight: response.choices[0].message.content
        });

    } catch (error) {
        console.error('Error in generateInsight:', error);
        return res.status(500).json({
            error: 'internal',
            message: 'Failed to generate insight.'
        });
    }
};
