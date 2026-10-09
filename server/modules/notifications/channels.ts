import nodemailer from 'nodemailer';
import type { Config } from '../../config';
import { hmacHex } from '../../lib/security';

export type ChannelId = 'email' | 'whatsapp' | 'kds';

/** Provider-neutral message. Each channel uses the parts it needs. */
export interface NotificationMessage {
  /** Notification row id — stable across retries, sent to receivers as an idempotency id. */
  id: string;
  kind: 'order_created' | 'report' | 'test';
  subject: string;
  text: string;
  /** Three short strings for the approved WhatsApp template body ({{1}}, {{2}}, {{3}}). */
  whatsappParams: [string, string, string];
  /** Structured order for kitchen systems (never includes customer contact details). */
  kds: Record<string, unknown> | null;
}

export interface Channel {
  id: ChannelId;
  label: string;
  isConfigured(): boolean;
  /** Resolve only when the provider accepted the message; throw otherwise. Never pretend success. */
  send(msg: NotificationMessage): Promise<void>;
}

export interface MailTransport {
  sendMail(opts: { from: string; to: string; subject: string; text: string; headers?: Record<string, string> }): Promise<unknown>;
}

export interface ChannelOptions {
  fetch?: typeof fetch;
  mailTransport?: (smtp: NonNullable<Config['smtp']>) => MailTransport;
  /** Per-request timeout for HTTP providers. */
  timeoutMs?: number;
}

const TIMEOUT = 10_000;

async function httpOk(res: Response, what: string): Promise<void> {
  if (res.ok) return;
  let detail = '';
  try {
    detail = (await res.text()).slice(0, 300);
  } catch {
    /* ignore */
  }
  throw new Error(`${what} responded ${res.status}${detail ? `: ${detail}` : ''}`);
}

export function createChannels(config: Config, opts: ChannelOptions = {}): Channel[] {
  const doFetch = opts.fetch ?? fetch;
  const timeout = opts.timeoutMs ?? TIMEOUT;

  const email: Channel = {
    id: 'email',
    label: 'Email (SMTP)',
    isConfigured: () => !!config.smtp,
    async send(msg) {
      const smtp = config.smtp;
      if (!smtp) throw new Error('Email is not configured');
      const transport: MailTransport = opts.mailTransport
        ? opts.mailTransport(smtp)
        : (nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure,
            auth: smtp.user ? { user: smtp.user, pass: smtp.pass ?? '' } : undefined,
            connectionTimeout: 10_000,
            greetingTimeout: 10_000,
            socketTimeout: 15_000,
          }) as unknown as MailTransport);
      await transport.sendMail({
        from: smtp.from,
        to: smtp.to,
        subject: msg.subject,
        text: msg.text,
        headers: { 'X-Ruby-Notification-Id': msg.id },
      });
    },
  };

  const whatsapp: Channel = {
    id: 'whatsapp',
    label: 'WhatsApp Business (Cloud API)',
    isConfigured: () => !!config.whatsapp,
    async send(msg) {
      const wa = config.whatsapp;
      if (!wa) throw new Error('WhatsApp is not configured');
      const res = await doFetch(`https://graph.facebook.com/${wa.apiVersion}/${wa.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${wa.accessToken}`, 'Content-Type': 'application/json' },
        // Business-initiated messages must use a pre-approved template; free text is rejected outside a 24h window.
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: wa.to,
          type: 'template',
          template: {
            name: wa.templateName,
            language: { code: wa.templateLang },
            components: [{ type: 'body', parameters: msg.whatsappParams.map((text) => ({ type: 'text', text })) }],
          },
        }),
        signal: AbortSignal.timeout(timeout),
      });
      await httpOk(res, 'WhatsApp API');
    },
  };

  const kds: Channel = {
    id: 'kds',
    label: 'Kitchen display (signed webhook)',
    isConfigured: () => !!config.kds,
    async send(msg) {
      const k = config.kds;
      if (!k) throw new Error('Kitchen display webhook is not configured');
      const body = JSON.stringify({ event: msg.kind === 'order_created' ? 'order.created' : `notification.${msg.kind}`, id: msg.id, data: msg.kds });
      const res = await doFetch(k.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Receivers verify: HMAC-SHA256(secret, raw body) and de-duplicate on X-Ruby-Event-Id (retries reuse it).
          'X-Ruby-Signature': `sha256=${hmacHex(k.secret, body)}`,
          'X-Ruby-Event-Id': msg.id,
        },
        body,
        signal: AbortSignal.timeout(timeout),
      });
      await httpOk(res, 'Kitchen display webhook');
    },
  };

  return [email, whatsapp, kds];
}
