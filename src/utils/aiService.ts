
// Hugging Face API is used via server-side endpoint /api/generateChatResponse

export interface AIResponse {
    text: string;
    success: boolean;
    error?: string;
}

export async function generateAIResponse(
    userMessage: string,
    userName: string,
    conversationContext?: string[]
): Promise<AIResponse> {
    try {
        const response = await fetch('/api/generateChatResponse', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userMessage,
                userName,
                conversationContext
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to generate response');
        }

        return {
            text: data.text,
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
