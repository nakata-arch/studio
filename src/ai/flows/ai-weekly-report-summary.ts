'use server';
/**
 * @fileOverview ユーザーの行動データに基づき、AIが客観的な要約を生成するGenkit Flow。
 * 
 * 指示に従い、評価・アドバイス・良し悪しの判定を完全に排除し、
 * 事実に基づいた要約と内省を促す問いかけのみを生成します。
 *
 * - aiWeeklyReportSummary - AI要約を実行するメイン関数。
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AiWeeklyReportSummaryInputSchema = z.object({
  targetPeriod: z.string().describe('分析対象の期間（例: "2024年3月1日" または "2024-03-01 to 2024-03-07"）。'),
  periodType: z.enum(['daily', 'weekly', 'monthly', 'yearly']).describe('期間の種別。'),
  eventCount: z.number().describe('期間内の総予定数。'),
  quadrantCounts: z.object({
    urgent_important: z.number(),
    not_urgent_important: z.number(),
    urgent_not_important: z.number(),
    not_urgent_not_important: z.number(),
  }).describe('4象限マトリックスごとの予定数。'),
  statusCounts: z.object({
    done: z.number(),
    failed: z.number(),
    cancelled: z.number(),
  }).describe('完了状態ごとの件数。'),
  userReflection: z.string().optional().describe('ユーザーが記入した日記やメモ。'),
});
export type AiWeeklyReportSummaryInput = z.infer<typeof AiWeeklyReportSummaryInputSchema>;

const AiWeeklyReportSummaryOutputSchema = z.object({
  trendSummary: z.string().describe('行動傾向の客観的な要約。1〜2文。'),
  reflection: z.string().describe('事実に基づいた、寄り添うまとめ。評価やアドバイスは含まない。'),
  question: z.string().describe('ユーザー自身が気づきを得るための、内省を促す問いかけ。'),
});
export type AiWeeklyReportSummaryOutput = z.infer<typeof AiWeeklyReportSummaryOutputSchema>;

export async function aiWeeklyReportSummary(input: AiWeeklyReportSummaryInput): Promise<AiWeeklyReportSummaryOutput> {
  return aiWeeklyReportSummaryFlow(input);
}

const aiWeeklyReportSummaryPrompt = ai.definePrompt({
  name: 'aiWeeklyReportSummaryPrompt',
  input: { schema: AiWeeklyReportSummaryInputSchema },
  output: { schema: AiWeeklyReportSummaryOutputSchema },
  prompt: `あなたは、ユーザーの記録を客観的に整理する冷静で優しい記録係です。

以下の記録は、ユーザーの{{{targetPeriod}}}（{{{periodType}}}）の活動データです。

予定数: {{{eventCount}}}
完了（できた）: {{{statusCounts.done}}}
未達成（できなかった）: {{{statusCounts.failed}}}
キャンセル: {{{statusCounts.cancelled}}}

4象限の分布:
- 重要かつ緊急: {{{quadrantCounts.urgent_important}}}
- 重要だが緊急ではない: {{{quadrantCounts.not_urgent_important}}}
- 緊急だが重要ではない: {{{quadrantCounts.urgent_not_important}}}
- 重要でも緊急でもない: {{{quadrantCounts.not_urgent_not_important}}}

ユーザーのメモ:
{{#if userReflection}}
{{{userReflection}}}
{{else}}
なし
{{/if}}

【厳守事項】
1. 事実の「要約」のみを行ってください。
2. ユーザーの行動に対する「評価（良い・悪い）」は絶対にしないでください。
3. 「アドバイス」や「改善提案」は一切行わないでください。
4. ユーザー自身が自分の時間の使い方に気づけるような「問いかけ」で締めくくってください。

出力（JSON）:
- trendSummary: データの客観的な要約。
- reflection: 活動の傾向を事実として伝えるまとめ。
- question: ユーザーの価値観や気づきを促す問いかけ。`,
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