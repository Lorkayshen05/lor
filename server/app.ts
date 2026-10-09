import { Hono } from 'hono';
import { errorResponse } from './lib/http';
import type { Deps } from './deps';
import { adminRoutes } from './routes/admin';
import { publicRoutes } from './routes/public';

export function createApp(deps: Deps): Hono {
  const app = new Hono();

  app.use('*', async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('Referrer-Policy', 'no-referrer');
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    c.header(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    if (deps.config.isProd) c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    if (c.req.path.startsWith('/api/')) c.header('Cache-Control', c.res.headers.get('Cache-Control') ?? 'no-store');
  });

  app.route('/api', publicRoutes(deps));
  app.route('/api/admin', adminRoutes(deps));
  app.all('/api/*', (c) => c.json({ error: { code: 'NOT_FOUND', message: 'Unknown API route.' } }, 404));
  app.onError((err, c) => errorResponse(c, err));
  return app;
}
