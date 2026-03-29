'use server';
/**
 * @fileOverview This file implements a Genkit flow to generate personalized reflection prompts and encouragement
 * based on a user's weekly report data. It provides gentle, AI-generated messages to support the user's
 * time management journey and encourage reflection.
 *
 * - aiPersonalizedReflectionPrompt - The main function to call for generating reflection prompts.
 * - ReflectionPromptInput - The input type for the aiPersonalizedReflectionPrompt function.
 * - ReflectionPromptOutput - The return type for the aiPersonalizedReflectionPrompt function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ReflectionPromptInputSchema = z.object({
  weeklyReport: z.object({
    totalEvents: z.number().describe('Total number of events in the weekly report.'),
    quadrantCounts: z.object({
      urgent_important: z.number(),
      not_urgent_important: z.number(),
      urgent_not_important: z.number(),
      not_urgent_not_important: z.number(),
    }).describe('Counts of events categorized by the 4 quadrants: urgent_important, not_urgent_important, urgent_not_important, not_urgent_not_important.'),
    statusCounts: z.object({
      done: z.number(),
      failed: z.number(),
      cancelled: z.number(),
    }).describe('Counts of events by their completion status (done, failed, cancelled).'),
    summaryText: z.string().optional().describe('User’s personal reflection notes for the week.'),
  }).describe('The user\'s weekly report data.'),
});
export type ReflectionPromptInput = z.infer<typeof ReflectionPromptInputSchema>;

const ReflectionPromptOutputSchema = z.object({
  reflectionPrompt: z.string().describe('A gentle, encouraging reflection question or thought.'),
  encouragementMessage: z.string().describe('A short, supportive and encouraging message.'),
});
export type ReflectionPromptOutput = z.infer<typeof ReflectionPromptOutputSchema>;

export async function aiPersonalizedReflectionPrompt(input: ReflectionPromptInput): Promise<ReflectionPromptOutput> {
  return aiPersonalizedReflectionPromptFlow(input);
}

const aiPersonalizedReflectionPromptPrompt = ai.definePrompt({
  name: 'aiPersonalizedReflectionPromptPrompt',
  input: { schema: ReflectionPromptInputSchema },
  output: { schema: ReflectionPromptOutputSchema },
  prompt: `You are a gentle and encouraging time management coach. Your goal is to help users reflect on their week and feel supported.
Based on the user's weekly report, provide a personalized reflection prompt and a short, encouraging message.

Weekly Report Summary:
- Total events: {{{weeklyReport.totalEvents}}}
- Quadrant breakdown:
  - Urgent & Important: {{{weeklyReport.quadrantCounts.urgent_important}}}
  - Not Urgent & Important: {{{weeklyReport.quadrantCounts.not_urgent_important}}}
  - Urgent & Not Important: {{{weeklyReport.quadrantCounts.urgent_not_important}}}
  - Not Urgent & Not Important: {{{weeklyReport.quadrantCounts.not_urgent_not_important}}}
- Status breakdown:
  - Done: {{{weeklyReport.statusCounts.done}}}
  - Failed: {{{weeklyReport.statusCounts.failed}}}
  - Cancelled: {{{weeklyReport.statusCounts.cancelled}}}

{{#if weeklyReport.summaryText}}
User's personal notes: "{{{weeklyReport.summaryText}}}"
{{/if}}

Consider the following points when generating the prompt and message:
- Celebrate accomplishments, especially if many tasks were 'Done' or in the 'Urgent & Important' / 'Not Urgent & Important' quadrants.
- If there were many 'Failed' or 'Cancelled' tasks, gently suggest reflection on the reasons without judgment, focusing on learning and growth.
- If 'Urgent & Not Important' or 'Not Urgent & Not Important' tasks were high, gently encourage prioritizing what truly matters.
- Always maintain a supportive, understanding, and positive tone.

Please output your response as a JSON object with two fields: "reflectionPrompt" and "encouragementMessage".`,
});

const aiPersonalizedReflectionPromptFlow = ai.defineFlow(
  {
    name: 'aiPersonalizedReflectionPromptFlow',
    inputSchema: ReflectionPromptInputSchema,
    outputSchema: ReflectionPromptOutputSchema,
  },
  async (input) => {
    const { output } = await aiPersonalizedReflectionPromptPrompt(input);
    return output!;
  }
);
