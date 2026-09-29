import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '保護者レポート作成',
  description: 'メモから、保護者に送れる月次レポートの文章を作ります。',
};

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
