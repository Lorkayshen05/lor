import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getCourseList } from "@/server/quests";
import { getCourseMastery } from "@/server/stats";
import { Card, ProgressBar, SectionTitle } from "@/components/ui";

export default async function CoursesPage() {
  const user = await requireUser("/courses");
  const [courses, mastery] = await Promise.all([getCourseList(), getCourseMastery(user.id)]);
  const byId = new Map(mastery.map((entry) => [entry.id, entry]));

  return (
    <div className="space-y-5">
      <SectionTitle title="Courses" subtitle="Follow the roadmap top to bottom, or jump to what your syllabus needs." />

      <div className="grid gap-4 sm:grid-cols-2">
        {courses.map((course) => {
          const stats = byId.get(course.id);
          const lessons = course.modules.reduce((sum, item) => sum + item.lessons.length, 0);
          return (
            <Card key={course.id}>
              <Link href={`/courses/${course.id}`} className="block">
                <div className="flex items-start gap-3">
                  <span className="text-3xl" aria-hidden>
                    {course.icon}
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-bold">{course.title}</h2>
                    <p className="text-sm text-ink-muted">{course.description}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <ProgressBar percent={stats?.percent ?? 0} />
                  <p className="text-xs text-ink-muted">
                    {stats?.completed ?? 0}/{stats?.total ?? 0} quests · {course.modules.length} modules · {lessons} lessons
                    {stats && stats.completed > 0 ? ` · mastery ${stats.mastery}%` : ""}
                  </p>
                </div>
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
