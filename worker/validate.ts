// 런타임 입력 검증 — 스키마가 단순해서 zod 없이 최소 헬퍼로 처리(worker 번들 절감).
// 모든 검증 실패는 ValidationError를 던지고, app.onError가 일관된 4xx로 변환한다.

export class ValidationError extends Error {}

const fail = (msg: string): never => {
  throw new ValidationError(msg);
};

export function str(v: unknown, name: string, max = 500): string {
  if (typeof v !== "string" || v.trim() === "") fail(`${name}: 비어있지 않은 문자열이어야 해요`);
  const s = v as string;
  if (s.length > max) fail(`${name}: 너무 길어요(최대 ${max}자)`);
  return s;
}

export function optStr(v: unknown, name: string, max = 2000): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") fail(`${name}: 문자열이어야 해요`);
  if ((v as string).length > max) fail(`${name}: 너무 길어요(최대 ${max}자)`);
  return v as string;
}

const SLUG_RE = /^[a-z0-9][a-z0-9_-]*$/i;
export function slug(v: unknown, name: string): string {
  const s = str(v, name, 128);
  if (!SLUG_RE.test(s)) fail(`${name}: slug 형식이 아니에요(영숫자/-/_)`);
  return s;
}

export function url(v: unknown, name: string): string {
  const s = str(v, name, 2048);
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return fail(`${name}: 올바른 URL이 아니에요`);
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") fail(`${name}: http(s) URL이어야 해요`);
  return s;
}

export function optUrl(v: unknown, name: string): string | null {
  if (v === undefined || v === null || v === "") return null;
  return url(v, name);
}

export function enumOf<T extends string>(v: unknown, name: string, allowed: readonly T[]): T {
  const s = str(v, name, 64);
  if (!allowed.includes(s as T)) fail(`${name}: ${allowed.join("/")} 중 하나여야 해요`);
  return s as T;
}

export function optEnum<T extends string>(v: unknown, name: string, allowed: readonly T[]): T | null {
  if (v === undefined || v === null) return null;
  return enumOf(v, name, allowed);
}

export function arrOfStr(v: unknown, name: string, maxLen = 200): string[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) fail(`${name}: 배열이어야 해요`);
  return (v as unknown[]).map((el, i) => str(el, `${name}[${i}]`, maxLen));
}

export function intId(v: unknown, name: string): number {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n <= 0) fail(`${name}: 양의 정수 ID여야 해요`);
  return n as number;
}

export function optBool(v: unknown): boolean {
  return v === true || v === 1 || v === "1" || v === "true";
}

/** genre_tags 등 DB에 저장된 손상 가능한 JSON 배열을 안전하게 파싱. */
export function safeJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    console.warn("corrupted genre_tags JSON, ignoring:", raw);
    return [];
  }
}
