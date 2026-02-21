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

async function testConversational() {
    console.log("Testing hf.conversational for Zephyr...");
    const hf = new HfInference(API_KEY);
    try {
        const result = await hf.conversational({
            model: 'HuggingFaceH4/zephyr-7b-beta',
            inputs: {
                text: "Hello, generate a JSON reading plan for Joy (1 day).",
            }
        });
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Conversational failed:", e.message);
    }
}

testConversational();
