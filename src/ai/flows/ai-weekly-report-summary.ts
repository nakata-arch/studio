'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating an AI-powered summary of a user's weekly time management performance.
 *
 * - aiWeeklyReportSummary - A function that handles the AI summary generation process.
 * - AiWeeklyReportSummaryInput - The input type for the aiWeeklyReportSummary function.
 * - AiWeeklyReportSummaryOutput - The return type for the aiWeeklyReportSummary function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AiWeeklyReportSummaryInputSchema = z.object({
  targetPeriod: z.string().describe('The period covered by the weekly report (e.g., "YYYY-MM-DD to YYYY-MM-DD").'),
  eventCount: z.number().describe('The total number of events in the report period.'),
  quadrantCounts: z.object({
    urgent_important: z.number().describe('Count of urgent and important events.'),
    not_urgent_important: z.number().describe('Count of not urgent but important events.'),
    urgent_not_important: z.number().describe('Count of urgent but not important events.'),
    not_urgent_not_important: z.number().describe('Count of not urgent and not important events.'),
  }).describe('Counts of events categorized by the 4-quadrant matrix.'),
  statusCounts: z.object({
    done: z.number().describe('Count of events marked as done.'),
    failed: z.number().describe('Count of events marked as failed.'),
    cancelled: z.number().describe('Count of events marked as cancelled.'),
  }).describe('Counts of events categorized by completion status.'),
  userReflection: z.string().optional().describe('Optional personal notes or reflection from the user for the week.'),
});
export type AiWeeklyReportSummaryInput = z.infer<typeof AiWeeklyReportSummaryInputSchema>;

const AiWeeklyReportSummaryOutputSchema = z.object({
  summary: z.string().describe('An AI-generated summary of the weekly time management performance.'),
  insight: z.string().optional().describe('Optional actionable insights or gentle suggestions based on the summary.'),
});
export type AiWeeklyReportSummaryOutput = z.infer<typeof AiWeeklyReportSummaryOutputSchema>;

export async function aiWeeklyReportSummary(input: AiWeeklyReportSummaryInput): Promise<AiWeeklyReportSummaryOutput> {
  return aiWeeklyReportSummaryFlow(input);
}

const aiWeeklyReportSummaryPrompt = ai.definePrompt({
  name: 'aiWeeklyReportSummaryPrompt',
  input: { schema: AiWeeklyReportSummaryInputSchema },
  output: { schema: AiWeeklyReportSummaryOutputSchema },
  prompt: `You are a supportive time management coach. Your goal is to provide a gentle, encouraging, and insightful summary of the user's weekly performance based on their report data. Help them understand their productivity patterns and identify areas for improvement without being critical.

Here is the weekly report data for the period: {{{targetPeriod}}}

- Total Events: {{{eventCount}}}
- Quadrant Breakdown:
  - Urgent & Important (Red): {{{quadrantCounts.urgent_important}}}
  - Not Urgent & Important (Blue): {{{quadrantCounts.not_urgent_important}}}
  - Urgent & Not Important (Yellow): {{{quadrantCounts.urgent_not_important}}}
  - Not Urgent & Not Important (Grey): {{{quadrantCounts.not_urgent_not_important}}}
- Completion Status:
  - Done: {{{statusCounts.done}}}
  - Failed: {{{statusCounts.failed}}}
  - Cancelled: {{{statusCounts.cancelled}}}
{{#if userReflection}}
- User's Personal Reflection: "{{{userReflection}}}"
{{/if}}

Based on this information, provide a concise summary of their week's time management performance. Focus on patterns, strengths, and subtle areas where they might consider adjusting their approach. Keep the tone warm, understanding, and forward-looking. Provide a main 'summary' and an optional 'insight' which could be a gentle suggestion or a reflective question.
`,
});

const aiWeeklyReportSummaryFlow = ai.defineFlow(
  {
    name: 'aiWeeklyReportSummaryFlow',
    inputSchema: AiWeeklyReportSummaryInputSchema,
    outputSchema: AiWeeklyReportSummaryOutputSchema,
  },
  async (input) => {
    const { output } = await aiWeeklyReportSummaryPrompt(input);
    if (!output) {
      throw new Error('Failed to generate weekly report summary.');
    }
    return output;
  }
);
