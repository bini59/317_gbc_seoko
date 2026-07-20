export type Checks = Record<string, boolean>;

/** localStorage 최소 인터페이스 (테스트에서 가짜 객체 주입 가능). */
export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// API 전환 이전의 단일 키. 최초 활성 행사로 1회 이관 후 이후 행사는 독립적으로 시작한다.
const LEGACY_KEY = "gbc-seoko-2026-07-checks";
const MIGRATED_FLAG = "gbc-seoko-checks-migrated";

export const checksKey = (eventSlug: string) => `gbc-seoko-checks:${eventSlug}`;

function parse(raw: string | null): Checks {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as Checks) : {};
  } catch {
    return {};
  }
}

export function saveChecks(kv: KV, eventSlug: string, checks: Checks): void {
  try {
    kv.setItem(checksKey(eventSlug), JSON.stringify(checks));
  } catch {
    /* private mode / quota */
  }
}

/**
 * 행사별 방문 체크를 불러온다. 새 키가 없고 아직 이관 전이면 레거시 단일 키를
 * 이 행사로 1회 이관한다(호환 정책). 이후 행사는 빈 상태로 시작한다.
 */
export function loadChecks(kv: KV, eventSlug: string, migrateLegacy = false): Checks {
  const existing = kv.getItem(checksKey(eventSlug));
  if (existing !== null) return parse(existing);

  if (migrateLegacy && kv.getItem(MIGRATED_FLAG) === null) {
    const legacy = kv.getItem(LEGACY_KEY);
    kv.setItem(MIGRATED_FLAG, "1");
    if (legacy !== null) {
      const migrated = parse(legacy);
      saveChecks(kv, eventSlug, migrated);
      return migrated;
    }
  }
  return {};
}
