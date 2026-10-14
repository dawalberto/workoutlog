import { deepEqual, equal, match, ok } from 'node:assert/strict';
import { Agent } from 'node:https';
import { createHandler, isAllowedPushEndpoint, type PushSchedule } from './handler.ts';
import { createWebPushSender } from './push.ts';

type Bytes = Uint8Array<ArrayBuffer>;
interface TestHttpServer {
  shutdown(): void;
  finished: Promise<void>;
}

interface TestRuntime {
  test(name: string, fn: () => void | Promise<void>): void;
  readTextFile(path: URL): Promise<string>;
  serve(options: {
    hostname: string;
    port: number;
    cert: string;
    key: string;
    onListen(info: { port: number }): void;
    handler(request: Request): Response | Promise<Response>;
  }): TestHttpServer;
}

const deno = (globalThis as typeof globalThis & { Deno: TestRuntime }).Deno;

const schedule: PushSchedule = {
  schedule_id: 'schedule-1',
  endpoint: 'https://fcm.googleapis.com/subscription',
  p256dh: 'p256dh-key',
  auth: 'auth-key',
  title: 'Descanso terminado',
  body: 'Listo para la siguiente serie',
  fire_at: '2026-10-14T17:00:00.000Z',
};

function createDependencies(overrides: Record<string, unknown> = {}) {
  const rpc = {
    claim: async () => [schedule],
    isSending: async () => true,
    complete: async () => undefined,
    remove: async () => undefined,
  };
  const sendPush = async () => undefined;
  return {
    dispatchSecret: 'dispatch-secret',
    configured: true,
    rpc,
    sendPush,
    ...overrides,
  };
}

function post(secret = 'dispatch-secret') {
  return new Request('http://localhost/functions/v1/send-rest-push', {
    method: 'POST',
    headers: { 'x-dispatch-secret': secret },
    body: '{}',
  });
}

deno.test('rejects requests without the dispatch secret', async () => {
  const handler = createHandler(createDependencies());
  const response = await handler(post('wrong-secret'));

  equal(response.status, 401);
  deepEqual(await response.json(), { error: 'unauthorized' });
});

deno.test('rejects methods other than POST', async () => {
  const handler = createHandler(createDependencies());
  const response = await handler(new Request('http://localhost/functions/v1/send-rest-push'));

  equal(response.status, 405);
  equal(response.headers.get('allow'), 'POST');
});

deno.test('returns 500 when required configuration is missing', async () => {
  const handler = createHandler(createDependencies({ configured: false }));
  const response = await handler(post());

  equal(response.status, 500);
  deepEqual(await response.json(), { error: 'configuration_missing' });
});

deno.test('claims due work and completes successful sends as sent', async () => {
  const completed: unknown[][] = [];
  const dependencies = createDependencies({
    rpc: {
      claim: async () => [schedule],
      isSending: async () => true,
      complete: async (...args: unknown[]) => completed.push(args),
      remove: async () => undefined,
    },
  });
  let receivedPayload: unknown;
  const handler = createHandler({
    ...dependencies,
    sendPush: async (_subscription: unknown, payload: unknown) => {
      receivedPayload = payload;
    },
  });

  const response = await handler(post());

  equal(response.status, 200);
  deepEqual(await response.json(), {
    claimed: 1,
    sent: 1,
    failed: 0,
    removed: 0,
    rounds: 1,
  });
  deepEqual(completed, [['schedule-1', 'sent']]);
  deepEqual(receivedPayload, {
    title: schedule.title,
    body: schedule.body,
    tag: 'rest-timer',
    url: '/workoutlog/',
    scheduleId: schedule.schedule_id,
    fireAt: schedule.fire_at,
  });
});

deno.test('removes subscriptions after a 410 and completes the schedule as gone', async () => {
  const removed: string[] = [];
  const completed: unknown[][] = [];
  const dependencies = createDependencies({
    rpc: {
      claim: async () => [schedule],
      isSending: async () => true,
      complete: async (...args: unknown[]) => completed.push(args),
      remove: async (endpoint: string) => removed.push(endpoint),
    },
  });
  const handler = createHandler({
    ...dependencies,
    sendPush: async () => {
      throw Object.assign(new Error('gone'), { statusCode: 410 });
    },
  });

  const response = await handler(post());

  equal(response.status, 200);
  deepEqual(await response.json(), {
    claimed: 1,
    sent: 0,
    failed: 1,
    removed: 1,
    rounds: 1,
  });
  deepEqual(removed, [schedule.endpoint]);
  deepEqual(completed, [['schedule-1', 'failed', 'gone']]);
});

