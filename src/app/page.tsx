import Deck from '@/components/Deck';
import SetupNotice from '@/components/SetupNotice';
import { fetchProjects } from '@/lib/queries';

// エージェントの状態は常に最新を見せたいのでリクエストごとに取得する。
export const dynamic = 'force-dynamic';

export default async function Page() {
  const { projects, error } = await fetchProjects();

  if (error === 'NOT_CONFIGURED') {
    return <SetupNotice kind="env" />;
  }
  if (error) {
    return <SetupNotice kind="query" reason={error} />;
  }
  if (projects.length === 0) {
    return <SetupNotice kind="empty" />;
  }

  return <Deck projects={projects} />;
}
