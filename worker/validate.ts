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

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
export function dateOnly(v: unknown, name: string): string {
  const s = str(v, name, 10);
  if (!DATE_ONLY_RE.test(s)) fail(`${name}: YYYY-MM-DD 형식이어야 해요`);
  const date = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== s) {
    fail(`${name}: 올바른 날짜가 아니에요`);
  }
  return s;
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

export type WishlistEntry = { star?: boolean; memo?: string };
export type WishlistMap = Record<string, WishlistEntry>;

export function wishlistMap(v: unknown, name = "circles"): WishlistMap {
  if (!v || typeof v !== "object" || Array.isArray(v)) fail(`${name}는 JSON 객체여야 해요`);
  const source = v as Record<string, unknown>;
  const keys = Object.keys(source);
  if (keys.length > 3000 || keys.some((key) => key.length === 0 || key.length > 200)) fail(`${name} 항목이 너무 많거나 길어요`);
  const output: WishlistMap = {};
  for (const key of keys) {
    const value = source[key];
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${name}.${key}는 JSON 객체여야 해요`);
    const entry = value as Record<string, unknown>;
    if (Object.keys(entry).some((field) => field !== "star" && field !== "memo")) fail(`${name}.${key}에 허용되지 않은 필드가 있어요`);
    if (entry.star !== undefined && typeof entry.star !== "boolean") fail(`${name}.${key}.star는 boolean이어야 해요`);
    if (entry.memo !== undefined && typeof entry.memo !== "string") fail(`${name}.${key}.memo는 문자열이어야 해요`);
    if (typeof entry.memo === "string" && entry.memo.length > 500) fail(`${name}.${key}.memo는 500자 이하이어야 해요`);
    const memo = typeof entry.memo === "string" ? entry.memo.trim() : undefined;
    const star = entry.star === true;
    if (star || memo) output[key] = { ...(star ? { star: true } : {}), ...(memo ? { memo } : {}) };
  }
  return output;
}

export function wishlistEvents(v: unknown): string[] {
  if (!Array.isArray(v)) fail("events는 배열이어야 해요");
  const events = (v as unknown[]).map((item: unknown, index: number) => slug(item, `events[${index}]`));
  if (new Set(events).size !== events.length || events.length > 3000) fail("events 항목이 너무 많거나 중복돼요");
  return events;
}
