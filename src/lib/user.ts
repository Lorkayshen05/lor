import { prisma } from "@/lib/prisma";

const DEMO_EMAIL = "erwin.lius06@gmail.com";

/**
 * AI Quest ships as a single-learner MVP: no login flow, one demo account
 * auto-provisioned on first request. Swapping in real auth later just means
 * replacing this lookup with a session-derived user id.
 */
export async function getOrCreateDemoUser() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Erwin",
      level: 1,
      xp: 0,
      xpToNext: 100,
      streak: 0,
    },
  });
}
