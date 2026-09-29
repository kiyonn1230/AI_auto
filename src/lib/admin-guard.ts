import 'server-only';

import { headers } from 'next/headers';
import { isAuthorizedAdmin } from '@/lib/admin-auth';

/**
 * いまのリクエストが管理者のものか。
 * middleware が /admin を守っているが、Server Action は公開エンドポイントとして扱うのが原則なので、
 * 個人情報に触れるページとアクションの先頭でも必ずこれを確かめる。
 */
export async function isAdminRequest(): Promise<boolean> {
  const requestHeaders = await headers();
  return isAuthorizedAdmin(requestHeaders.get('authorization'));
}