deno.test('completes generic delivery failures as failed without leaking provider errors', async () => {
  const completed: unknown[][] = [];
  const dependencies = createDependencies({
    rpc: {
      claim: async () => [schedule],
      isSending: async () => true,
      complete: async (...args: unknown[]) => completed.push(args),
      remove: async () => undefined,
    },
  });
  const handler = createHandler({
    ...dependencies,
    sendPush: async () => {
      throw new Error('provider response included a private token');
    },
  });

  const response = await handler(post());

  equal(response.status, 200);
  const responseBody = await response.text();
  deepEqual(JSON.parse(responseBody), {
    claimed: 1,
    sent: 0,
    failed: 1,
    removed: 0,
    rounds: 1,
  });
  deepEqual(completed, [['schedule-1', 'failed', 'delivery_failed']]);
  ok(!responseBody.includes('private token'));
});

deno.test('allows only supported Web Push endpoint hosts and HTTPS port 443', () => {
  for (const endpoint of [
    'https://fcm.googleapis.com/fcm/send/token',
    'https://android.googleapis.com/gcm/send/token',
    'https://web.push.apple.com/push/token',
    'https://updates.push.services.mozilla.com/wpush/v2/token',
    'https://wns2-example.notify.windows.com/w/?token=example',
    'https://fcm.googleapis.com:443/fcm/send/token',
  ]) {
    ok(isAllowedPushEndpoint(endpoint), `${endpoint} should be allowed`);
  }

  for (const endpoint of [
    'https://evil.example/subscription',
    'https://fcm.googleapis.com.evil.com/subscription',
    'https://fcm.googleapis.com\\evil.example/subscription',
    'https://.push.apple.com/subscription',
    'https://foo..push.apple.com/subscription',
    'https://user@fcm.googleapis.com/subscription',
    'https://fcm.googleapis.com:8443/subscription',
    'http://fcm.googleapis.com/subscription',
  ]) {
    ok(!isAllowedPushEndpoint(endpoint), `${endpoint} should be rejected`);
  }
});

deno.test('fails and removes a subscription with an unapproved endpoint before sending', async () => {
  const deniedSchedule = { ...schedule, endpoint: 'https://evil.example/subscription' };
  const completed: unknown[][] = [];
  const removed: string[] = [];
  let sent = false;
  const dependencies = createDependencies({
    rpc: {
      claim: async () => [deniedSchedule],
      isSending: async () => true,
      complete: async (...args: unknown[]) => completed.push(args),
      remove: async (endpoint: string) => removed.push(endpoint),
    },
    sendPush: async () => {
      sent = true;
    },
  });
  const response = await createHandler(dependencies)(post());

  equal(response.status, 200);
  deepEqual(await response.json(), {
    claimed: 1,
    sent: 0,
    failed: 1,
    removed: 1,
    rounds: 1,
  });
  deepEqual(completed, [['schedule-1', 'failed', 'endpoint_not_allowed']]);
  deepEqual(removed, [deniedSchedule.endpoint]);
  equal(sent, false);
});

deno.test('skips a claimed schedule cancelled before its push request starts', async () => {
  let sent = false;
  let completed = false;
  const dependencies = createDependencies({
    rpc: {
      claim: async () => [schedule],
      isSending: async () => false,
      complete: async () => {
        completed = true;
      },
      remove: async () => undefined,
    },
    sendPush: async () => {
      sent = true;
    },
  });
  const response = await createHandler(dependencies)(post());

  equal(response.status, 200);
  deepEqual(await response.json(), {
    claimed: 1,
    sent: 0,
    failed: 0,
    removed: 0,
    rounds: 1,
  });
  equal(sent, false);
  equal(completed, false);
});

