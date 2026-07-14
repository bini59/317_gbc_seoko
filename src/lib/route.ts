// 상세 화면 라우팅 — 해시 기반. (vite base가 "./"라 deep-path 라우팅은 에셋 경로가
// 깨지므로 해시를 쓴다. 직접 진입/뒤로가기 모두 루트 경로에서 동작.)

/** location.hash → 상세 서클 id (없으면 null). */
export function parseDetailId(hash: string): string | null {
  const m = /^#?\/c\/(.+)$/.exec(hash);
  return m ? decodeURIComponent(m[1]) : null;
}

/** 상세 서클 id → location.hash 문자열. */
export const detailHash = (id: string) => `#/c/${encodeURIComponent(id)}`;
