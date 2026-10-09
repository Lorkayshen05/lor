import { z } from 'zod';

/** Treat empty strings (common in .env files) as "not set". */
const opt = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== '' ? v.trim() : undefined));
const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase())));
const int = (def: number, min = 0) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : Number(v)))
    .pipe(z.number().int().min(min));

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: int(8787, 1),
  DATABASE_PATH: opt,
  BUSINESS_TZ: opt,
  ORDER_TOKEN_SECRET: opt,
  /** Production refuses to take orders on the placeholder menu unless this is explicitly set. */
  ALLOW_SAMPLE_MENU: bool(false),
  CONTACT_RETENTION_DAYS: int(30, 1),
  SESSION_HOURS: int(12, 1),

  WORKER_INTERVAL_MS: int(15_000, 1000),
  NOTIFY_MAX_ATTEMPTS: int(5, 1),

  SMTP_HOST: opt,
  SMTP_PORT: int(587, 1),
  SMTP_SECURE: bool(false),
  SMTP_USER: opt,
  SMTP_PASS: opt,
  EMAIL_FROM: opt,
  STAFF_EMAIL_TO: opt,

  WHATSAPP_ACCESS_TOKEN: opt,
  WHATSAPP_PHONE_NUMBER_ID: opt,
  WHATSAPP_STAFF_TO: opt,
  TRUST_PROXY: bool(false),
  WHATSAPP_TEMPLATE_NAME: opt,
  WHATSAPP_TEMPLATE_LANG: opt,
  WHATSAPP_API_VERSION: opt,

  KDS_WEBHOOK_URL: opt,
  KDS_WEBHOOK_SECRET: opt,

  ANTHROPIC_API_KEY: opt,
  AI_MODEL: opt,
  AI_TIMEOUT_MS: int(20_000, 1000),
  AI_ENABLED: bool(true),

  REPORT_DAILY_EMAIL: bool(false),
  REPORT_HOUR: int(8, 0),
});

export interface Config {
  env: 'development' | 'test' | 'production';
  isProd: boolean;
  port: number;
  databasePath: string;
  businessTz: string;
  orderTokenSecret: string;
  allowSampleMenu: boolean;
  contactRetentionDays: number;
  sessionHours: number;
  trustProxy: boolean;
  workerIntervalMs: number;
  notifyMaxAttempts: number;
  smtp: { host: string; port: number; secure: boolean; user?: string; pass?: string; from: string; to: string } | null;
  whatsapp: {
    accessToken: string;
    phoneNumberId: string;
    to: string;
    templateName: string;
    templateLang: string;
    apiVersion: string;
  } | null;
  kds: { url: string; secret: string } | null;
  ai: { enabled: boolean; model: string; timeoutMs: number; apiKeyPresent: boolean };
  reportDailyEmail: boolean;
  reportHour: number;
  /** Values that must never appear in logs, errors or API responses. */
  secrets: string[];
}

export class ConfigError extends Error {}

export function loadConfig(env: Record<string, string | undefined>): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new ConfigError(
      `Invalid environment: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
    );
  }
  const e = parsed.data;
  const isProd = e.NODE_ENV === 'production';

  if (isProd && (!e.ORDER_TOKEN_SECRET || e.ORDER_TOKEN_SECRET.length < 32)) {
    throw new ConfigError('ORDER_TOKEN_SECRET (min 32 chars) is required in production.');
  }

  // A channel counts as "configured" only when every field it needs is present — never half-configured.
  const smtp =
    e.SMTP_HOST && e.EMAIL_FROM && e.STAFF_EMAIL_TO
      ? {
          host: e.SMTP_HOST,
          port: e.SMTP_PORT,
          secure: e.SMTP_SECURE,
          user: e.SMTP_USER,
          pass: e.SMTP_PASS,
          from: e.EMAIL_FROM,
          to: e.STAFF_EMAIL_TO,
        }
      : null;
  const whatsapp =
    e.WHATSAPP_ACCESS_TOKEN && e.WHATSAPP_PHONE_NUMBER_ID && e.WHATSAPP_STAFF_TO && e.WHATSAPP_TEMPLATE_NAME
      ? {
          accessToken: e.WHATSAPP_ACCESS_TOKEN,
          phoneNumberId: e.WHATSAPP_PHONE_NUMBER_ID,
          // One recipient: the Cloud API cannot message groups; point this at a shared staff number.
          to: e.WHATSAPP_STAFF_TO.replace(/[^\d]/g, ''),
          templateName: e.WHATSAPP_TEMPLATE_NAME,
          templateLang: e.WHATSAPP_TEMPLATE_LANG ?? 'en',
          // Pin explicitly in production: Meta retires Graph API versions. Verify the current one before go-live.
          apiVersion: e.WHATSAPP_API_VERSION ?? 'v21.0',
        }
      : null;
  const kds = e.KDS_WEBHOOK_URL && e.KDS_WEBHOOK_SECRET ? { url: e.KDS_WEBHOOK_URL, secret: e.KDS_WEBHOOK_SECRET } : null;

  return {
    env: e.NODE_ENV,
    isProd,
    port: e.PORT,
    databasePath: e.DATABASE_PATH ?? (e.NODE_ENV === 'test' ? ':memory:' : './data/ruby.db'),
    businessTz: e.BUSINESS_TZ ?? 'Asia/Kuala_Lumpur',
    orderTokenSecret: e.ORDER_TOKEN_SECRET ?? 'dev-only-insecure-secret-change-me-please!!',
    allowSampleMenu: e.ALLOW_SAMPLE_MENU,
    contactRetentionDays: e.CONTACT_RETENTION_DAYS,
    sessionHours: e.SESSION_HOURS,
    workerIntervalMs: e.WORKER_INTERVAL_MS,
    notifyMaxAttempts: e.NOTIFY_MAX_ATTEMPTS,
    smtp,
    whatsapp: whatsapp && whatsapp.to ? whatsapp : null,
    trustProxy: e.TRUST_PROXY,
    kds,
    ai: {
      enabled: e.AI_ENABLED && !!e.ANTHROPIC_API_KEY,
      // Default per the Anthropic API guidance for this codebase; override with AI_MODEL (e.g. a cheaper model).
      model: e.AI_MODEL ?? 'claude-opus-5-5',
      timeoutMs: e.AI_TIMEOUT_MS,
      apiKeyPresent: !!e.ANTHROPIC_API_KEY,
    },
    reportDailyEmail: e.REPORT_DAILY_EMAIL,
    reportHour: e.REPORT_HOUR,
    secrets: [
      e.ORDER_TOKEN_SECRET,
      e.SMTP_PASS,
      e.SMTP_USER,
      e.WHATSAPP_ACCESS_TOKEN,
      e.KDS_WEBHOOK_SECRET,
      e.ANTHROPIC_API_KEY,
    ].filter((s): s is string => !!s && s.length >= 6),
  };
}
