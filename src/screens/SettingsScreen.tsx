import type { ComponentProps } from "react";
import { Settings } from "@/components/Settings";
import { useAuth, useSignOut } from "@/hooks/useAuth";
import { useUiStore } from "@/lib/store";

/** Settings는 표현만 담당하고, 세션·동기화 상태 배선은 화면이 맡는다. */
type Props = Omit<ComponentProps<typeof Settings>, "authEnabled" | "user" | "syncedAt" | "onLogout">;

export function SettingsScreen(props: Props) {
  const { enabled, user } = useAuth();
  const syncedAt = useUiStore((s) => s.syncedAt);
  const onLogout = useSignOut();
  return (
    <div className="px-5 pt-7 pb-[calc(88px+env(safe-area-inset-bottom))] md:px-8 md:py-10">
      <h1 className="text-[26px] font-extrabold text-ink">설정</h1>
      <div className="mt-7 max-w-[640px]">
        <Settings {...props} authEnabled={enabled} user={user} syncedAt={syncedAt} onLogout={onLogout} />
      </div>
    </div>
  );
}
