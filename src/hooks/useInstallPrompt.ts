import { useCallback, useEffect, useState } from "react";

export type InstallOutcome = "accepted" | "dismissed";

export type InstallState = {
  isInstalled: boolean;
  canPrompt: boolean;
  promptInstall: () => Promise<InstallOutcome | null>;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  const displayMode = typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = typeof navigator !== "undefined" && (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return Boolean(displayMode || iosStandalone);
}

/** Captures the deferred browser prompt while keeping installation state independent from UI dismissal. */
export function useInstallPrompt(): InstallState {
  const [isInstalled, setIsInstalled] = useState(isStandalone);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as Partial<BeforeInstallPromptEvent>;
      if (typeof promptEvent.prompt !== "function" || !promptEvent.userChoice) return;
      event.preventDefault();
      setDeferredPrompt(promptEvent as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return null;
    setDeferredPrompt(null);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setIsInstalled(true);
      return outcome;
    } catch {
      return null;
    }
  }, [deferredPrompt]);

  return { isInstalled, canPrompt: deferredPrompt !== null, promptInstall };
}
