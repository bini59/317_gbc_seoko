import { useEffect, useState } from "react";
import { parseDetailId, detailHash } from "../lib/route";

/**
 * 상세 화면 상태를 URL 해시와 동기화. 직접 진입(초기 해시 파싱)과 브라우저
 * 뒤로가기(hashchange)를 지원한다. 상태 갱신은 낙관적으로도 반영해 이벤트
 * 전달이 불안정한 환경(jsdom 등)에서도 UI가 즉시 반응한다.
 */
export function useDetailRoute(): [string | null, (id: string) => void, () => void] {
  const [id, setId] = useState<string | null>(() => parseDetailId(window.location.hash));

  useEffect(() => {
    const onChange = () => setId(parseDetailId(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const open = (detailId: string) => {
    setId(detailId);
    window.location.hash = detailHash(detailId);
  };

  const close = () => {
    setId(null);
    // 열 때 히스토리 항목이 쌓였으므로 뒤로가기로 목록에 복귀(브라우저 back과 동일 경로).
    if (parseDetailId(window.location.hash)) window.history.back();
  };

  return [id, open, close];
}
