import 'dotenv/config';

export class OpenAIClient {
  static async chatCompletion({ messages, model = 'gpt-4', temperature = 0.7 }: {
    messages: Array<{ role: string; content: string }>;
    model?: string;
    temperature?: number;
  }): Promise<{ content: string }> {
    // @ts-expect-error - Vite environment variables are not typed by default
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) throw new Error('Missing OpenAI API key');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature,
        messages
      })
    });

    if (!response.ok) {
      console.error('❌ OpenAI request failed:', response.status, await response.text());
      return { content: '' };
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || ''
    };
  }
} 