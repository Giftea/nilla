import OpenAI from "openai";
import { trackOpenAI } from "opik-openai";

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Wrap with Opik tracking for observability
// Project name is configured via OPIK_PROJECT_NAME environment variable
export const ai = trackOpenAI(openai);

// Default model to use
export const DEFAULT_MODEL = "gpt-4o";

// Helper type for chat messages
export type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

// Helper function to generate chat completions with structured output
export async function generateCompletion(
  messages: ChatMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const completion = await ai.chat.completions.create({
    model: options?.model ?? DEFAULT_MODEL,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2048,
  });

  return completion.choices[0]?.message?.content ?? "";
}

// Ensure traces are flushed (call before app termination or after important operations)
export async function flushTraces(): Promise<void> {
  await ai.flush();
}
