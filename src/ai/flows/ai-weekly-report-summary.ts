'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating an AI-powered summary of a user's time management performance.
 *
 * - aiWeeklyReportSummary - A function that handles the AI summary generation process.
 * - AiWeeklyReportSummaryInput - The input type for the aiWeeklyReportSummary function.
 * - AiWeeklyReportSummaryOutput - The return type for the aiWeeklyReportSummary function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AiWeeklyReportSummaryInputSchema = z.object({
  targetPeriod: z.string().describe('The period covered by the report (e.g., "YYYY-MM-DD to YYYY-MM-DD").'),
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
  summary: z.string().describe('A gentle AI-generated reflection message based on performance.'),
  insight: z.string().describe('A reflective question for the user to encourage introspection.'),
});
export type AiWeeklyReportSummaryOutput = z.infer<typeof AiWeeklyReportSummaryOutputSchema>;

export async function aiWeeklyReportSummary(input: AiWeeklyReportSummaryInput): Promise<AiWeeklyReportSummaryOutput> {
  return aiWeeklyReportSummaryFlow(input);
}

const aiWeeklyReportSummaryPrompt = ai.definePrompt({
  name: 'aiWeeklyReportSummaryPrompt',
  input: { schema: AiWeeklyReportSummaryInputSchema },
  output: { schema: AiWeeklyReportSummaryOutputSchema },
  prompt: `あなたは穏やかで思慮深いタイムマネジメント・コーチです。
ユーザーの期間中（{{{targetPeriod}}}）の活動データに基づき、優しく語りかけるような振り返りメッセージと問いかけを生成してください。

データ:
- 合計予定数: {{{eventCount}}}
- 4象限の分布:
  - 緊急かつ重要: {{{quadrantCounts.urgent_important}}}
  - 緊急ではないが重要: {{{quadrantCounts.not_urgent_important}}}
  - 緊急だが重要ではない: {{{quadrantCounts.urgent_not_important}}}
  - 緊急でも重要でもない: {{{quadrantCounts.not_urgent_not_important}}}
- 完了状態:
  - できた: {{{statusCounts.done}}}
  - 未達: {{{statusCounts.failed}}}
  - 中止: {{{statusCounts.cancelled}}}

指針:
1. 振り返りメッセージ（summary）:
   - 1〜2文で短く。
   - 断定を避け「〜かもしれません」「〜のようです」といった柔らかい表現を使ってください。
   - 決して責めず、ユーザーが自分の状況を静かに眺められるようにします。
   - 判断基準の例:
     - 緊急（🚨）が多い場合: 「少し忙しさに追われていたかもしれません。」
     - 重要（✨）が少ない場合: 「大切なことに使える時間が、少し少なかったかもしれません。」
     - 全体のバランスが良い場合: 「落ち着いた時間の使い方ができていたようです。」
     - 完了率（できた割合）が低い場合: 「少し無理な予定が多かったかもしれません。」
     - 完了率が高い場合: 「一つひとつ丁寧に進められていたようです。」

2. 問いかけ（insight）:
   - ユーザーが次への一歩を考えるきっかけになるような短い問いかけを1つ添えてください。
   - 例: 「次は何を減らしたいですか？」「本当に大切にしたいことは何ですか？」

出力はJSON形式で、"summary" と "insight" にそれぞれ格納してください。`,
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
      throw new Error('Failed to generate report summary.');
    }
    return output;
  }
);
