"use client";

import { useEffect, useState } from "react";
import {
  disablePushNotifications,
  enablePushNotifications,
  getNotificationPermission,
  hasActivePushSubscription,
  isPushSupported,
  registerServiceWorker,
} from "@/lib/notifications";

/**
 * Toggle Chrome / web push notifications from the sidebar.
 */
export default function NotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!isPushSupported()) {
        if (!cancelled) setSupported(false);
        return;
      }
      if (!cancelled) setSupported(true);
      try {
        await registerServiceWorker();
        const active = await hasActivePushSubscription();
        if (!cancelled) setEnabled(active);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!supported) return null;

  const handleToggle = async () => {
    setBusy(true);
    setHint("");
    try {
      if (enabled) {
        await disablePushNotifications();
        setEnabled(false);
        setHint("Notifications off");
      } else {
        const permission = await getNotificationPermission();
        if (permission === "denied") {
          setHint("Blocked in browser settings");
          return;
        }
        await enablePushNotifications();
        setEnabled(true);
        setHint("Notifications on");
      }
    } catch (err) {
      setHint(err.message || "Failed");
    } finally {
      setBusy(false);
      setTimeout(() => setHint(""), 2500);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        disabled={busy}
        title={enabled ? "Disable notifications" : "Enable Chrome notifications"}
        className={`h-9 w-9 rounded-xl flex items-center justify-center text-base transition border shadow-sm
          ${
            enabled
              ? "bg-sky-500 border-sky-500 text-white"
              : "bg-white/80 hover:bg-sky-50 border-sky-100 text-sky-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-600 dark:text-sky-300"
          }`}
      >
        {enabled ? "🔔" : "🔕"}
      </button>
      {hint && (
        <span className="absolute top-full right-0 mt-1 whitespace-nowrap text-[10px] bg-slate-800 text-white dark:bg-slate-700 px-2 py-1 rounded-lg z-20">
          {hint}
        </span>
      )}
    </div>
  );
}
