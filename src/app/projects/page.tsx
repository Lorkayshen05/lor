import { redirect } from "next/navigation";
import { FolderGit2, ExternalLink, Trash2, Rocket } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardHeader } from "@/components/ui/Card";
import { addProject, updateProjectStatus, deleteProject } from "./actions";

const COLUMNS = [
  { status: "idea" as const, label: "Idea" },
  { status: "building" as const, label: "Building" },
  { status: "shipped" as const, label: "Shipped" },
];

export default async function ProjectsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const rows = await db.query.projects.findMany({ where: eq(projects.userId, sessionUser.id), orderBy: (p, { desc }) => desc(p.createdAt) });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Rocket className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted">Track your AI projects from idea to shipped.</p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {COLUMNS.map((col) => (
          <div key={col.status}>
            <h2 className="mb-2 text-sm font-semibold text-muted">
              {col.label} ({rows.filter((p) => p.status === col.status).length})
            </h2>
            <div className="space-y-3">
              {rows
                .filter((p) => p.status === col.status)
                .map((project) => (
                  <Card key={project.id} className="p-4">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <h3 className="font-medium text-foreground">{project.title}</h3>
                      <form action={deleteProject}>
                        <input type="hidden" name="id" value={project.id} />
                        <button className="text-muted hover:text-danger" aria-label="Delete project">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </div>
                    {project.description && <p className="mb-2 text-xs text-muted">{project.description}</p>}
                    {project.skills.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {project.skills.map((s) => (
                          <span key={s} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mb-2 flex flex-wrap gap-2 text-xs">
                      {project.githubUrl && (
                        <a href={project.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                          <FolderGit2 className="h-3.5 w-3.5" /> Repo
                        </a>
                      )}
                      {project.demoUrl && (
                        <a href={project.demoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                          <ExternalLink className="h-3.5 w-3.5" /> Demo
                        </a>
                      )}
                    </div>
                    <form action={updateProjectStatus} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={project.id} />
                      <select name="status" defaultValue={project.status} className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs text-foreground">
                        <option value="idea">Idea</option>
                        <option value="building">Building</option>
                        <option value="shipped">Shipped</option>
                      </select>
                      <button className="rounded-lg border border-border px-2 py-1 text-xs text-foreground hover:border-primary/50">Move</button>
                    </form>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader title="Add a Project" />
        <form action={addProject} className="grid gap-3 sm:grid-cols-2">
          <input name="title" required placeholder="Project title…" className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary sm:col-span-2" />
          <textarea name="description" placeholder="What does it do?" className="h-20 resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary sm:col-span-2" />
          <input name="skills" placeholder="Skills, comma separated" className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary sm:col-span-2" />
          <input name="githubUrl" placeholder="GitHub URL (optional)" className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
          <input name="demoUrl" placeholder="Demo URL (optional)" className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-2 sm:col-span-2">Add Project</button>
        </form>
      </Card>
    </div>
  );
}
