
// Hugging Face API is used via server-side endpoint /api/generateChatResponse

export interface AIResponse {
    text: string;
    success: boolean;
    error?: string;
}

export async function generateAIResponse(
    userMessage: string,
    userName: string,
    conversationContext?: string[],
    dynamicData?: any
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
                conversationContext,
                dynamicData
            }),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            if (response.status === 429) {
                throw new Error("The AI is a bit busy right now (quota exceeded). Please try again in a minute! ⏳");
            }
            throw new Error(`Server error (${response.status}): ${errorText.substring(0, 100)}`);
        }

        const data = await response.json();

        return {
            text: data.text,
            success: true
        };
    } catch (error: any) {
        console.error('💥 [Doxa AI Service] Critical Error:', error);

        // If we have a more specific error, log it for debugging
        if (error.message) {
            console.log('📝 [Doxa AI Debug] Error details:', error.message);
        }

        // Fallback responses for common scenarios
        const fallbackResponses = [
            "I'm here to help! Could you rephrase your question? 🙏",
            "That's a great question! Let me think... Actually, I'm having trouble right now. Please try again! 💭",
            "I'd love to help, but I'm experiencing some technical difficulties. Please reach out to a family leader! 🤝"
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
