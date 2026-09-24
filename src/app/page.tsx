import Link from "next/link";
import { ArrowRight, Code2, Gamepad2, Languages, GraduationCap, Rocket, Zap } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { DifficultyTag } from "@/components/ui/DifficultyTag";

const PATH = ["Python", "NumPy", "Pandas", "Math + Statistics", "DSA + SQL", "Machine Learning", "Deep Learning", "GenAI / LLM", "AI Agents", "Projects"];

const FEATURES = [
  { icon: Code2, title: "Coding Quests", desc: "Write real Python in a browser sandbox, run it, and get instant test feedback." },
  { icon: Gamepad2, title: "Level Up", desc: "Earn XP, climb levels, keep your streak alive, and unlock 13 achievements." },
  { icon: Languages, title: "English Training", desc: "Listening, reading, vocabulary, and speaking practice built for technical English." },
  { icon: GraduationCap, title: "CGPA Tracker", desc: "Turn lecture slides and assignments into practice questions and exam prep." },
  { icon: Rocket, title: "Real Projects", desc: "Track AI projects from idea to shipped, with GitHub and demo links." },
  { icon: Zap, title: "AI Tutor", desc: "A tutor that makes you think first — explains mistakes instead of handing you answers." },
];

export default function Home() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-20 text-center">
        <span className="mb-4 inline-block rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
          Year 2 · Computer Science / Data Analytics
        </span>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Learn AI like a game. <span className="text-primary">Level up</span> for real.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Python to AI Agents, English fluency, and your CGPA — one quest at a time. Earn XP, build a streak, and ship real projects.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/register" className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-2">
            Start Your Quest <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/login" className="rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground hover:border-primary/50">
            I already have an account
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <Icon name="swords" className="h-3.5 w-3.5" /> Quest · Python Loop
            </span>
            <DifficultyTag difficulty="medium" />
          </div>
          <div className="mb-3 rounded-lg bg-surface-2 p-3 font-mono text-xs text-foreground">
            <div className="text-muted">def fizzbuzz(n):</div>
            <div className="pl-4">result = []</div>
            <div className="pl-4">for i in range(1, n + 1):</div>
            <div className="pl-8 text-muted"># your code here</div>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="rounded-lg border border-border px-3 py-1.5">Run</span>
            <span className="rounded-lg bg-primary px-3 py-1.5 text-white">Submit</span>
            <span className="rounded-lg border border-border px-3 py-1.5">Hint</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-muted">The Learning Path</h2>
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
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mb-1 font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 text-center">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-10">
          <Icon name="swords" className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h2 className="mb-2 text-2xl font-bold text-foreground">Ready to start your first quest?</h2>
          <p className="mx-auto mb-6 max-w-md text-sm text-muted">Create an account — your progress, streak, and next quest are waiting.</p>
          <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-2">
            Sign Up Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
