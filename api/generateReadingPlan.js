// Vercel Serverless Function for AI Reading Plan Generation using Google Gemini
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

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'method-not-allowed',
            message: 'Only POST requests are allowed'
        });
    }

    try {
        const { topic, duration = 7, category = 'bible', difficulty = 'intermediate' } = req.body;

        // Validate inputs
        if (!topic || typeof topic !== 'string') {
            return res.status(400).json({
                error: 'invalid-argument',
                message: 'topic is required and must be a string'
            });
        }

        const apiKey = process.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({
                error: 'configuration-error',
                message: 'AI generation is not configured.'
            });
        }

        console.log('🤖 AI Request for topic:', topic);

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        const prompt = `You are a Bible Reading Plan generator. Create a valid JSON object for a reading plan about "${topic}" for exactly ${duration} days.
The category is "${category}" and difficulty is "${difficulty}".

Format strictly as JSON:
{
  "title": "Title",
  "description": "Description",
  "duration": ${duration},
  "category": "${category}",
  "difficulty": "${difficulty}",
  "days": [
    {
      "dayNumber": 1,
      "title": "Day 1: Title",
      "description": "Short reflection.",
      "passages": ["John 1:1-18"]
    }
  ]
}

- Generate exactly ${duration} days.
- Ensure valid JSON.
- Provide real, relevant Bible passages.
- Return ONLY the JSON object, NO markdown tags, NO preamble.`;

        console.log(`📡 [AI Progress] Sending request to Gemini (${duration} days)...`);
        const result = await model.generateContent(prompt);
        console.log('⏳ [AI Progress] Waiting for API response...');
        const response = await result.response;
        console.log('✅ [AI Progress] API Response received!');
        let text = response.text();

        if (!text) throw new Error('No response from AI model');

        console.log('📝 Received AI response, length:', text.length);

        // Sanitize response
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1) {
            console.error('❌ Malformed AI text:', text);
            throw new Error('Invalid JSON structure returned by AI');
        }
        text = text.substring(firstBrace, lastBrace + 1);

        const planData = JSON.parse(text);

        return res.status(200).json({
            success: true,
            plan: planData
        });

    } catch (error) {
        console.error('❌ Error generating reading plan:', error);

        return res.status(500).json({
            error: 'internal',
            message: error.message || 'Failed to generate reading plan'
        });
    }
};
