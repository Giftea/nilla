import { genkit } from "genkit";
import { openAI, gpt4o } from "genkitx-openai";
import { Opik } from 'opik';

export const ai = genkit({
  plugins: [
    openAI({
      apiKey: process.env.OPENAI_API_KEY,
    }),
  ],
  model: gpt4o,
});

// Initialize Opik client
export const opikClient = new Opik({
  apiKey: process.env.OPIK_API_KEY,
  apiUrl: process.env.OPIK_URL_OVERRIDE,
  projectName: process.env.OPIK_PROJECT_NAME,
  workspaceName: process.env.OPIK_WORKSPACE,
});

