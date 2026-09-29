import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_REALM, adminAuthConfigured, isAuthorizedAdmin } from '@/lib/admin-auth';

const TEXT = { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' };

/**
 * /admin 配下を Basic 認証で保護する。
 * Server Action も呼び出し元のページ URL（/admin/...）に POST されるのでここを通るが、
 * それに頼り切らず、ページとアクションの中でも同じ判定をもう一度行っている。
 */
export function middleware(request: NextRequest) {
  if (!adminAuthConfigured()) {
    return new NextResponse(
      '管理画面の認証情報（ADMIN_USER / ADMIN_PASSWORD）が設定されていません。',
      { status: 503, headers: TEXT },
    );
  }

  if (isAuthorizedAdmin(request.headers.get('authorization'))) {
    return NextResponse.next();
  }

  return new NextResponse('認証が必要です。', {
    status: 401,
    headers: { ...TEXT, 'WWW-Authenticate': `Basic realm="${ADMIN_REALM}", charset="UTF-8"` },
  });
}

export const config = {
  matcher: ['/admin/:path*'],
};
