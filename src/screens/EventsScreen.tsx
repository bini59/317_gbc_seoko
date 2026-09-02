import { InstallBanner } from "../components/InstallGuide";
import type { InstallState } from "../hooks/useInstallPrompt";

export function EventsScreen({
  install, onOpenSettings, loadError, loading, empty,
}: {
  install: InstallState;
  onOpenSettings: () => void;
  loadError: string | null;
  loading: boolean;
  empty: boolean;
}) {
  return (
    <div className="px-5 pt-7 pb-2 md:px-8 md:py-10">
      <h1 className="text-[26px] font-extrabold text-ink">행사 선택</h1>
      <p className="mt-2 text-sm text-muted">방문할 행사를 골라 관심 서클을 확인하세요.</p>
      <InstallBanner install={install} onOpenSettings={onOpenSettings} />
      {loadError ? <div role="alert" className="mt-8 text-sm text-danger">{loadError}</div> : null}
      {!loading && !loadError && empty ? <div className="py-14 text-center text-sm text-faint">등록된 행사가 없어요</div> : null}
    </div>
  );
}
