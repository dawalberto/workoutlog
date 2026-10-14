self.addEventListener('push', (event) => {
  let payload = {};
  try {
    const parsed = event.data ? event.data.json() : {};
    if (typeof parsed === 'object' && parsed !== null) payload = parsed;
  } catch {
    payload = {};
  }

  const title = typeof payload.title === 'string'
    ? payload.title
    : 'Descanso terminado';
  const body = typeof payload.body === 'string'
    ? payload.body
    : '¡A por la siguiente serie!';
  const url = typeof payload.url === 'string' ? payload.url : '/workoutlog/';
  const scheduleId = typeof payload.scheduleId === 'string' ? payload.scheduleId : null;
  const fireAt = typeof payload.fireAt === 'string' ? Date.parse(payload.fireAt) : Date.now();

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    const visible = clients.some((client) => client.visibilityState === 'visible');
    await self.registration.showNotification(title, {
      body,
      tag: 'rest-timer',
      renotify: true,
      silent: visible,
      vibrate: [250, 100, 250, 100, 400],
      icon: `${self.registration.scope}pwa-192x192.png`,
      badge: `${self.registration.scope}pwa-192x192.png`,
      data: { url },
      timestamp: Number.isFinite(fireAt) ? fireAt : Date.now(),
    });
    for (const client of clients) {
      client.postMessage({ type: 'rest-push-delivered', scheduleId });
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const scopeUrl = new URL(self.registration.scope);
  let targetUrl = new URL('/workoutlog/', self.location.origin);
  try {
    const candidate = new URL(event.notification.data?.url ?? '/workoutlog/', self.location.origin);
    if (candidate.origin === scopeUrl.origin && candidate.href.startsWith(scopeUrl.href)) {
      targetUrl = candidate;
    }
  } catch {
    targetUrl = scopeUrl;
  }

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    const existing = clients.find((client) => client.url.startsWith(scopeUrl.href));
    if (existing) {
      if (existing.url !== targetUrl.href && 'navigate' in existing) {
        await existing.navigate(targetUrl.href);
      }
      await existing.focus();
      return;
    }
    await self.clients.openWindow(targetUrl.href);
  })());
});
