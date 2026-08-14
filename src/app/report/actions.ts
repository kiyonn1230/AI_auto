'use server';

import Anthropic from '@anthropic-ai/sdk';

export type Tone = 'polite' | 'friendly';

export type ReportInput = {
  studentLabel: string;
  grade: string;
  didThisMonth: string;
  improved: string;
  concern: string;
  tone: Tone;
};

export type ReportResult = { ok: true; text: string } | { ok: false; message: string };

const TONE_GUIDE: Record<Tone, string> = {
  polite: '丁寧で落ち着いた敬体。かしこまりすぎず、事務的にもならない。',
  friendly: '親しみやすい敬体。柔らかく、話しかけるような温度感。',
};

const SYSTEM_PROMPT = `あなたは学習塾・習い事教室の先生の代わりに、保護者へ送る月次レポートを書きます。

このレポートの目的は、保護者に「うちの子をちゃんと見てくれている」と感じてもらうことです。
情報を伝えることより、その安心感が主目的です。

書き方:
- 300〜400字程度。長すぎると読まれません
- 先生が保護者へ直接書いた手紙として書く
- 先生のメモにある具体的な事実を必ず入れる。それがレポートの価値です
- 気になる点は、家庭で何ができるかの提案とセットにする。指摘だけで終えない
- 最後は前向きに締める

絶対に守ること:
- メモに書かれていない事実を作らない。テストの点数、他の生徒との比較、
  具体的なエピソードなど、与えられていない情報は一切書かない
- メモが薄いときは、無理に膨らませず短くまとめる
- 「AIが生成しました」といった記述は入れない

出力はレポート本文のみ。前置きも説明も見出しも付けない。`;

function buildUserPrompt(input: ReportInput): string {
  const lines = [
    `生徒: ${input.studentLabel || '（未記入）'}`,
    input.grade ? `学年・年齢: ${input.grade}` : null,
    '',
    `【今月やったこと】`,
    input.didThisMonth || '（記入なし）',
    '',
    `【できるようになったこと】`,
    input.improved || '（記入なし）',
    '',
    `【気になること】`,
    input.concern || '（記入なし）',
    '',
    `文体: ${TONE_GUIDE[input.tone]}`,
  ];
  return lines.filter((line) => line !== null).join('\n');
}

export async function generateReport(input: ReportInput): Promise<ReportResult> {
  if (!input.didThisMonth.trim() && !input.improved.trim() && !input.concern.trim()) {
    return { ok: false, message: 'メモを1つ以上入力してください' };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      message: 'ANTHROPIC_API_KEY が設定されていません。.env.local に追加してください。',
    };
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      // 適応的思考が既定で走るので、本文ぶんに加えて余裕を持たせる
      max_tokens: 8000,
      output_config: { effort: 'low' },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
    });

    if (response.stop_reason === 'refusal') {
      return { ok: false, message: '生成が拒否されました。メモの内容を確認してください。' };
    }

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!text) {
      return { ok: false, message: '本文を生成できませんでした。もう一度お試しください。' };
    }

    return { ok: true, text };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, message: 'APIキーが正しくありません。' };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, message: '混み合っています。少し待ってからお試しください。' };
    }
    if (error instanceof Anthropic.APIError) {
      return { ok: false, message: `生成に失敗しました（${error.status}）。` };
    }
    return { ok: false, message: '生成に失敗しました。通信環境を確認してください。' };
  }
}
