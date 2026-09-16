import { beforeEach } from "vitest";
import { useUiStore } from "@/lib/store";

// zustand store는 모듈 싱글턴이라 테스트 사이에 상태가 새지 않도록 초기화한다.
beforeEach(() => {
  useUiStore.setState(useUiStore.getInitialState(), true);
});
