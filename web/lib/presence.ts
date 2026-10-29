import { browserDeviceType, type AuthClient } from "./auth";
import webPackage from "../package.json";

const INSTALL_ID_KEY = "streamnet.web.presence.install-id";

export function startWebPresence(auth: AuthClient, profileId: string | null) {
  const accountId = auth.session?.userId;
  if (!accountId) return () => {};
  let stopped = false;
  let pending = false;
  let sendAfterPending = false;
  let controller: AbortController | null = null;
  const send = async () => {
    if (stopped || pending || document.visibilityState !== "visible") return;
    pending = true;
    controller = new AbortController();
    const timeout = window.setTimeout(() => controller?.abort(), 10_000);
    try {
      let installId = localStorage.getItem(INSTALL_ID_KEY);
      if (!installId) {
        installId = crypto.randomUUID();
        localStorage.setItem(INSTALL_ID_KEY, installId);
      }
      const token = await auth.accessToken();
      if (stopped || controller.signal.aborted || document.visibilityState !== "visible" || auth.session?.userId !== accountId) return;
      const response = await fetch("/api/cloud-auth/device-presence", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({
          install_id: installId,
          profile_id: profileId,
          platform: "web",
          device_type: browserDeviceType(),
          app_version: webPackage.version,
          distribution: "web",
        }),
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Presence heartbeat HTTP ${response.status}`);
    } catch (error) {
      if (!stopped && !(controller.signal.aborted && document.visibilityState !== "visible")) {
        console.warn("Live-Gerätestatus konnte nicht gesendet werden", error);
      }
    } finally {
      window.clearTimeout(timeout);
      pending = false;
      if (sendAfterPending) {
        sendAfterPending = false;
        void send();
      }
    }
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      if (pending) sendAfterPending = true;
      else void send();
    }
    else controller?.abort();
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  const interval = window.setInterval(() => void send(), 30_000);
  void send();
  return () => {
    stopped = true;
    window.clearInterval(interval);
    controller?.abort();
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
