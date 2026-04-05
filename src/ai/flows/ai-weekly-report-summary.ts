'use server';
/**
 * @fileOverview ユーザーの行動データに基づき、AIが自動的に振り返り分析を行うGenkit Flow。
 * 
 * 入力された統計データ（予定数、完了数、4象限の分布）とユーザーのメモを元に、
 * 行動の傾向、優しい振り返り、そして内省を促す問いかけを生成します。
 *
 * - aiWeeklyReportSummary - AI分析を実行するメイン関数。
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
  reflection: z.string().describe('ユーザーに寄り添う、温かみのある振り返りコメント。'),
  question: z.string().describe('内省を促す、最後の一言（問いかけ）。'),
});
export type AiWeeklyReportSummaryOutput = z.infer<typeof AiWeeklyReportSummaryOutputSchema>;

export async function aiWeeklyReportSummary(input: AiWeeklyReportSummaryInput): Promise<AiWeeklyReportSummaryOutput> {
  return aiWeeklyReportSummaryFlow(input);
}

const aiWeeklyReportSummaryPrompt = ai.definePrompt({
  name: 'aiWeeklyReportSummaryPrompt',
  input: { schema: AiWeeklyReportSummaryInputSchema },
  output: { schema: AiWeeklyReportSummaryOutputSchema },
  prompt: `あなたは優しいコーチです。

以下はユーザーの{{{targetPeriod}}}（{{{periodType}}}）の記録です。

予定数: {{{eventCount}}}
できた: {{{statusCounts.done}}}
できなかった: {{{statusCounts.failed}}}
キャンセル: {{{statusCounts.cancelled}}}

4象限:
重要かつ緊急: {{{quadrantCounts.urgent_important}}}
重要だが緊急ではない: {{{quadrantCounts.not_urgent_important}}}
緊急だが重要ではない: {{{quadrantCounts.urgent_not_important}}}
重要でも緊急でもない: {{{quadrantCounts.not_urgent_not_important}}}

日記:
{{#if userReflection}}
{{{userReflection}}}
{{else}}
なし
{{/if}}

この情報から以下を生成してください。
- 行動傾向の要約（1〜2文）
- やさしい振り返り
- 最後に問いかけ

指針：
- 断定を避け、「〜かもしれません」「〜のようです」といった寄り添う表現を使ってください。
- できた割合が低い場合は「少し無理な予定が多かったかもしれません」と優しく伝え、高い場合は「一つひとつ丁寧に進められていたようです」と肯定してください。
- 緊急の予定が多い場合は「少し忙しさに追われていたかもしれません」と共感し、重要（非緊急）が少ない場合は「大切なことに使える時間が、少し少なかったかもしれません」と気づきを促してください。

禁止:
- 強い否定
- 指導的すぎる表現

出力はJSON形式で、trendSummary, reflection, question の3つのフィールドに格納してください。`,
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
