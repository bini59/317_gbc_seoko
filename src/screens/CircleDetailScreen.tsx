import type { Circle } from "../types";
import { badgeColor } from "../lib/circle";
import { Detail } from "../components/Detail";
import type { Checks } from "../lib/checks";
import type { useCircleWishlist } from "../hooks/useWishlist";

type Props = {
  item: Circle;
  /** 뱃지 색은 행사 전체 서클을 기준으로 배분하므로 목록이 필요하다. */
  all: Circle[];
  checks: Checks;
  onToggle: (id: string) => void;
  circleWishlist: ReturnType<typeof useCircleWishlist>;
  onBack: () => void;
};

/** 서클 상세. 모바일은 단독 화면, xl 이상은 체크리스트 오른쪽 열로 붙는다. */
export function CircleDetailScreen({ item, all, checks, onToggle, circleWishlist, onBack }: Props) {
  const { circles: wishlist, toggleStar, updateMemo } = circleWishlist;
  return (
    <section aria-label="서클 상세" className="min-w-0">
      <Detail
        item={item}
        checked={!!checks[item.id]}
        onToggle={() => onToggle(item.id)}
        onBack={onBack}
        color={badgeColor(item.id, all)}
        starred={wishlist[item.id]?.star}
        memo={wishlist[item.id]?.memo}
        onStar={() => toggleStar(item.id)}
        onUpdateMemo={(memo) => updateMemo(item.id, memo)}
      />
    </section>
  );
}
