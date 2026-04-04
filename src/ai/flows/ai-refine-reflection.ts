'use server';
/**
 * @fileOverview 書きかけのメモやボイスメモの音声を、AIが読みやすい日記形式に整えるGenkit Flow。
 *
 * - refineReflection - 入力されたテキストまたは音声を元に、日記を清書する関数。
 * - RefineReflectionInput - 入力スキーマ（テキストまたは音声データURI）。
 * - RefineReflectionOutput - 出力スキーマ（整形されたテキスト）。
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RefineReflectionInputSchema = z.object({
  text: z.string().optional().describe('ユーザーが入力した書きかけのテキストやメモ。'),
  audioDataUri: z.string().optional().describe('録音されたボイスメモ（data:audio/webm;base64,... 形式）。'),
});
export type RefineReflectionInput = z.infer<typeof RefineReflectionInputSchema>;

const RefineReflectionOutputSchema = z.object({
  refinedText: z.string().describe('AIによって整えられた、読みやすく温かみのある日記の文章。'),
});
export type RefineReflectionOutput = z.infer<typeof RefineReflectionOutputSchema>;

export async function refineReflection(input: RefineReflectionInput): Promise<RefineReflectionOutput> {
  return refineReflectionFlow(input);
}

const refineReflectionPrompt = ai.definePrompt({
  name: 'refineReflectionPrompt',
  input: { schema: RefineReflectionInputSchema },
  output: { schema: RefineReflectionOutputSchema },
  prompt: `あなたは穏やかで思慮深い日記の代筆者、あるいはタイムマネジメント・コーチです。
ユーザーから提供された「断片的なメモ」または「録音された音声」を元に、その日の振り返り日記を優しく、読みやすく整えてください。

{{#if audioDataUri}}
音声の内容を聞き取り、その時の感情や出来事を丁寧に汲み取ってください。
{{media url=audioDataUri}}
{{/if}}

{{#if text}}
以下のメモを元に、文章を整えてください：
「{{{text}}}」
{{/if}}

指針：
- ユーザーの口調や感情を尊重しつつ、支離滅裂な部分は整理してください。
- 1人称（私）の視点で、温かみのある文体にしてください。
- 長すぎず、150文字〜300文字程度にまとめてください。
- 決して批判せず、その日の努力や気づきを肯定的に捉えてください。
- 元の内容にない事実を捏造しないでください。

出力はJSON形式で、"refinedText" に整形後の文章を格納してください。`,
});

const refineReflectionFlow = ai.defineFlow(
  {
    name: 'refineReflectionFlow',
    inputSchema: RefineReflectionInputSchema,
    outputSchema: RefineReflectionOutputSchema,
  },
  async (input) => {
    const { output } = await refineReflectionPrompt(input);
    if (!output) {
      throw new Error('Failed to refine reflection.');
    }
    return output;
  }
);
