/**
 * Browser helpers for Web Push (service worker + PushManager).
 */
import {
  fetchVapidPublicKey,
  subscribePush,
  unsubscribePush,
  type PushSubscriptionJSON,
} from '@/lib/api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function subscriptionToJSON(sub: PushSubscription): PushSubscriptionJSON {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Invalid push subscription from browser');
  }
  return {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    expirationTime: json.expirationTime ?? null,
  };
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register('/sw.js');
}

/** Enable browser push + save subscription on the API. */
export async function enableWebPush(): Promise<void> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }

  const { publicKey, configured } = await fetchVapidPublicKey();
  if (!configured || !publicKey) {
    throw new Error('Push is not configured on the server yet (missing VAPID keys)');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was denied');
  }

  const registration = await getRegistration();
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  await subscribePush(subscriptionToJSON(subscription));
}

/** Remove browser subscription and tell the API. */
export async function disableWebPush(): Promise<void> {
  if (!isPushSupported()) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription = await registration?.pushManager.getSubscription();
    const endpoint = subscription?.endpoint;
    if (subscription) await subscription.unsubscribe();
    await unsubscribePush(endpoint);
  } catch {
    await unsubscribePush();
  }
}
