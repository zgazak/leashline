"use client";

import { useCallback, useEffect, useState } from "react";
import type { Api } from "@/lib/auth-api";

type PushState = "unsupported" | "prompt" | "granted" | "denied" | "loading";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    arr[i] = raw.charCodeAt(i);
  }
  return arr;
}

function getSubscriptionPayload(sub: PushSubscription) {
  const json = sub.toJSON();
  return {
    endpoint: sub.endpoint,
    keys: {
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    },
  };
}

export function usePushNotifications(api: Api) {
  const [state, setState] = useState<PushState>("loading");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    const perm = Notification.permission;
    if (perm === "denied") {
      setState("denied");
      return;
    }

    // Check if already subscribed
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setSubscribed(sub !== null);
        setState(perm === "granted" ? "granted" : "prompt");
      })
      .catch(() => setState("prompt"));
  }, []);

  const subscribe = useCallback(async () => {
    try {
      setState("loading");
      const { public_key } = await api.getVapidKey();

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key),
      });

      await api.subscribePush(getSubscriptionPayload(sub));
      setSubscribed(true);
      setState("granted");
    } catch (err) {
      console.error("Push subscribe failed:", err);
      setState(Notification.permission === "denied" ? "denied" : "prompt");
    }
  }, [api]);

  const unsubscribe = useCallback(async () => {
    try {
      setState("loading");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.unsubscribePush(getSubscriptionPayload(sub));
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setState("prompt");
    } catch (err) {
      console.error("Push unsubscribe failed:", err);
      setState("prompt");
    }
  }, [api]);

  return { state, subscribed, subscribe, unsubscribe };
}
