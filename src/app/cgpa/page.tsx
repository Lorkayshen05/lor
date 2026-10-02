import { redirect } from "next/navigation";
import { GraduationCap, Trash2, AlertTriangle, Clock } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/db";
import { subjects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardHeader } from "@/components/ui/Card";
import { scoreToGrade, GRADE_BANDS } from "@/content/gradeBands";
import { predictedScore, predictedCgpa } from "@/lib/cgpaCalc";
import { MaterialExtractor } from "@/components/cgpa/MaterialExtractor";
import { addSubject, deleteSubject, addTask, updateTaskScore, deleteTask } from "./actions";

const TYPE_LABEL: Record<string, string> = { assignment: "Assignment", exam: "Exam", revision: "Revision" };

function daysUntil(dateStr: string) {
  const ms = new Date(dateStr + "T00:00:00").getTime() - new Date(new Date().toDateString()).getTime();
  return Math.round(ms / 86_400_000);
}

export default async function CgpaPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const subjectRows = await db.query.subjects.findMany({
    where: eq(subjects.userId, sessionUser.id),
    orderBy: (s, { asc }) => asc(s.name),
    with: { studyTasks: { orderBy: (t, { asc }) => asc(t.dueDate) } },
  });

  const cgpa = predictedCgpa(subjectRows.map((s) => ({ credits: s.credits, tasks: s.studyTasks })));

  const allTasks = subjectRows.flatMap((s) => s.studyTasks.map((t) => ({ ...t, subjectName: s.name })));
  const upcoming = allTasks.filter((t) => t.status !== "done" && t.dueDate && daysUntil(t.dueDate) >= 0 && daysUntil(t.dueDate) <= 14);
  const overdue = allTasks.filter((t) => t.status !== "done" && t.dueDate && daysUntil(t.dueDate) < 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">CGPA Tracker</h1>
          <p className="text-sm text-muted">Subjects, exam prep, deadlines, and weak areas — in one place.</p>
        </div>
        <div className="ml-auto rounded-xl border border-border bg-surface-2 px-4 py-2 text-right">
          <div className="text-xs text-muted">Predicted CGPA</div>
          <div className="text-xl font-bold text-foreground">{cgpa !== null ? cgpa.toFixed(2) : "—"}</div>
        </div>
      </div>

      {(overdue.length > 0 || upcoming.length > 0) && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {overdue.length > 0 && (
            <Card className="border-danger/30 bg-danger/5">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-danger">
                <AlertTriangle className="h-4 w-4" /> Overdue
              </div>
              <ul className="space-y-1 text-sm text-foreground">
                {overdue.map((t) => (
                  <li key={t.id}>
                    {t.title} <span className="text-xs text-muted">({t.subjectName})</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {upcoming.length > 0 && (
            <Card className="border-xp/30 bg-xp/5">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-xp">
                <Clock className="h-4 w-4" /> Due in the next 14 days
              </div>
              <ul className="space-y-1 text-sm text-foreground">
                {upcoming.map((t) => (
                  <li key={t.id}>
                    {t.title} <span className="text-xs text-muted">({t.subjectName}, {daysUntil(t.dueDate!)}d)</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {subjectRows.map((subject) => {
            const score = predictedScore(subject.studyTasks);
            const grade = score !== null ? scoreToGrade(score) : null;
            const targetBand = GRADE_BANDS.find((b) => b.letter === subject.targetGrade);
            const isWeak = grade !== null && targetBand !== undefined && grade.gpa < targetBand.gpa;

            return (
              <Card key={subject.id}>
                <CardHeader
                  title={`${subject.code} · ${subject.name}`}
                  subtitle={`${subject.credits} credits · Target ${subject.targetGrade}${isWeak ? " · tracking below target" : ""}`}
                  right={
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-foreground">
                        {score !== null ? `${score.toFixed(0)}% · ${grade!.letter}` : "No scores yet"}
                      </span>
                      <form action={deleteSubject}>
                        <input type="hidden" name="id" value={subject.id} />
                        <button className="rounded-lg p-1.5 text-muted hover:text-danger" aria-label="Delete subject">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  }
                />

                <div className="space-y-1.5">
                  {subject.studyTasks.map((task) => (
                    <div key={task.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
                      <span className="flex-1 text-foreground">{task.title}</span>
                      <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">{TYPE_LABEL[task.kind]}</span>
                      <span className="text-xs text-muted">{task.weightPct}%</span>
                      {task.dueDate && <span className="text-xs text-muted">{task.dueDate}</span>}
                      <form action={updateTaskScore} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={task.id} />
                        <input
                          type="number"
                          name="score"
                          min={0}
                          max={100}
                          defaultValue={task.score ?? ""}
                          placeholder="score"
                          className="w-16 rounded border border-border bg-surface px-1.5 py-1 text-xs text-foreground"
                        />
                        <button className="rounded border border-border px-2 py-1 text-xs text-foreground hover:border-primary/50">Save</button>
                      </form>
                      <form action={deleteTask}>
                        <input type="hidden" name="id" value={task.id} />
                        <button className="text-muted hover:text-danger" aria-label="Delete task">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </div>
                  ))}
                  {subject.studyTasks.length === 0 && <p className="text-xs text-muted">No tasks yet.</p>}
                </div>

                <form action={addTask} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="subjectId" value={subject.id} />
                  <input name="title" required placeholder="Task title…" className="min-w-[140px] flex-1 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary" />
                  <select name="kind" className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-foreground">
                    <option value="assignment">Assignment</option>
                    <option value="exam">Exam</option>
                    <option value="revision">Revision</option>
                  </select>
                  <input name="weightPct" type="number" min={0} max={100} defaultValue={10} className="w-20 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-foreground" />
                  <input name="dueDate" type="date" className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-foreground" />
                  <button className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-2">Add</button>
                </form>
              </Card>
            );
          })}

          <Card>
            <CardHeader title="Add a Subject" />
            <form action={addSubject} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <input name="code" required placeholder="Code" className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
              <input name="name" required placeholder="Subject name" className="col-span-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary sm:col-span-2" />
              <input name="credits" type="number" min={1} max={10} defaultValue={3} className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground" />
              <select name="targetGrade" defaultValue="B+" className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground">
                {GRADE_BANDS.map((b) => (
                  <option key={b.letter} value={b.letter}>
                    {b.letter}
                  </option>
                ))}
              </select>
              <button className="col-span-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-2 sm:col-span-4">Add Subject</button>
            </form>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader title="Exam Prep Generator" subtitle="From your own material" />
            <MaterialExtractor />
          </Card>
        </div>
      </div>
    </div>
  );
}
