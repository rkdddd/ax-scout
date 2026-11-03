// 로그인 확인용 서명 쿠키. 비밀번호는 환경변수(APP_PASSWORD)에만 두고, 쿠키에는 "만료 시각 + 서명"만 담는다.
// 서명 키(SESSION_SECRET)가 없거나 비밀번호가 설정되지 않으면 모두 거부한다 (설정 실수로 문이 열리지 않게).
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "axscout_session";
export const SESSION_DAYS = 7;

function secret(): string | null {
  const value = process.env.SESSION_SECRET;
  return value && value.length >= 16 ? value : null;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

// 로그인에 성공하면 쿠키에 넣을 값을 만든다. 설정이 빠졌으면 null.
export function createSessionToken(now = Date.now()): string | null {
  const key = secret();
  if (!key) return null;
  const expires = String(now + SESSION_DAYS * 24 * 60 * 60 * 1000);
  return `${expires}.${sign(expires, key)}`;
}

// 쿠키 값이 우리가 만든 것이고 아직 만료되지 않았는지 확인한다.
export function verifySessionToken(token: string | undefined | null, now = Date.now()): boolean {
  const key = secret();
  if (!key || !token) return false;
  const [expires, signature, ...rest] = token.split(".");
  if (!expires || !signature || rest.length > 0) return false;

  const expected = Buffer.from(sign(expires, key));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;

  const expiresAt = Number(expires);
  return Number.isFinite(expiresAt) && expiresAt > now;
}

// 입력한 비밀번호가 맞는지 확인한다. 길이가 달라도 같은 시간이 걸리도록 해시끼리 비교한다.
export function passwordMatches(input: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

// 로그인 후 돌아갈 주소는 이 사이트 안의 경로만 허용한다 (외부 주소로 보내는 것 방지).
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (value.startsWith("/login")) return "/";
  return value;
}
