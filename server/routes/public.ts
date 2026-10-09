import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { BUSINESS } from '../../src/data/business';
import { LANGUAGES } from '../../src/i18n/languages';
import { answerIntent, detectIntent } from '../../src/services/guide/engine';
import type { GuideContext, GuideIntent } from '../../src/services/guide/types';
import type { Deps } from '../deps';
import { clientIp, errorResponse, tooMany } from '../lib/http';
import { aiGuideAnswer } from '../modules/ai/guide';
import { getMenu, menuIsSample } from '../modules/menu';
import { createOrder, getOrderForCustomer } from '../modules/orders';

const ingredient = z.enum(['sesame', 'peanut', 'almond', 'walnut']);
const GuideIntentSchema: z.ZodType<GuideIntent> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('first_visit') }),
  z.object({ type: z.literal('second_visit') }),
  z.object({ type: z.literal('try_next') }),
  z.object({ type: z.literal('budget'), amount: z.number().int().min(100).max(1_000_000), people: z.number().int().min(1).max(12).optional() }),
  z.object({ type: z.literal('ingredient'), ingredient }),
  z.object({ type: z.literal('drinks') }),
  z.object({ type: z.literal('compare'), itemIds: z.array(z.string().max(64)).max(4).optional() }),
  z.object({ type: z.literal('allergy'), ingredient: ingredient.optional() }),
  z.object({ type: z.literal('faq'), topic: z.enum(['hours', 'location', 'contact', 'ordering', 'languages', 'dinein_takeaway', 'reservation', 'prep_time', 'discounts']) }),
  z.object({ type: z.literal('unknown') }),
]);

const GuideRequestSchema = z
  .object({
    message: z.string().max(300).optional(),
    intent: GuideIntentSchema.optional(),
    language: z.string().max(12).default('en'),
    context: z.object({
      orderType: z.enum(['dine-in', 'takeaway']),
      orderedItemIds: z.array(z.string().max(64)).max(100).default([]),
      cartItemIds: z.array(z.string().max(64)).max(50).default([]),
    }),
  })
  .strict();

export function publicRoutes(deps: Deps): Hono {
  const r = new Hono();
  const ip = (c: Parameters<typeof clientIp>[0]) => clientIp(c, deps.config.trustProxy);
  const limit = (c: Parameters<typeof clientIp>[0], name: string, max: number, windowMs: number) => deps.limiter.check(`${name}:${ip(c)}`, max, windowMs, deps.now().getTime());

  r.get('/health', (c) =>
    c.json({
      ok: true,
      time: deps.now().toISOString(),
      menuIsSample: menuIsSample(),
      orderingOpen: !(deps.config.isProd && menuIsSample() && !deps.config.allowSampleMenu),
      aiGuide: deps.config.ai.enabled,
    }),
  );

  /** Authoritative menu: names, prices and availability the server will use to price orders. */
  r.get('/menu', (c) => {
    c.header('Cache-Control', 'no-cache');
    return c.json({ menu: getMenu(deps), isSample: menuIsSample() });
  });

  r.post('/orders', bodyLimit({ maxSize: 16 * 1024, onError: (c) => c.json({ error: { code: 'TOO_LARGE', message: 'Request too large.' } }, 413) }), async (c) => {
    const l = limit(c, 'order', 10, 60_000);
    if (!l.allowed) return tooMany(c, l.retryAfterSec);
    try {
      const body = await c.req.json().catch(() => null);
      const result = createOrder(deps, body, c.req.header('idempotency-key') ?? '');
      if (result.created) deps.kick?.(); // deliver staff notifications now; the order is already safely saved
      return c.json(
        { order: result.order, trackingToken: result.trackingToken, created: result.created },
        result.created ? 201 : 200,
      );
    } catch (e) {
      return errorResponse(c, e);
    }
  });

  r.get('/orders/:id/status', (c) => {
    const l = limit(c, 'status', 90, 60_000);
    if (!l.allowed) return tooMany(c, l.retryAfterSec);
    const order = getOrderForCustomer(deps, c.req.param('id'), c.req.header('x-order-token') ?? '');
    c.header('Cache-Control', 'no-store');
    if (!order) return c.json({ error: { code: 'NOT_FOUND', message: 'We could not find that order.' } }, 404);
    return c.json({ order });
  });

  r.post('/guide', bodyLimit({ maxSize: 8 * 1024, onError: (c) => c.json({ error: { code: 'TOO_LARGE', message: 'Request too large.' } }, 413) }), async (c) => {
    const l = limit(c, 'guide', 30, 60_000);
    if (!l.allowed) return tooMany(c, l.retryAfterSec);
    const parsed = GuideRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: { code: 'INVALID_REQUEST', message: 'The question could not be read.' } }, 422);
    const req = parsed.data;

    const ctx: GuideContext = {
      menu: getMenu(deps),
      orderType: req.context.orderType,
      orderedItemIds: req.context.orderedItemIds,
      cartItemIds: req.context.cartItemIds,
      business: BUSINESS,
      languageCount: LANGUAGES.length,
    };
    const intent = req.intent ?? detectIntent(req.message ?? '', ctx.menu);
    let answer = answerIntent(intent, ctx);

    // Free text the rules couldn't classify → optional AI (validated against the menu), separately rate-limited.
    if (intent.type === 'unknown' && req.message?.trim() && deps.llm) {
      const ai = limit(c, 'guide-ai', 8, 60_000);
      if (ai.allowed) {
        const aiAnswer = await aiGuideAnswer(deps, req.message, ctx, req.language);
        if (aiAnswer) answer = aiAnswer;
      }
    }
    c.header('Cache-Control', 'no-store');
    return c.json({ answer });
  });

  return r;
}
