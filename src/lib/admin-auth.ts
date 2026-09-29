// 管理画面の Basic 認証。middleware（Edge ランタイム）とサーバー側の両方から使うので、
// Node 専用 API（crypto.timingSafeEqual など）は使わずに書いている。

export const ADMIN_REALM = 'Temakaru Admin';

/** ADMIN_USER と ADMIN_PASSWORD の両方が入っているか。未設定なら管理画面は開けない（安全側に倒す）。 */
export function adminAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_USER && process.env.ADMIN_PASSWORD);
}

/** 長さにかかわらず最後まで比較し、どこで食い違ったかを応答時間から推測させない。 */
function safeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

function decodeBase64Utf8(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Authorization ヘッダーが管理者の ID・パスワードと一致するか。 */
export function isAuthorizedAdmin(authorization: string | null | undefined): boolean {
  const expectedUser = process.env.ADMIN_USER;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPassword) return false;
  if (!authorization || !authorization.startsWith('Basic ')) return false;

  let decoded: string;
  try {
    decoded = decodeBase64Utf8(authorization.slice('Basic '.length).trim());
  } catch {
    return false;
  }

  const separator = decoded.indexOf(':');
  if (separator === -1) return false;

  // ID とパスワードは両方とも必ず比較する（ID だけ合っているかを時間差で探らせない）
  const userMatches = safeEqual(decoded.slice(0, separator), expectedUser);
  const passwordMatches = safeEqual(decoded.slice(separator + 1), expectedPassword);
  return userMatches && passwordMatches;
}
