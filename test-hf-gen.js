
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
  console.log("Testing Hugging Face API with key...");
  const hf = new HfInference(API_KEY);

  const genTopic = "David and Goliath";
  const genDifficulty = "easy";

  const prompt = `[INST] You are a Bible Quiz generator. Create a valid JSON object for a quiz about "${genTopic}" with difficulty "${genDifficulty}".
      
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
      - Generate exactly 2 questions (short test).
      - Ensure valid JSON.
      - Do not include any markdown formatting or explanations (no \`\`\`json blocks).
      - Just return the JSON object.
      [/INST]`;

  try {
    const response = await hf.textGeneration({
      model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
      inputs: prompt,
      parameters: {
        max_new_tokens: 1500,
        temperature: 0.7,
        return_full_text: false
      }
    });

    console.log("Response received!");
    console.log("--------------------------------");
    console.log(response.generated_text);
    console.log("--------------------------------");

    // Parse test
    let text = response.generated_text;
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      text = text.substring(firstBrace, lastBrace + 1);
    }

    try {
      const json = JSON.parse(text);
      console.log("JSON Parse Successful!");
      console.log("Topic:", json.topic);
      console.log("Question Count:", json.questions.length);
    } catch (e) {
      console.error("JSON Parse Failed:", e.message);
    }

  } catch (err) {
    console.error("API Call Failed:", err);
  }
}

testGen();
