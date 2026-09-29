'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  LIMITS,
  STATUSES,
  formatDateTime,
  statusLabel,
  type Reservation,
  type ReservationStatus,
} from '@/lib/reservations';
import { deleteReservation, updateReservation, type ReservationPatch } from './actions';
import styles from './admin.module.css';

type SortKey = 'date1' | 'createdDesc' | 'createdAsc';
type RowNotice = { kind: 'busy' | 'saved' | 'error'; text: string };

type Props = {
  initialReservations: Reservation[];
  loadLimit: number;
};

const STATUS_CLASS: Record<ReservationStatus, string> = {
  new: styles.statusNew,
  contacted: styles.statusContacted,
  scheduled: styles.statusScheduled,
  done: styles.statusDone,
  canceled: styles.statusCanceled,
};

function timeOf(iso: string | null): number {
  const time = iso ? Date.parse(iso) : Number.NaN;
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function filterAndSort(
  rows: Reservation[],
  query: string,
  status: '' | ReservationStatus,
  sort: SortKey,
): Reservation[] {
  const needle = query.trim().toLowerCase();
  const result = rows.filter((row) => {
    if (status && row.status !== status) return false;
    if (!needle) return true;
    const haystack = [
      row.reception_no,
      row.company,
      row.name,
      row.email,
      row.tel,
      row.detail,
      row.memo,
      row.owner,
      row.source,
      row.topics.join(' '),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });

  return result.sort((a, b) => {
    if (sort === 'createdDesc') return timeOf(b.created_at) - timeOf(a.created_at);
    if (sort === 'createdAsc') return timeOf(a.created_at) - timeOf(b.created_at);
    return timeOf(a.preferred_at_1) - timeOf(b.preferred_at_1);
  });
}

/**
 * CSV の1セル。
 * フォームから来た値が = + - @ で始まっていると、Excel で開いたときに数式として実行されうる
 * （CSVインジェクション）。先頭に ' を付けて文字列として扱わせる。
 */
function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(rows: Reservation[]) {
  const header = [
    '予約ID', '受付日時', '会社名', '担当者名', 'メールアドレス', '電話番号', '従業員規模',
    '希望プラン', '相談カテゴリ', '第1希望日時', '第2希望日時', '相談方法', '自動化したい業務',
    'ステータス', '担当', '社内メモ', '流入元',
  ];
  const lines = [header.map(csvCell).join(',')].concat(
    rows.map((row) =>
      [
        row.reception_no,
        formatDateTime(row.created_at),
        row.company,
        row.name,
        row.email,
        row.tel,
        row.company_size,
        row.plan,
        row.topics.join(' / '),
        formatDateTime(row.preferred_at_1),
        formatDateTime(row.preferred_at_2),
        row.method,
        row.detail,
        statusLabel(row.status),
        row.owner,
        row.memo,
        row.source,
      ]
        .map(csvCell)
        .join(','),
    ),
  );

  // Excel で文字化けしないよう BOM 付き UTF-8
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `reservations_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function ReservationsAdmin({ initialReservations, loadLimit }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialReservations);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | ReservationStatus>('');
  const [sort, setSort] = useState<SortKey>('date1');
  const [notices, setNotices] = useState<Record<string, RowNotice>>({});
  const [refreshing, startRefresh] = useTransition();

  // 「再読み込み」でサーバーから新しい一覧が届いたら差し替える
  useEffect(() => {
    setRows(initialReservations);
  }, [initialReservations]);

  const counts = useMemo(() => {
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s.value, 0])) as Record<ReservationStatus, number>;
    for (const row of rows) byStatus[row.status] += 1;
    return byStatus;
  }, [rows]);

  const visible = useMemo(
    () => filterAndSort(rows, query, statusFilter, sort),
    [rows, query, statusFilter, sort],
  );

  function setNotice(id: string, notice: RowNotice | null) {
    setNotices((current) => {
      const next = { ...current };
      if (notice) next[id] = notice;
      else delete next[id];
      return next;
    });
  }

  async function save(row: Reservation, patch: ReservationPatch) {
    // 先に画面へ反映し、失敗したら元に戻す
    setRows((current) =>
      current.map((r) => (r.id === row.id ? ({ ...r, ...patch } as Reservation) : r)),
    );
    setNotice(row.id, { kind: 'busy', text: '保存中…' });

    const result = await updateReservation(row.id, patch);
    if (result.ok) {
      setRows((current) => current.map((r) => (r.id === row.id ? result.data : r)));
      setNotice(row.id, { kind: 'saved', text: '保存しました' });
      window.setTimeout(() => {
        setNotices((current) => {
          if (current[row.id]?.kind !== 'saved') return current;
          const next = { ...current };
          delete next[row.id];
          return next;
        });
      }, 2000);
    } else {
      setRows((current) => current.map((r) => (r.id === row.id ? row : r)));
      setNotice(row.id, { kind: 'error', text: result.message });
    }
  }

  async function remove(row: Reservation) {
    const ok = window.confirm(
      `${row.reception_no}（${row.company}）を削除しますか？\nこの操作は元に戻せません。`,
    );
    if (!ok) return;

    setNotice(row.id, { kind: 'busy', text: '削除中…' });
    const result = await deleteReservation(row.id);
    if (result.ok) {
      setRows((current) => current.filter((r) => r.id !== row.id));
      setNotice(row.id, null);
    } else {
      setNotice(row.id, { kind: 'error', text: result.message });
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={`${styles.container} ${styles.headerInner}`}>
          <a href="/lp/index.html" className={styles.logo}>
            <span className={styles.logoMark}>紡</span>ツムギAI <small>管理画面</small>
          </a>
          <a href="/lp/index.html" className={`${styles.btn} ${styles.btnOutline}`}>
            LPを表示
          </a>
        </div>
      </header>

      <div className={`${styles.container} ${styles.main}`}>
        <div className={styles.head}>
          <h1>無料相談 予約リスト</h1>
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => downloadCsv(visible)}
              disabled={visible.length === 0}
            >
              CSVダウンロード
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnOutline}`}
              onClick={() => startRefresh(() => router.refresh())}
              disabled={refreshing}
            >
              {refreshing ? '読み込み中…' : '再読み込み'}
            </button>
          </div>
        </div>

        <div className={styles.kpis}>
          <div className={styles.kpi}>
            <div className={styles.kpiLabel}>総予約数</div>
            <div className={styles.kpiNum}>{rows.length}</div>
          </div>
          {STATUSES.map((status) => (
            <div className={styles.kpi} key={status.value}>
              <div className={styles.kpiLabel}>
                <span className={`${styles.status} ${STATUS_CLASS[status.value]}`} />
                {status.label}
              </div>
              <div className={styles.kpiNum}>{counts[status.value]}</div>
            </div>
          ))}
        </div>

        <div className={styles.toolbar}>
          <input
            className={styles.input}
            type="search"
            placeholder="受付番号・会社名・氏名・メール・内容で検索"
            aria-label="検索"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            className={styles.select}
            aria-label="ステータスで絞り込み"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as '' | ReservationStatus)}
          >
            <option value="">すべてのステータス</option>
            {STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            aria-label="並び替え"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
          >
            <option value="date1">希望日時が近い順</option>
            <option value="createdDesc">受付日時が新しい順</option>
            <option value="createdAsc">受付日時が古い順</option>
          </select>
        </div>

        <p className={styles.count} role="status">
          表示中 <strong>{visible.length}</strong> 件 ／ 全 {rows.length} 件
          {rows.length >= loadLimit && (
            <span className={styles.countWarn}>（新しい順に {loadLimit} 件まで読み込んでいます）</span>
          )}
        </p>

        <div className={styles.tableWrap}>
          <table className={styles.list}>
            <thead>
              <tr>
                <th>受付番号</th>
                <th>受付日時</th>
                <th>会社名 / 担当者</th>
                <th>連絡先</th>
                <th>規模 / プラン</th>
                <th>相談内容</th>
                <th>希望日時</th>
                <th>相談方法</th>
                <th>ステータス</th>
                <th>担当 / 社内メモ</th>
                <th aria-label="操作" />
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const notice = notices[row.id];
                // 保存後に updated_at が変わると入力欄を作り直し、サーバーの値で表示し直す
                const editKey = `${row.id}:${row.updated_at}`;
                return (
                  <tr key={row.id}>
                    <td className={styles.nowrap}>
                      <strong>{row.reception_no}</strong>
                      {row.source && row.source !== 'LP' && (
                        <div className={styles.sub}>流入元：{row.source}</div>
                      )}
                    </td>
                    <td className={styles.nowrap}>{formatDateTime(row.created_at)}</td>
                    <td>
                      <strong>{row.company}</strong>
                      <br />
                      {row.name}
                    </td>
                    <td>
                      <a href={`mailto:${row.email}`}>{row.email}</a>
                      <br />
                      {row.tel}
                    </td>
                    <td className={styles.nowrap}>
                      {row.company_size}
                      <br />
                      {row.plan || '未定'}
                    </td>
                    <td>
                      {row.topics.map((topic) => (
                        <span className={styles.tag} key={topic}>
                          {topic}
                        </span>
                      ))}
                      {row.detail && <div className={styles.detail}>{row.detail}</div>}
                    </td>
                    <td className={styles.nowrap}>
                      ①{formatDateTime(row.preferred_at_1)}
                      {row.preferred_at_2 && (
                        <>
                          <br />②{formatDateTime(row.preferred_at_2)}
                        </>
                      )}
                    </td>
                    <td className={styles.method}>{row.method}</td>
                    <td className={styles.nowrap}>
                      <span className={`${styles.status} ${STATUS_CLASS[row.status]}`} />
                      <select
                        className={`${styles.select} ${styles.cellSelect}`}
                        aria-label={`${row.reception_no} のステータス`}
                        value={row.status}
                        onChange={(event) => save(row, { status: event.target.value })}
                      >
                        {STATUSES.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        key={`owner:${editKey}`}
                        className={`${styles.input} ${styles.memo}`}
                        aria-label={`${row.reception_no} の担当`}
                        placeholder="担当者"
                        defaultValue={row.owner}
                        maxLength={LIMITS.owner}
                        onBlur={(event) => {
                          if (event.target.value.trim() !== row.owner) save(row, { owner: event.target.value });
                        }}
                      />
                      <textarea
                        key={`memo:${editKey}`}
                        className={`${styles.textarea} ${styles.memo}`}
                        aria-label={`${row.reception_no} の社内メモ`}
                        placeholder="社内メモ"
                        defaultValue={row.memo}
                        maxLength={LIMITS.memo}
                        onBlur={(event) => {
                          if (event.target.value.trim() !== row.memo) save(row, { memo: event.target.value });
                        }}
                      />
                      {notice && (
                        <div
                          className={`${styles.rowNotice} ${notice.kind === 'error' ? styles.rowNoticeError : ''}`}
                          role={notice.kind === 'error' ? 'alert' : undefined}
                        >
                          {notice.text}
                        </div>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        title="削除"
                        aria-label={`${row.reception_no} を削除`}
                        onClick={() => remove(row)}
                        disabled={notice?.kind === 'busy'}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visible.length === 0 && (
            <div className={styles.empty}>
              {rows.length === 0
                ? 'まだ予約はありません。LPの予約フォームから送信すると、ここに表示されます。'
                : '条件に合う予約はありません。'}
            </div>
          )}
        </div>

        <p className={styles.footnote}>
          予約は Supabase に保存されています。どの端末から開いても同じ一覧が表示されます。
          個人情報を含むため、CSV の取り扱いにはご注意ください。
        </p>
      </div>
    </main>
  );
}
