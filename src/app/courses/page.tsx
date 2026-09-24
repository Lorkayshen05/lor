import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getCoursesWithProgress } from "@/lib/queries";
import { CourseCard } from "@/components/game/CourseCard";

export default async function CoursesPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const courses = await getCoursesWithProgress(sessionUser.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Courses</h1>
        <p className="text-sm text-muted">The full path from Python to AI Agents.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            slug={course.slug}
            title={course.title}
            description={course.description}
            icon={course.icon}
            completedQuests={course.completedQuests}
            totalQuests={course.totalQuests}
          />
        ))}
      </div>
    </div>
  );
}
