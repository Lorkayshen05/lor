import { FolderGit2, ExternalLink, Trash2, Rocket } from "lucide-react";
import { getOrCreateDemoUser } from "@/lib/user";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader } from "@/components/Card";
import { addProject, updateProjectStatus, deleteProject } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  planning: "bg-muted/20 text-muted",
  in_progress: "bg-xp/15 text-xp",
  done: "bg-success/15 text-success",
};
const STATUS_LABEL: Record<string, string> = { planning: "Planning", in_progress: "In Progress", done: "Done" };

export default async function ProjectsPage() {
  const user = await getOrCreateDemoUser();
  const projects = await prisma.project.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Rocket className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted">Track your AI projects from idea to shipped.</p>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardHeader
              title={project.title}
              right={
                <form action={deleteProject}>
                  <input type="hidden" name="id" value={project.id} />
                  <button className="rounded-lg p-1.5 text-muted hover:text-danger" aria-label="Delete project">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              }
            />
            <p className="mb-3 text-sm text-muted">{project.description}</p>

            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[project.status]}`}>
                {STATUS_LABEL[project.status]}
              </span>
              {project.githubUrl && (
                <a href={project.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <FolderGit2 className="h-3.5 w-3.5" /> Repository
                </a>
              )}
              {project.demoUrl && (
                <a href={project.demoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" /> Live Demo
                </a>
              )}
            </div>

            <form action={updateProjectStatus} className="flex items-center gap-2">
              <input type="hidden" name="id" value={project.id} />
              <select
                name="status"
                defaultValue={project.status}
                className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-xs text-foreground"
              >
                <option value="planning">Planning</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
              <button className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground hover:border-primary/50">
                Update Status
              </button>
            </form>
          </Card>
        ))}
        {projects.length === 0 && <p className="text-sm text-muted">No projects yet — add your first one below.</p>}
      </div>

      <Card>
        <CardHeader title="Add a Project" />
        <form action={addProject} className="grid gap-3 sm:grid-cols-2">
          <input
            name="title"
            required
            placeholder="Project title…"
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary sm:col-span-2"
          />
          <textarea
            name="description"
            placeholder="What does it do?"
            className="h-20 resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary sm:col-span-2"
          />
          <input
            name="githubUrl"
            placeholder="GitHub URL (optional)"
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <input
            name="demoUrl"
            placeholder="Demo URL (optional)"
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-2 sm:col-span-2">
            Add Project
          </button>
        </form>
      </Card>
    </div>
  );
}
