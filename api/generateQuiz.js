// Vercel Serverless Function for AI Quiz Generation
// This handles quiz generation server-side to keep API keys secure

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
        const { topic, difficulty = 'medium', questionCount = 5 } = req.body;

        // Validate inputs
        if (!topic || typeof topic !== 'string') {
            return res.status(400).json({
                error: 'invalid-argument',
                message: 'topic is required and must be a string'
            });
        }

        if (!['easy', 'medium', 'hard'].includes(difficulty)) {
            return res.status(400).json({
                error: 'invalid-argument',
                message: 'difficulty must be easy, medium, or hard'
            });
        }

        if (questionCount < 1 || questionCount > 10) {
            return res.status(400).json({
                error: 'invalid-argument',
                message: 'questionCount must be between 1 and 10'
            });
        }

        // Get API key from environment
        const apiKey = process.env.HUGGINGFACE_API_KEY;

        if (!apiKey) {
            console.error('❌ HUGGINGFACE_API_KEY not configured');
            return res.status(500).json({
                error: 'configuration-error',
                message: 'AI generation is not configured. Please contact the administrator.'
            });
        }

        console.log(`🤖 Generating quiz: topic="${topic}", difficulty="${difficulty}", questions=${questionCount}`);

        // Initialize Hugging Face client
        const hf = new HfInference(apiKey);

        // Call Hugging Face API
        const response = await hf.chatCompletion({
            model: 'google/gemma-2-9b-it',
            messages: [
                {
                    role: 'user',
                    content: `You are a Bible Quiz generator. Create a valid JSON object for a quiz about "${topic}" with difficulty "${difficulty}".

Format strictly as:
{
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0
    }
  ]
}

Requirements:
- Generate exactly ${questionCount} questions.
- Ensure valid JSON.
- Do not include any markdown formatting or explanations (no \`\`\`json blocks).
- Just return the JSON object.`
                }
            ],
            max_tokens: 3000,
            temperature: 0.7,
        });

        let text = response.choices[0].message.content;

        if (!text) {
            throw new Error('No response from AI model');
        }

        console.log('📝 Raw AI Response received');

        // Clean potential markdown or extra text
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        // Find the first { and last }
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1) {
            throw new Error('Invalid JSON structure in AI response');
        }

        text = text.substring(firstBrace, lastBrace + 1);

        // Parse JSON
        const quizData = JSON.parse(text);

        // Validate structure
        if (!quizData.questions || !Array.isArray(quizData.questions)) {
            throw new Error('Invalid quiz structure: missing questions array');
        }

        if (quizData.questions.length === 0) {
            throw new Error('No questions generated');
        }

        // Validate each question
        for (let i = 0; i < quizData.questions.length; i++) {
            const q = quizData.questions[i];
            if (!q.question || !Array.isArray(q.options) || typeof q.correctIndex !== 'number') {
                throw new Error(`Invalid question structure at index ${i}`);
            }
            if (q.options.length !== 4) {
                throw new Error(`Question ${i} must have exactly 4 options`);
            }
            if (q.correctIndex < 0 || q.correctIndex > 3) {
                throw new Error(`Question ${i} has invalid correctIndex`);
            }
        }

        console.log(`✅ Quiz generated successfully with ${quizData.questions.length} questions`);

        // Return the quiz data
        return res.status(200).json({
            success: true,
            quiz: quizData
        });

    } catch (error) {
        console.error('❌ Error generating quiz:', error);

        // Check if it's a JSON parse error
        if (error instanceof SyntaxError) {
            return res.status(500).json({
                error: 'ai-response-error',
                message: 'AI generation failed. The response was not valid. Please try again.'
            });
        }

        return res.status(500).json({
            error: 'internal',
            message: error.message || 'Failed to generate quiz'
        });
    }
};