deno.test('sends RFC 8291 encrypted Web Push with VAPID and decryptable payload', async () => {
  const vapidKeys = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const vapidPublic = new Uint8Array(await crypto.subtle.exportKey('raw', vapidKeys.publicKey));
  const vapidPrivate = await crypto.subtle.exportKey('jwk', vapidKeys.privateKey);
  const userKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );
  const userPublic = new Uint8Array(await crypto.subtle.exportKey('raw', userKeys.publicKey));
  const authSecret = crypto.getRandomValues(new Uint8Array(16));
  let server: TestHttpServer | undefined;
  let sendPromise: Promise<void> | undefined;
  const certificate = await deno.readTextFile(new URL('./test-cert.pem', import.meta.url));
  const privateCertificateKey = await deno.readTextFile(new URL('./test-key.pem', import.meta.url));
  const received = new Promise<{ headers: Headers; body: Bytes }>((resolve, reject) => {
    server = deno.serve({
      hostname: '127.0.0.1',
      port: 0,
      cert: certificate,
      key: privateCertificateKey,
      onListen({ port }) {
        const endpoint = `https://127.0.0.1:${port}`;
        const sender = createWebPushSender(
          {
            subject: 'mailto:push@example.test',
            publicKey: toBase64Url(vapidPublic),
            privateKey: vapidPrivate.d!,
          },
          { agent: new Agent({ rejectUnauthorized: false }) },
        );
        const localSchedule = {
          ...schedule,
          endpoint,
          p256dh: toBase64Url(userPublic),
          auth: toBase64Url(authSecret),
        };
        const handler = createHandler({
          ...createDependencies({
            rpc: {
              claim: async () => [localSchedule],
              isSending: async () => true,
              complete: async () => undefined,
              remove: async () => undefined,
            },
          }),
          isEndpointAllowed: (candidate: string) => candidate === endpoint,
          sendPush: sender,
        });
        sendPromise = handler(post()).then(async (response) => {
          equal(response.status, 200);
          deepEqual(await response.json(), {
            claimed: 1,
            sent: 1,
            failed: 0,
            removed: 0,
            rounds: 1,
          });
        }).catch(reject);
      },
      async handler(request) {
        resolve({
          headers: request.headers,
          body: new Uint8Array(await request.arrayBuffer()),
        });
        return new Response(null, { status: 201 });
      },
    });
    server.finished.catch(reject);
  });

  const request = await received;
  await sendPromise;
  server?.shutdown();
  equal(request.headers.get('content-encoding'), 'aes128gcm');
  equal(request.headers.get('ttl'), '60');
  equal(request.headers.get('urgency'), 'high');
  equal(request.headers.get('topic'), 'rest-timer');
  match(request.headers.get('authorization') ?? '', /^vapid t=.+, k=.+$/);

  const plaintext = await decryptWebPush(
    request.body,
    userKeys.privateKey,
    userPublic,
    authSecret,
  );
  deepEqual(JSON.parse(new TextDecoder().decode(plaintext)), {
    title: schedule.title,
    body: schedule.body,
    tag: 'rest-timer',
    url: '/workoutlog/',
    scheduleId: 'schedule-1',
    fireAt: '2026-10-14T17:00:00.000Z',
  });
});

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

async function decryptWebPush(
  body: Bytes,
  userPrivateKey: CryptoKey,
  userPublicKey: Bytes,
  authSecret: Bytes,
): Promise<Bytes> {
  const salt = body.slice(0, 16);
  const recordSize = new DataView(body.buffer, body.byteOffset + 16, 4).getUint32(0);
  const keyIdLength = body[20];
  const serverPublicBytes = body.slice(21, 21 + keyIdLength);
  const ciphertext = body.slice(21 + keyIdLength);
  const serverPublicKey = await crypto.subtle.importKey(
    'raw',
    serverPublicBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: serverPublicKey },
      userPrivateKey,
      256,
    ),
  );
  const authPrk = await hkdfExtract(authSecret, sharedSecret);
  const keyInfo = concat(
    new TextEncoder().encode('WebPush: info\0'),
    userPublicKey,
    serverPublicBytes,
  );
  const inputKeyingMaterial = await hkdfExpand(authPrk, keyInfo, 32);
  const contentPrk = await hkdfExtract(salt, inputKeyingMaterial);
  const contentKey = await hkdfExpand(
    contentPrk,
    new TextEncoder().encode('Content-Encoding: aes128gcm\0'),
    16,
  );
  const nonce = await hkdfExpand(
    contentPrk,
    new TextEncoder().encode('Content-Encoding: nonce\0'),
    12,
  );
  const aesKey = await crypto.subtle.importKey(
    'raw',
    contentKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  );
  const decrypted = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: nonce, tagLength: 128 },
      aesKey,
      ciphertext,
    ),
  );
  let end = decrypted.length;
  while (end > 0 && decrypted[end - 1] === 0) end--;
  equal(decrypted[end - 1], 2);
  ok(recordSize > 0);
  return decrypted.slice(0, end - 1);
}

async function hkdfExtract(salt: Bytes, input: Bytes): Promise<Bytes> {
  const key = await crypto.subtle.importKey(
    'raw',
    salt,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, input));
}

async function hkdfExpand(
  pseudoRandomKey: Bytes,
  info: Bytes,
  length: number,
): Promise<Bytes> {
  const key = await crypto.subtle.importKey(
    'raw',
    pseudoRandomKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const output = new Uint8Array(length);
  let previous = new Uint8Array();
  let offset = 0;
  for (let counter = 1; offset < length; counter++) {
    previous = new Uint8Array(
      await crypto.subtle.sign('HMAC', key, concat(previous, info, new Uint8Array([counter]))),
    );
    const chunk = previous.slice(0, length - offset);
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

function concat(...arrays: Bytes[]): Bytes {
  const result = new Uint8Array(arrays.reduce((length, array) => length + array.length, 0));
  let offset = 0;
  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }
  return result;
}
