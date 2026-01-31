import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY || 'AIzaSyBzRl83ISEt9eM0sj4eXaA1y6EMTQ8QRTU';

let genAI: GoogleGenerativeAI | null = null;

try {
    genAI = new GoogleGenerativeAI(API_KEY);
} catch (error) {
    console.error('Failed to initialize Gemini AI:', error);
}

export interface AIResponse {
    text: string;
    success: boolean;
    error?: string;
}

/**
 * Generate a response from the AI assistant for community chat
 */
export async function generateAIResponse(
    userMessage: string,
    userName: string,
    conversationContext?: string[]
): Promise<AIResponse> {
    if (!genAI) {
        return {
            text: "I'm currently unavailable. Please try again later.",
            success: false,
            error: 'AI service not initialized'
        };
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        // Build context-aware prompt
        const contextMessages = conversationContext?.slice(-5).join('\n') || '';

        const prompt = `You are "Doxa AI", a friendly and knowledgeable Christian assistant for the Doxa Portal church community. You help members with:
- Biblical questions and scripture references
- Prayer requests and spiritual guidance
- Church event information
- General Christian fellowship and encouragement

Context from recent messages:
${contextMessages}

${userName} asked: ${userMessage}

Respond in a warm, encouraging, and concise manner (2-3 sentences max). Use emojis appropriately. If asked about church-specific events or details you don't know, politely suggest they check the Events or Admin sections.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return {
            text: text.trim(),
            success: true
        };
    } catch (error: any) {
        console.error('AI generation error:', error);

        // Fallback responses for common scenarios
        const fallbackResponses = [
            "I'm here to help! Could you rephrase your question? 🙏",
            "That's a great question! Let me think... Actually, I'm having trouble right now. Please try again! 💭",
            "I'd love to help, but I'm experiencing some technical difficulties. Please reach out to a church leader! 🤝"
        ];

        return {
            text: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
            success: false,
            error: error.message
        };
    }
}

/**
 * Check if a message mentions the AI bot
 */
export function isAIMention(message: string): boolean {
    const mentions = ['@doxa', '@ai', '@bot', '@doxaai'];
    const lowerMessage = message.toLowerCase();
    return mentions.some(mention => lowerMessage.includes(mention));
}

/**
 * Extract the actual message without the AI mention
 */
export function extractMessageWithoutMention(message: string): string {
    return message
        .replace(/@doxa/gi, '')
        .replace(/@ai/gi, '')
        .replace(/@bot/gi, '')
        .replace(/@doxaai/gi, '')
        .trim();
}
