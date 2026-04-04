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
  prompt: `あなたは穏やかで思慮深いタイムマネジメント・コーチです。
ユーザーの活動データ（期間: {{{targetPeriod}}}）に基づき、優しく語りかけるような振り返りを生成してください。

データ:
- 総予定数: {{{eventCount}}}
- 4象限の分布:
  - 緊急かつ重要: {{{quadrantCounts.urgent_important}}}
  - 緊急ではないが重要: {{{quadrantCounts.not_urgent_important}}}
  - 緊急だが重要ではない: {{{quadrantCounts.urgent_not_important}}}
  - 緊急でも重要でもない: {{{quadrantCounts.not_urgent_not_important}}}
- 完了状態:
  - できた: {{{statusCounts.done}}}
  - 未達: {{{statusCounts.failed}}}
  - 中止: {{{statusCounts.cancelled}}}

{{#if userReflection}}
ユーザーのメモ: "{{{userReflection}}}"
{{/if}}

指針:
1. 行動傾向の要約 (trendSummary):
   - データの偏りから見える行動のパターンを、客観的かつ柔らかく伝えてください。
   - 「忙しさに追われていた」「自分の時間を大切にできていた」など、状況を鏡のように映し出します。

2. やさしい振り返りコメント (reflection):
   - ユーザーの努力を肯定し、できたことに目を向けます。
   - できなかったことに対しても「無理があったのかもしれない」と優しく寄り添います。
   - 「〜かもしれません」「〜のようです」という表現を使い、断定を避けてください。

3. 問いかけ (question):
   - ユーザーが次への一歩を自ら考えるきっかけになる短い問いを1つ添えてください。

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
