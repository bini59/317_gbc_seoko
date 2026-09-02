import type { ComponentProps } from "react";
import { Settings } from "../components/Settings";

export function SettingsScreen(props: ComponentProps<typeof Settings>) {
  return (
    <div className="px-5 pt-7 pb-[calc(88px+env(safe-area-inset-bottom))] md:px-8 md:py-10">
      <h1 className="text-[26px] font-extrabold text-ink">설정</h1>
      <div className="mt-7 max-w-[640px]"><Settings {...props} /></div>
    </div>
  );
}
