import OpenAI from "openai";
import { Opik, Trace, Span, flushAll } from "opik";
import { trackOpenAI } from "opik-openai";

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Shared Opik client for manual tracing
export const opik = new Opik();

// Wrap with Opik tracking for observability (uses shared client)
// Project name is configured via OPIK_PROJECT_NAME environment variable
export const ai = trackOpenAI(openai, { client: opik });

// Default model to use
export const DEFAULT_MODEL = "gpt-4o";

// Helper type for chat messages
export type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

// Create a tracked OpenAI client nested under a parent trace or span
export function createTrackedAI(generationName?: string, parent?: Trace | Span) {
  return trackOpenAI(openai, { client: opik, generationName, parent });
}

// Create a parent trace for agentic workflows
export function createAgentTrace(name: string, input?: Record<string, unknown>): Trace {
  return opik.trace({ name, input });
}

// Export Trace and Span types for use in agents
export type { Trace, Span };

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

// Ensure all traces and spans are flushed
export async function flushTraces(): Promise<void> {
  await flushAll();
}
