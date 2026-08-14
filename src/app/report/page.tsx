'use client';

import { useState, useTransition } from 'react';
import { generateReport, type Tone } from './actions';
import styles from './report.module.css';

export default function ReportPage() {
  const [studentLabel, setStudentLabel] = useState('');
  const [grade, setGrade] = useState('');
  const [didThisMonth, setDidThisMonth] = useState('');
  const [improved, setImproved] = useState('');
  const [concern, setConcern] = useState('');
  const [tone, setTone] = useState<Tone>('polite');

  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCopied(false);

    startTransition(async () => {
      const response = await generateReport({
        studentLabel,
        grade,
        didThisMonth,
        improved,
        concern,
        tone,
      });
      if (response.ok) {
        setResult(response.text);
      } else {
        setResult(null);
        setError(response.message);
      }
    });
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <h1 className={styles.title}>保護者レポート作成</h1>
          <p className={styles.lead}>
            メモを書くだけで、保護者にそのまま送れる文章になります。
          </p>
        </header>

        <form className={styles.card} onSubmit={handleSubmit}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="student">
                生徒
              </label>
              <span className={styles.hint}>お名前は入れず、イニシャルや記号で</span>
              <input
                id="student"
                className={styles.input}
                value={studentLabel}
                onChange={(event) => setStudentLabel(event.target.value)}
                placeholder="A さん"
                maxLength={40}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="grade">
                学年・年齢
              </label>
              <span className={styles.hint}>文章の言葉づかいの調整に使います</span>
              <input
                id="grade"
                className={styles.input}
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                placeholder="小学3年生"
                maxLength={40}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="did">
              今月やったこと
            </label>
            <textarea
              id="did"
              className={styles.textarea}
              value={didThisMonth}
              onChange={(event) => setDidThisMonth(event.target.value)}
              placeholder="わり算の筆算、文章題を中心に。宿題はほぼ毎回提出。"
              maxLength={1000}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="improved">
              できるようになったこと
            </label>
            <textarea
              id="improved"
              className={styles.textarea}
              value={improved}
              onChange={(event) => setImproved(event.target.value)}
              placeholder="計算のスピードが上がった。答え合わせを自分でするようになった。"
              maxLength={1000}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="concern">
              気になること
            </label>
            <span className={styles.hint}>
              ご家庭でできることの提案とセットで文章にします
            </span>
            <textarea
              id="concern"
              className={styles.textarea}
              value={concern}
              onChange={(event) => setConcern(event.target.value)}
              placeholder="文章題になると手が止まりやすい。読み飛ばしが多い。"
              maxLength={1000}
            />
          </div>

          <div className={styles.field}>
            <span className={styles.label}>文体</span>
            <div className={styles.toneGroup}>
              <button
                type="button"
                className={styles.toneButton}
                aria-pressed={tone === 'polite'}
                onClick={() => setTone('polite')}
              >
                丁寧め
              </button>
              <button
                type="button"
                className={styles.toneButton}
                aria-pressed={tone === 'friendly'}
                onClick={() => setTone('friendly')}
              >
                親しみやすめ
              </button>
            </div>
          </div>

          <button type="submit" className={styles.submit} disabled={pending}>
            {pending ? '作成しています…' : 'レポートを作る'}
          </button>

          {error && <p className={styles.error}>{error}</p>}

          <p className={styles.notice}>
            生徒さんのお名前・住所・連絡先は入力しないでください。
            入力された内容は文章の作成のみに使い、保存していません。
          </p>
        </form>

        {result && (
          <section className={styles.result}>
            <div className={styles.resultHead}>
              <h2 className={styles.resultTitle}>できあがった文章</h2>
              <button type="button" className={styles.copyButton} onClick={handleCopy}>
                {copied ? 'コピーしました' : 'コピー'}
              </button>
            </div>
            <p className={styles.resultBody}>{result}</p>
            <p className={styles.resultFoot}>
              そのまま送らず、必ず目を通してから使ってください。
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
