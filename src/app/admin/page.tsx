import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { deleteCourseAction, deleteQuestAction, setUserRoleAction } from "@/app/actions/admin";
import { CourseForm, QuestForm } from "@/components/forms/admin-forms";
import { Badge, Button, DifficultyBadge, SectionTitle, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdmin();

  const [courses, lessons, quests, users, counts] = await Promise.all([
    prisma.course.findMany({ orderBy: { order: "asc" }, include: { _count: { select: { modules: true } } } }),
    prisma.lesson.findMany({
      orderBy: [{ module: { course: { order: "asc" } } }, { module: { order: "asc" } }, { order: "asc" }],
      select: { id: true, title: true, module: { select: { title: true, course: { select: { title: true } } } } },
    }),
    prisma.quest.findMany({
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, title: true, difficulty: true, xp: true, lesson: { select: { title: true } } },
    }),
    prisma.user.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, username: true, email: true, role: true, xp: true } }),
    prisma.$transaction([prisma.quest.count(), prisma.submission.count(), prisma.progress.count({ where: { status: "COMPLETED" } })]),
  ]);

  return (
    <div className="space-y-6">
      <SectionTitle title="Admin" subtitle={`Signed in as ${admin.username}`} />

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Courses" value={courses.length} />
        <Stat label="Quests" value={counts[0]} />
        <Stat label="Submissions" value={counts[1]} />
        <Stat label="Quests cleared" value={counts[2]} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CourseForm />
        <QuestForm
          lessons={lessons.map((lesson) => ({
            id: lesson.id,
            label: `${lesson.module.course.title} › ${lesson.module.title} › ${lesson.title}`,
          }))}
        />
      </div>

      <section>
        <SectionTitle title="Courses" />
        <ul className="space-y-2">
          {courses.map((course) => (
            <li key={course.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line/60 bg-surface-2/60 px-3 py-2">
              <span aria-hidden>{course.icon}</span>
              <Link href={`/courses/${course.id}`} className="font-medium hover:text-accent-soft">
                {course.title}
              </Link>
              <Badge>{course.slug}</Badge>
              <Badge>{course._count.modules} modules</Badge>
              {!course.published ? <Badge className="text-danger">hidden</Badge> : null}
              <form action={deleteCourseAction} className="ml-auto">
                <input type="hidden" name="id" value={course.id} />
                <Button variant="danger" type="submit" className="px-3 py-1 text-xs">
                  Delete
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle title="Recently updated quests" />
        <ul className="space-y-2">
          {quests.map((quest) => (
            <li key={quest.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line/60 bg-surface-2/60 px-3 py-2">
              <Link href={`/quest/${quest.id}`} className="font-medium hover:text-accent-soft">
                {quest.title}
              </Link>
              <DifficultyBadge difficulty={quest.difficulty} />
              <Badge className="text-xp">+{quest.xp} XP</Badge>
              <span className="text-xs text-ink-muted">{quest.lesson.title}</span>
              <form action={deleteQuestAction} className="ml-auto">
                <input type="hidden" name="id" value={quest.id} />
                <Button variant="danger" type="submit" className="px-3 py-1 text-xs">
                  Delete
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle title="Players" subtitle="Promote a teammate to admin or demote them." />
        <ul className="space-y-2">
          {users.map((user) => (
            <li key={user.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line/60 bg-surface-2/60 px-3 py-2">
              <span className="font-medium">{user.username}</span>
              <span className="text-xs text-ink-muted">{user.email}</span>
              <Badge className={user.role === "ADMIN" ? "text-xp" : ""}>{user.role}</Badge>
              <span className="text-xs text-ink-muted">{user.xp} XP</span>
              {user.id !== admin.id ? (
                <form action={setUserRoleAction} className="ml-auto flex items-center gap-2">
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="role" value={user.role === "ADMIN" ? "USER" : "ADMIN"} />
                  <Button variant="secondary" type="submit" className="px-3 py-1 text-xs">
                    {user.role === "ADMIN" ? "Demote" : "Make admin"}
                  </Button>
                </form>
              ) : (
                <span className="ml-auto text-xs text-ink-muted">you</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
