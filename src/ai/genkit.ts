import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Configurazione centrale di Genkit per l'AI.
 * Utilizza il plugin Google Generative AI versione 1.x.
 */
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-flash',
});