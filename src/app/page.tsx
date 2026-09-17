import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, LinkButton } from "@/components/ui";

const LOOP = [
  { step: "READ", text: "One concept, one quest, no lecture." },
  { step: "CODE", text: "Python editor with starter code and hints." },
  { step: "RUN", text: "Sandboxed WebAssembly runtime in your browser." },
  { step: "TEST", text: "Visible and hidden tests decide pass or fail." },
  { step: "XP", text: "Earn XP, level up, keep the streak alive." },
  { step: "NEXT", text: "The next quest unlocks automatically." },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const courses = await prisma.course.findMany({
    where: { published: true },
    orderBy: { order: "asc" },
    select: { id: true, title: true, icon: true, description: true },
  });

  return (
    <div className="space-y-10 py-6">
      <section className="space-y-5 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent-soft">Year-2 AI track</p>
        <h1 className="text-balance text-4xl font-black leading-tight sm:text-5xl">
          Learn AI by clearing quests, not by reading slides.
        </h1>
        <p className="mx-auto max-w-2xl text-pretty text-ink-muted">
          Python → NumPy → Pandas → Stats → DSA → Machine Learning → Deep Learning → Generative AI. Every lesson ends in
          a graded coding quest, and an AI tutor explains, hints and debugs along the way.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <LinkButton href="/register">Create your player</LinkButton>
          <LinkButton href="/login" variant="secondary">
            I already play
          </LinkButton>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-center text-sm font-bold uppercase tracking-widest text-ink-muted">The quest loop</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LOOP.map((item) => (
            <Card key={item.step}>
              <p className="text-xs font-black tracking-widest text-accent-soft">{item.step}</p>
              <p className="mt-1 text-sm text-ink-muted">{item.text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-center text-sm font-bold uppercase tracking-widest text-ink-muted">Courses in the game</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {courses.map((course) => (
            <Card key={course.id}>
              <p className="text-2xl" aria-hidden>
                {course.icon}
              </p>
              <p className="mt-1 font-bold">{course.title}</p>
              <p className="mt-1 text-xs text-ink-muted">{course.description}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
