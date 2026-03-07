'use server';
/**
 * @fileOverview An AI agent that analyzes imported data and suggests an optimal organizational structure.
 *
 * - suggestDataSchema - A function that handles the data schema suggestion process.
 * - AIDataSchemaSuggestionInput - The input type for the suggestDataSchema function.
 * - AIDataSchemaSuggestionOutput - The return type for the suggestDataSchema function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIDataSchemaSuggestionInputSchema = z.object({
  rawData: z.string().describe('The raw imported data, e.g., CSV or JSON content.'),
});
export type AIDataSchemaSuggestionInput = z.infer<typeof AIDataSchemaSuggestionInputSchema>;

const AIDataSchemaSuggestionOutputSchema = z.object({
  suggestedSchema: z.string().describe(
    'A JSON string representing the suggested schema for the data, e.g., a JSON Schema draft.'
  ),
  keyEntities: z
    .array(z.string())
    .describe('An array of key entities or fields identified in the data.'),
  explanation: z.string().describe('An explanation of the suggested schema and key entities.'),
});
export type AIDataSchemaSuggestionOutput = z.infer<typeof AIDataSchemaSuggestionOutputSchema>;

export async function suggestDataSchema(
  input: AIDataSchemaSuggestionInput
): Promise<AIDataSchemaSuggestionOutput> {
  return aiDataSchemaSuggestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiDataSchemaSuggestionPrompt',
  input: {schema: AIDataSchemaSuggestionInputSchema},
  output: {schema: AIDataSchemaSuggestionOutputSchema},
  prompt: `You are an AI assistant specialized in data analysis and schema design.
Your task is to analyze the provided raw dataset and suggest an optimal organizational structure for it.
This includes identifying key entities/fields and proposing a structured schema (e.g., a JSON schema draft).
Provide an explanation for your suggestions.

Raw Data:
---
{{{rawData}}}
---

Analyze the data and output a JSON object conforming to the AIDataSchemaSuggestionOutputSchema.
`,
});

const aiDataSchemaSuggestionFlow = ai.defineFlow(
  {
    name: 'aiDataSchemaSuggestionFlow',
    inputSchema: AIDataSchemaSuggestionInputSchema,
    outputSchema: AIDataSchemaSuggestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
