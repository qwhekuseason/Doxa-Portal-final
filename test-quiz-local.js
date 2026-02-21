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

async function testQuiz() {
    console.log("Testing existing generateQuiz endpoint locally...");
    const response = await fetch("http://127.0.0.1:3001/generateQuiz", {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({ topic: "Noah", difficulty: "easy", questionCount: 2 }),
    });
    const result = await response.json();
    console.log(JSON.stringify(result, null, 2));
}

testQuiz();
