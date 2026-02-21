// Local server function for AI Reading Plan Generation using Google Gemini
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '../.env.local' });

async function generateReadingPlan(req, res) {
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
            console.error('❌ No API key found in environment');
            return res.status(500).json({
                error: 'configuration-error',
                message: 'AI generation is not configured.'
            });
        }

        console.log('🤖 AI Request for topic:', topic);
        console.log('📝 Using API key:', apiKey.substring(0, 10) + '...');

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

        console.log('🧹 [AI Progress] Sanitizing and parsing JSON...');
        const planData = JSON.parse(text);

        console.log('🎉 [AI Progress] Successfully generated reading plan!');
        return res.status(200).json({
            success: true,
            plan: planData
        });

    } catch (error) {
        console.error('❌ Error generating reading plan:', error);

        // Log more details if it's a Gemini error
        if (error.stack) console.error(error.stack);

        return res.status(500).json({
            error: 'internal',
            message: error.message || 'Failed to generate reading plan',
            details: error.toString()
        });
    }
}

module.exports = generateReadingPlan;
