import { useEffect, useState } from "react";
import { type Checks, loadChecks, saveChecks } from "../lib/checks";

/**
 * 행사별 방문 체크 상태(localStorage). eventSlug가 바뀌면 해당 행사의 저장분을
 * 다시 불러오고, 변경은 즉시 그 행사의 키에만 기록해 행사 간 상태가 섞이지 않는다.
 */
export function useChecks(eventSlug: string | null): [Checks, (id: string) => void, () => void] {
  const [checks, setChecks] = useState<Checks>({});

  useEffect(() => {
    setChecks(eventSlug ? loadChecks(localStorage, eventSlug) : {});
  }, [eventSlug]);

  const toggle = (id: string) =>
    setChecks((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (eventSlug) saveChecks(localStorage, eventSlug, next);
      return next;
    });

  const reset = () => {
    if (eventSlug) saveChecks(localStorage, eventSlug, {});
    setChecks({});
  };

  return [checks, toggle, reset];
}
