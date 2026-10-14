export type PushBrowserSupport = 'unsupported' | 'needs-install' | 'available';

let readyRegistration: ServiceWorkerRegistration | null = null;
let readyRegistrationPromise: Promise<ServiceWorkerRegistration> | null = null;

function isIosOrIpados(): boolean {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return navigatorWithStandalone.standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true;
}

export function detectPushSupport(): PushBrowserSupport {
  const hasPushManager = typeof window !== 'undefined' && 'PushManager' in window;
  if (isIosOrIpados() && !isStandalone() && !hasPushManager) return 'needs-install';
  if (
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !hasPushManager ||
    typeof Notification === 'undefined'
  ) {
    return 'unsupported';
  }
  return 'available';
}

export function base64UrlToUint8Array(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function primeServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (readyRegistration) return readyRegistration;
  if (!readyRegistrationPromise) {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      throw new Error('Service workers are unavailable.');
    }
    readyRegistrationPromise = navigator.serviceWorker.ready.then((registration) => {
      readyRegistration = registration;
      return registration;
    }).catch((error: unknown) => {
      readyRegistrationPromise = null;
      throw error;
    });
  }
  return readyRegistrationPromise;
}

export function subscribeBrowserPush(vapidPublicKey: string): Promise<PushSubscription> {
  if (!readyRegistration) {
    throw new Error('The service worker has not been prepared.');
  }
  return readyRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
  });
}

export async function getBrowserPushSubscription(): Promise<PushSubscription | null> {
  const registration = readyRegistration ?? await primeServiceWorkerRegistration();
  return registration.pushManager.getSubscription();
}

export async function unsubscribeBrowserPush(): Promise<boolean> {
  const subscription = await getBrowserPushSubscription();
  return subscription ? subscription.unsubscribe() : false;
}

export async function closeRestNotifications(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = readyRegistration ?? await primeServiceWorkerRegistration();
    const notifications = await registration.getNotifications({ tag: 'rest-timer' });
    notifications.forEach((notification) => notification.close());
  } catch {
    // Notification cleanup is best-effort and must not interrupt timer actions.
  }
}
