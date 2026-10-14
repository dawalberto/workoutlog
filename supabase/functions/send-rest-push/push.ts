import type { Agent } from 'node:https';
// Deno resolves this package from the function-local imports map, not pnpm.
// @ts-ignore
import { sendNotification } from 'web-push';
import type { PushPayload } from './handler.ts';

export interface VapidConfig {
  subject: string;
  publicKey: string;
  privateKey: string;
}

export interface WebPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface WebPushSenderOptions {
  agent?: Agent;
}

export function isValidVapidConfig(config: VapidConfig): boolean {
  if (!config.subject || !config.publicKey || !config.privateKey) return false;

  try {
    const subject = new URL(config.subject);
    if (subject.protocol !== 'https:' && subject.protocol !== 'mailto:') return false;
    return decodeBase64Url(config.publicKey).length === 65
      && decodeBase64Url(config.privateKey).length === 32;
  } catch {
    return false;
  }
}

export function createWebPushSender(config: VapidConfig, options: WebPushSenderOptions = {}) {
  return async (subscription: WebPushSubscription, payload: PushPayload): Promise<void> => {
    await sendNotification(subscription, JSON.stringify(payload), {
      vapidDetails: {
        subject: config.subject,
        publicKey: config.publicKey,
        privateKey: config.privateKey,
      },
      TTL: 60,
      urgency: 'high',
      topic: 'rest-timer',
      contentEncoding: 'aes128gcm',
      timeout: 4000,
      agent: options.agent,
    });
  };
}

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}
