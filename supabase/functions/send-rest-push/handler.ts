export interface PushSchedule {
  schedule_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  title: string;
  body: string;
  fire_at: string;
}

export interface PushPayload {
  title: string;
  body: string;
  tag: 'rest-timer';
  url: '/workoutlog/';
  scheduleId: string;
  fireAt: string;
}

export interface DispatchRpc {
  claim(limit: number): Promise<PushSchedule[]>;
  isSending(scheduleId: string): Promise<boolean>;
  complete(scheduleId: string, status: 'sent' | 'failed', error?: string): Promise<void>;
  remove(endpoint: string): Promise<void>;
}

interface HandlerDependencies {
  dispatchSecret?: string;
  configured: boolean;
  rpc: DispatchRpc;
  isEndpointAllowed?: (endpoint: string) => boolean;
  sendPush(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: PushPayload,
  ): Promise<void>;
}

const CLAIM_LIMIT = 100;
const MAX_CLAIM_ROUNDS = 3;
const SEND_CONCURRENCY = 8;

export function isAllowedPushEndpoint(endpoint: string): boolean {
  if (!endpoint.startsWith('https://') || /[\\\u0000-\u001F\u007F]/.test(endpoint)) return false;
  const authority = endpoint.match(/^https:\/\/([^/?#]*)/);
  if (!authority || authority[1] === undefined || authority[1].includes('@')) return false;

  const hostAndPort = authority[1].match(/^([^:/?#]+)(?::([0-9]+))?$/);
  if (!hostAndPort || (hostAndPort[2] !== undefined && hostAndPort[2] !== '443')) return false;

  try {
    const url = new URL(endpoint);
    if (
      url.protocol !== 'https:' ||
      url.username !== '' ||
      url.password !== '' ||
      url.hostname.toLowerCase() !== hostAndPort[1]?.toLowerCase() ||
      (url.port !== '' && url.port !== '443')
    ) return false;

    const hostname = url.hostname.toLowerCase();
    return hostname === 'fcm.googleapis.com' ||
      hostname === 'android.googleapis.com' ||
      isProviderSubdomain(hostname, 'push.apple.com') ||
      isProviderSubdomain(hostname, 'push.services.mozilla.com') ||
      isProviderSubdomain(hostname, 'notify.windows.com');
  } catch {
    return false;
  }
}

function isProviderSubdomain(hostname: string, suffix: string): boolean {
  const suffixWithBoundary = `.${suffix}`;
  if (!hostname.endsWith(suffixWithBoundary)) return false;
  const subdomain = hostname.slice(0, -suffixWithBoundary.length);
  return subdomain.length > 0 && subdomain.split('.').every((label) => /^[a-z0-9-]+$/.test(label));
}

export function createHandler(deps: HandlerDependencies): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
    }

    if (!deps.configured) {
      return json({ error: 'configuration_missing' }, 500);
    }

    if (!constantTimeEquals(request.headers.get('x-dispatch-secret') ?? '', deps.dispatchSecret ?? '')) {
      return json({ error: 'unauthorized' }, 401);
    }

    const counts = { claimed: 0, sent: 0, failed: 0, removed: 0, rounds: 0 };

    try {
      while (counts.rounds < MAX_CLAIM_ROUNDS) {
        const schedules = await deps.rpc.claim(CLAIM_LIMIT);
        counts.rounds++;
        counts.claimed += schedules.length;

        await forEachBounded(schedules, SEND_CONCURRENCY, async (schedule) => {
          let failureCode = 'status_check_failed';
          try {
            if (!(deps.isEndpointAllowed ?? isAllowedPushEndpoint)(schedule.endpoint)) {
              failureCode = 'endpoint_not_allowed';
              console.error(
                'rest_push_schedule_failed',
                failureCode,
                schedule.schedule_id,
              );
              await deps.rpc.complete(schedule.schedule_id, 'failed', failureCode);
              await deps.rpc.remove(schedule.endpoint);
              counts.failed++;
              counts.removed++;
              return;
            }
            if (!await deps.rpc.isSending(schedule.schedule_id)) return;

            const payload: PushPayload = {
              title: schedule.title,
              body: schedule.body,
              tag: 'rest-timer',
              url: '/workoutlog/',
              scheduleId: schedule.schedule_id,
              fireAt: schedule.fire_at,
            };

            failureCode = 'delivery_failed';
            try {
              await deps.sendPush(
                {
                  endpoint: schedule.endpoint,
                  keys: { p256dh: schedule.p256dh, auth: schedule.auth },
                },
                payload,
              );
            } catch (error) {
              console.error(
                'rest_push_delivery_failed',
                shortErrorCode(error),
                schedule.schedule_id,
              );
              if (isGone(error)) {
                failureCode = 'gone';
                await deps.rpc.remove(schedule.endpoint);
                await deps.rpc.complete(schedule.schedule_id, 'failed', failureCode);
                counts.failed++;
                counts.removed++;
                return;
              }

              await deps.rpc.complete(schedule.schedule_id, 'failed', failureCode);
              counts.failed++;
              return;
            }

            failureCode = 'completion_failed';
            await deps.rpc.complete(schedule.schedule_id, 'sent');
            counts.sent++;
          } catch (error) {
            console.error(
              'rest_push_schedule_failed',
              shortErrorCode(error),
              schedule.schedule_id,
            );
            try {
              await deps.rpc.complete(schedule.schedule_id, 'failed', failureCode);
            } catch (completionError) {
              console.error(
                'rest_push_completion_failed',
                shortErrorCode(completionError),
                schedule.schedule_id,
              );
            }
            counts.failed++;
          }
        });

        if (schedules.length < CLAIM_LIMIT) break;
      }

      return json(counts, 200);
    } catch (error) {
      console.error('rest_push_dispatch_failed', shortErrorCode(error));
      return json({ error: 'dispatch_failed' }, 500);
    }
  };
}

function shortErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = error.code;
    if (typeof code === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(code)) return code;
  }
  if (typeof error === 'object' && error !== null) {
    const status = 'statusCode' in error
      ? error.statusCode
      : 'status' in error
      ? error.status
      : undefined;
    if (typeof status === 'number' && status >= 100 && status <= 599) return String(status);
  }
  if (error instanceof Error) {
    if (/^[A-Za-z0-9_-]{1,64}$/.test(error.message)) return error.message;
    if (/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(error.name)) return error.name;
  }
  return 'unknown_error';
}

function constantTimeEquals(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);

  for (let index = 0; index < length; index++) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return difference === 0;
}

function isGone(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const status = 'statusCode' in error ? error.statusCode : 'status' in error ? error.status : undefined;
  return status === 404 || status === 410;
}

async function forEachBounded<T>(
  items: T[],
  concurrency: number,
  callback: (item: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex++];
      if (item !== undefined) await callback(item);
    }
  });
  await Promise.all(workers);
}

function json(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}
