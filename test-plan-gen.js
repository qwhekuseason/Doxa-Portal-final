import { HfInference } from '@huggingface/inference';
import fs from 'fs';
import path from 'path';

const loadEnv = () => {
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
    console.error("Error: HUGGINGFACE_API_KEY not found in .env.local");
    process.exit(1);
}

async function testPlanGen() {
    console.log("Testing Hugging Face Qwen 2.5 API for Reading Plans...");
    const hf = new HfInference(API_KEY);

    const topic = "Patience";
    const duration = 1;

    try {
        const response = await hf.chatCompletion({
            model: 'Qwen/Qwen2.5-72B-Instruct',
            messages: [
                {
                    role: 'user',
                    content: `Generate a JSON Bible reading plan for "${topic}". Format: {"title":"T", "days":[]}. Return JSON only.`
                }
            ],
            max_tokens: 500,
            temperature: 0.1,
        });

        console.log("Response received!");
        console.log(response.choices[0].message.content);
    } catch (err) {
        console.error("API Call Failed:", err.message);
    }
}

testPlanGen();
