import { CheckSquare, Square, Trash2, GraduationCap } from "lucide-react";
import { getOrCreateDemoUser } from "@/lib/user";
import { prisma } from "@/lib/prisma";
import { getWeakTopics } from "@/lib/queries";
import { Card, CardHeader } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { StudyMaterialGenerator } from "@/components/StudyMaterialGenerator";
import {
  addSubject,
  deleteSubject,
  updateSubjectProgress,
  addStudyTask,
  toggleStudyTask,
  deleteStudyTask,
} from "./actions";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = { assignment: "Assignment", exam: "Exam", reading: "Reading" };

export default async function CgpaPage() {
  const user = await getOrCreateDemoUser();
  const [subjects, weakTopics] = await Promise.all([
    prisma.subject.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      include: { studyTasks: { orderBy: { dueDate: "asc" } } },
    }),
    getWeakTopics(user.id),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">CGPA Tracker</h1>
          <p className="text-sm text-muted">Subjects, assignments, exam prep, and weak areas — in one place.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {subjects.map((subject) => (
            <Card key={subject.id}>
              <CardHeader
                title={subject.name}
                subtitle={`Target CGPA: ${subject.targetCgpa.toFixed(1)}`}
                right={
                  <form action={deleteSubject}>
                    <input type="hidden" name="id" value={subject.id} />
                    <button className="rounded-lg p-1.5 text-muted hover:text-danger" aria-label="Delete subject">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                }
              />

              <div className="mb-4">
                <ProgressBar value={subject.progress} max={100} color="success" label="Study Progress" />
                <form action={updateSubjectProgress} className="mt-2 flex items-center gap-2">
                  <input type="hidden" name="id" value={subject.id} />
                  <input
                    type="range"
                    name="progress"
                    min={0}
                    max={100}
                    defaultValue={subject.progress}
                    className="flex-1 accent-primary"
                  />
                  <button className="rounded-lg border border-border px-2 py-1 text-xs text-foreground hover:border-primary/50">
                    Update
                  </button>
                </form>
              </div>

              <div className="space-y-1.5">
                {subject.studyTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
                    <form action={toggleStudyTask}>
                      <input type="hidden" name="id" value={task.id} />
                      <input type="hidden" name="done" value={String(task.done)} />
                      <button type="submit" aria-label="Toggle done">
                        {task.done ? <CheckSquare className="h-4 w-4 text-success" /> : <Square className="h-4 w-4 text-muted" />}
                      </button>
                    </form>
                    <span className={`flex-1 ${task.done ? "text-muted line-through" : "text-foreground"}`}>{task.title}</span>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">{TYPE_LABEL[task.type]}</span>
                    {task.dueDate && (
                      <span className="text-xs text-muted">{new Date(task.dueDate).toLocaleDateString()}</span>
                    )}
                    <form action={deleteStudyTask}>
                      <input type="hidden" name="id" value={task.id} />
                      <button type="submit" aria-label="Delete task" className="text-muted hover:text-danger">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </div>
                ))}
                {subject.studyTasks.length === 0 && <p className="text-xs text-muted">No tasks yet.</p>}
              </div>

              <form action={addStudyTask} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="subjectId" value={subject.id} />
                <input
                  name="title"
                  required
                  placeholder="New task title…"
                  className="min-w-[160px] flex-1 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                />
                <select name="type" className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-foreground">
                  <option value="assignment">Assignment</option>
                  <option value="exam">Exam</option>
                  <option value="reading">Reading</option>
                </select>
                <input type="date" name="dueDate" className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-foreground" />
                <button className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-2">Add</button>
              </form>
            </Card>
          ))}

          <Card>
            <CardHeader title="Add a Subject" />
            <form action={addSubject} className="flex flex-wrap gap-2">
              <input
                name="name"
                required
                placeholder="Subject name…"
                className="min-w-[200px] flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              <input
                name="targetCgpa"
                type="number"
                step="0.1"
                min="0"
                max="4"
                defaultValue={3.7}
                className="w-24 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-2">Add Subject</button>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Weak Topics" subtitle="From quests & English practice" />
            {weakTopics.length === 0 ? (
              <p className="text-sm text-muted">Nothing tracked yet.</p>
            ) : (
              <ul className="space-y-2">
                {weakTopics.map((m) => (
                  <li key={m.id} className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">{m.topic}</span>
                      <span className="text-xs text-danger">{m.count}x</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted line-clamp-1">{m.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Exam Prep Generator" subtitle="From your own material" />
            <StudyMaterialGenerator />
          </Card>
        </div>
      </div>
    </div>
  );
}
