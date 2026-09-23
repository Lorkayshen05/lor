import Link from "next/link";
import { ArrowRight, Code2, Gamepad2, Languages, GraduationCap, Rocket, Zap } from "lucide-react";
import { Icon } from "@/components/Icon";

const PATH = [
  "Python", "NumPy", "Pandas", "Math + Statistics", "DSA + SQL",
  "Machine Learning", "Deep Learning", "GenAI / LLM", "AI Agents", "Projects",
];

const FEATURES = [
  { icon: Code2, title: "Coding Quests", desc: "Write real code in a live editor, run it, and get instant test feedback." },
  { icon: Gamepad2, title: "Level Up", desc: "Earn XP, climb levels, keep your streak alive, and unlock achievements." },
  { icon: Languages, title: "English Training", desc: "Reading, listening, vocabulary, and speaking practice built for technical English." },
  { icon: GraduationCap, title: "CGPA Tracker", desc: "Turn your lecture slides and assignments into practice questions and exam prep." },
  { icon: Rocket, title: "Real Projects", desc: "Track AI projects from idea to shipped, with GitHub and demo links." },
  { icon: Zap, title: "AI Tutor", desc: "A tutor that makes you think first — explains mistakes instead of handing you answers." },
];

export default function Home() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-20 text-center">
        <span className="mb-4 inline-block rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
          Bachelor Year 2 · AI Learning Platform
        </span>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Learn AI like a game. <span className="text-primary">Level up</span> for real.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Python to AI Agents, English fluency, and your CGPA — one quest at a time. Earn XP, build a streak,
          and ship real projects.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-2"
          >
            Start Your Quest <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/courses"
            className="rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/50"
          >
            Browse Courses
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-muted">
            The Learning Path
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {PATH.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <span className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-foreground">
                  {i + 1}. {step}
                </span>
                {i < PATH.length - 1 && <span className="text-muted">→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-surface p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-1 font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 text-center">
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-10">
          <Icon name="swords" className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h2 className="mb-2 text-2xl font-bold text-foreground">Ready to start your first quest?</h2>
          <p className="mx-auto mb-6 max-w-md text-sm text-muted">
            Jump into your dashboard — your progress, streak, and next quest are waiting.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-2"
          >
            Go to Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
