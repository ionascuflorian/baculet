"use client";

import { useActionState, useEffect, useState } from "react";
import { Bell, BellOff, Check, Loader2, Smartphone } from "lucide-react";
import { saveNotifPrefs } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export interface NotifPrefs {
  emailNotifs: boolean;
  streakNotifs: boolean;
  followNotifs: boolean;
  reminderHour: number | null;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function keyToBase64(key: ArrayBuffer | null): string {
  if (!key) return "";
  return btoa(String.fromCharCode(...new Uint8Array(key)));
}

export function NotificationsSettings({ prefs }: { prefs: NotifPrefs }) {
  const [state, action, pending] = useActionState(saveNotifPrefs, {});
  const [pushState, setPushState] = useState<
    "checking" | "on" | "off" | "unsupported"
  >("checking");
  const [busy, setBusy] = useState(false);
  const [pushError, setPushError] = useState("");
  const [reminderOn, setReminderOn] = useState(prefs.reminderHour != null);

  const isIOS =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    typeof window !== "undefined" &&
    window.matchMedia?.("(display-mode: standalone)").matches;

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setPushState("unsupported");
      return;
    }
    navigator.serviceWorker
      .ready.then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPushState(sub ? "on" : "off"))
      .catch(() => setPushState("off"));
  }, []);

  const subscribe = async () => {
    setBusy(true);
    setPushError("");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setPushError("Permisiunea de notificări a fost refuzată.");
        setPushState("off");
        return;
      }
      if (!VAPID_PUBLIC) {
        setPushError("Notificările nu sunt configurate încă. Încearcă mai târziu.");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: keyToBase64(sub.getKey("p256dh")),
            auth: keyToBase64(sub.getKey("auth")),
          },
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      if (!res.ok) throw new Error("Eroare la abonare.");
      setPushState("on");
    } catch (err) {
      setPushError(
        err instanceof Error ? err.message : "Eroare la activarea notificărilor."
      );
    } finally {
      setBusy(false);
    }
  };

  const unsubscribe = async () => {
    setBusy(true);
    setPushError("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setPushState("off");
    } catch {
      setPushError("Eroare la dezactivarea notificărilor.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = (label: string, name: string, on: boolean) => (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-feather bg-background px-4 py-3">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input
        type="checkbox"
        name={name}
        defaultChecked={on}
        className="h-4 w-4 accent-[--accent]"
      />
    </label>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-feather bg-background p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
          {pushState === "on" ? (
            <Bell className="h-4 w-4 text-accent" />
          ) : (
            <BellOff className="h-4 w-4 text-subtle" />
          )}
          Notificări pe telefon (push)
        </h3>
        <p className="mt-1 text-sm text-subtle">
          Notificări pe dispozitiv chiar și când site-ul e închis.
        </p>

        {pushState === "checking" && (
          <p className="mt-3 flex items-center gap-2 text-sm text-subtle">
            <Loader2 className="h-4 w-4 animate-spin" /> Se verifică…
          </p>
        )}

        {pushState === "unsupported" && (
          <p className="mt-3 rounded-xl bg-warning/15 px-4 py-3 text-sm font-semibold text-warning">
            Browserul tău nu suportă notificările push. Încearcă pe telefon cu
            Chrome/Android sau Safari (iPhone).
          </p>
        )}

        {isIOS && pushState !== "unsupported" && !isStandalone && (
          <p className="mt-3 rounded-xl bg-warning/15 px-4 py-3 text-sm font-semibold text-warning">
            Pe iPhone, notificările funcționează doar după ce instalezi
            aplicația: Safari → Adaugă la ecranul principal.
          </p>
        )}

        {pushState !== "checking" && pushState !== "unsupported" && (
          <div className="mt-3">
            <button
              type="button"
              onClick={pushState === "on" ? unsubscribe : subscribe}
              disabled={busy}
              className={cn(
                "flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all",
                pushState === "on"
                  ? "border border-feather text-subtle hover:border-danger/40 hover:text-danger"
                  : "bg-accent text-white hover:opacity-90"
              )}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : pushState === "on" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Smartphone className="h-4 w-4" />
              )}
              {pushState === "on"
                ? "Dezactivează pe acest dispozitiv"
                : "Activează pe acest dispozitiv"}
            </button>
          </div>
        )}

        {pushError && (
          <p className="mt-2 rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger">
            {pushError}
          </p>
        )}
      </div>

      <form action={action} className="space-y-4">
        {state.ok && (
          <p className="flex items-center gap-1.5 rounded-xl bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent">
            <Check className="h-4 w-4" /> Preferințe salvate.
          </p>
        )}
        {state.error && (
          <p className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
            {state.error}
          </p>
        )}

        <div className="space-y-2">
          {toggle("Email (notificări pe adresa ta)", "emailNotifs", prefs.emailNotifs)}
          {toggle(
            "Streak în pericol — avertisment înainte să pierzi seria",
            "streakNotifs",
            prefs.streakNotifs
          )}
          {toggle(
            "Cineva nou te urmărește",
            "followNotifs",
            prefs.followNotifs
          )}
        </div>

        <div className="rounded-2xl border border-feather bg-background p-4">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span className="text-sm font-semibold text-ink">
              Amintire zilnică de învățat
            </span>
            <input
              type="checkbox"
              checked={reminderOn}
              onChange={(e) => setReminderOn(e.target.checked)}
              className="h-4 w-4 accent-[--accent]"
            />
          </label>
          {reminderOn && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-subtle">La</span>
              <select
                name="reminderHour"
                defaultValue={prefs.reminderHour ?? 19}
                className="rounded-xl border border-feather bg-card px-3 py-2 text-sm font-semibold text-ink focus:border-accent focus:outline-none"
              >
                {[18, 19, 20, 21, 22].map((h) => (
                  <option key={h} value={h}>
                    {h}:00
                  </option>
                ))}
              </select>
              <span className="text-sm text-subtle">
                — dacă n-ai învățat încă în ziua respectivă.
              </span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? "Se salvează…" : "Salvează preferințele"}
        </button>
      </form>
    </div>
  );
}
