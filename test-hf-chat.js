
import { HfInference } from '@huggingface/inference';
import fs from 'fs';
import path from 'path';

const loadEnv = () => {
  if (process.env.HUGGINGFACE_API_KEY) return process.env.HUGGINGFACE_API_KEY;
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const data = fs.readFileSync(envPath, 'utf8');
      const match = data.match(/HUGGINGFACE_API_KEY=(hf_[a-zA-Z0-9]+)/);
      if (match) return match[1];
    }
  } catch (e) { }
  return null;
};

const API_KEY = loadEnv();
if (!API_KEY) {
  console.error("Error: HUGGINGFACE_API_KEY not found in .env.local or environment variables");
  process.exit(1);
}

async function testGen() {
  console.log("Testing Hugging Face API (Chat Completion)...");
  const hf = new HfInference(API_KEY, { endpointUrl: 'https://router.huggingface.co' });

  const genTopic = "Noah's Ark";
  const genDifficulty = "easy";

  // Note: For chatCompletion, we don't need [INST] tags usually, the API handles it.
  const userContent = `You are a Bible Quiz generator. Create a valid JSON object for a quiz about "${genTopic}" with difficulty "${genDifficulty}".
      
      Format strictly as:
      {
        "topic": "${genTopic}",
        "difficulty": "${genDifficulty}",
        "questions": [
          {
            "question": "Question text here",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctIndex": 0
          }
        ]
      }
      
      Requirements:
      - Generate exactly 2 questions.
      - Ensure valid JSON.
      - Do not include any markdown formatting or explanations (no \`\`\`json blocks).
      - Just return the JSON object.`;

  try {
    const response = await hf.chatCompletion({
      model: 'meta-llama/Llama-3.1-8B-Instruct',
      messages: [
        { role: "user", content: userContent }
      ],
      max_tokens: 1500,
      temperature: 0.7
    });

    console.log("Response received!");
    console.log("--------------------------------");
    // content is in response.choices[0].message.content
    const text = response.choices[0].message.content;
    console.log(text);
    console.log("--------------------------------");

    // Parse test
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }

    try {
      const json = JSON.parse(cleanText);
      console.log("JSON Parse Successful!");
      console.log("Topic:", json.topic);
    } catch (e) {
      console.error("JSON Parse Failed:", e.message);
    }

  } catch (err) {
    console.error("API Call Failed:", JSON.stringify(err, null, 2));
  }
}

testGen();
