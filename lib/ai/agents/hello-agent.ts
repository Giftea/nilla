import { z } from "zod";
import { ai, opikClient } from "../genkit";

// Input schema for the hello agent
export const HelloAgentInputSchema = z.object({
  name: z.string().describe("The name of the user to greet"),
  language: z
    .enum(["english", "spanish", "french", "german", "japanese"])
    .optional()
    .default("english")
    .describe("The language to respond in"),
  tone: z
    .enum(["formal", "casual", "enthusiastic"])
    .optional()
    .default("casual")
    .describe("The tone of the greeting"),
});

// Output schema for the hello agent
export const HelloAgentOutputSchema = z.object({
  greeting: z.string().describe("The personalized greeting message"),
  language: z.string().describe("The language used for the greeting"),
  timestamp: z
    .string()
    .describe("ISO timestamp of when the greeting was generated"),
});

// Type exports for convenience
export type HelloAgentInput = z.infer<typeof HelloAgentInputSchema>;
export type HelloAgentOutput = z.infer<typeof HelloAgentOutputSchema>;

// Define the hello agent flow
export const helloAgentFlow = ai.defineFlow(
  {
    name: "helloAgentFlow",
    inputSchema: HelloAgentInputSchema,
    outputSchema: HelloAgentOutputSchema,
  },
  async (input) => {
    const { name, language, tone } = input;
    const prompt = `You are a friendly assistant. Generate a ${tone} greeting for a person named "${name}" in ${language}.

    Respond with ONLY a JSON object in this exact format (no markdown, no code blocks):
    {
      "greeting": "your greeting message here",
      "language": "${language}"
    }`;

    // Use Genkit's model
    const response = await ai.generate({
      prompt,
    });

    const text = response.text.trim();

    // Parse the JSON response from the LLM
    let parsedResponse: { greeting: string; language: string };
    try {
      parsedResponse = JSON.parse(text);
    } catch {
      // Fallback if JSON parsing fails
      parsedResponse = {
        greeting: text,
        language: language || "english",
      };
    }

    const trace = opikClient.trace({
      name: "Enhanced Genkit Flow",
      input: { message: prompt },
      output: { response: parsedResponse },
    });
    trace.end();
    await opikClient.flush();
    return {
      greeting: parsedResponse.greeting,
      language: parsedResponse.language,
      timestamp: new Date().toISOString(),
    };
  },
);
