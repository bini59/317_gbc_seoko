import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { logout } from "@/api";
import { authQuery, SIGNED_OUT } from "@/lib/queries";
import { clearAllChecks } from "@/lib/checks";
import { clearAllWishlist } from "@/lib/wishlist";
import { useUiStore } from "@/lib/store";

/**
 * 세션은 서버 상태라 react-query가 단일 출처로 들고 있고, 이 훅은 화면이
 * 반복해서 파생시키던 값(authenticated/userId)만 한곳에서 만든다.
 * 같은 쿼리 키라 어느 컴포넌트에서 호출해도 요청은 한 번이다.
 */
export function useAuth() {
  const { data, isPending } = useQuery(authQuery());
  const { enabled, user } = data ?? SIGNED_OUT;
  return { enabled, user, userId: user?.userId ?? null, authenticated: !!user, loading: isPending };
}

/** 로그아웃: 서버 세션을 끊고 기기에 남은 체크·위시리스트를 지운다. 실패해도 로컬은 정리한다. */
export function useSignOut() {
  const queryClient = useQueryClient();
  const setSyncedAt = useUiStore((s) => s.setSyncedAt);
  return useCallback(() => {
    void logout().catch(() => {}).finally(() => {
      clearAllChecks(localStorage);
      clearAllWishlist(localStorage);
      queryClient.setQueryData(authQuery().queryKey, (prev) => (prev ? { ...prev, user: null } : SIGNED_OUT));
      setSyncedAt(null);
    });
  }, [queryClient, setSyncedAt]);
}
