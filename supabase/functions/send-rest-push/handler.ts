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
  complete(scheduleId: string, status: 'sent' | 'failed', error?: string): Promise<void>;
  remove(endpoint: string): Promise<void>;
}

interface HandlerDependencies {
  dispatchSecret?: string;
  configured: boolean;
  rpc: DispatchRpc;
  sendPush(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: PushPayload,
  ): Promise<void>;
}

const CLAIM_LIMIT = 100;
const MAX_CLAIM_ROUNDS = 3;
const SEND_CONCURRENCY = 8;

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
          const payload: PushPayload = {
            title: schedule.title,
            body: schedule.body,
            tag: 'rest-timer',
            url: '/workoutlog/',
            scheduleId: schedule.schedule_id,
            fireAt: schedule.fire_at,
          };

          try {
            await deps.sendPush(
              {
                endpoint: schedule.endpoint,
                keys: { p256dh: schedule.p256dh, auth: schedule.auth },
              },
              payload,
            );
            await deps.rpc.complete(schedule.schedule_id, 'sent');
            counts.sent++;
          } catch (error) {
            if (isGone(error)) {
              await deps.rpc.remove(schedule.endpoint);
              await deps.rpc.complete(schedule.schedule_id, 'failed', 'gone');
              counts.failed++;
              counts.removed++;
              return;
            }

            await deps.rpc.complete(schedule.schedule_id, 'failed', 'delivery_failed');
            counts.failed++;
          }
        });

        if (schedules.length < CLAIM_LIMIT) break;
      }

      return json(counts, 200);
    } catch {
      return json({ error: 'dispatch_failed' }, 500);
    }
  };
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
