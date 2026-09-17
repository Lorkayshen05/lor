import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { deleteProjectAction } from "@/app/actions/projects";
import { ProjectForm } from "@/components/forms/project-form";
import { Badge, Button, Card, EmptyState, ProgressBar, SectionTitle } from "@/components/ui";

const STATUS_LABEL: Record<string, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

export default async function ProjectsPage() {
  const user = await requireUser("/projects");
  const projects = await prisma.project.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <SectionTitle title="Projects" subtitle="Portfolio pieces — the part of the course that gets you hired." />

        {projects.length === 0 ? (
          <EmptyState title="No projects yet" body="Add your first project to unlock the First Project achievement." />
        ) : (
          <ul className="space-y-3">
            {projects.map((project) => (
              <li key={project.id}>
                <Card>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">{project.title}</h3>
                    <Badge className={project.status === "COMPLETED" ? "text-success" : ""}>
                      {STATUS_LABEL[project.status]}
                    </Badge>
                    <form action={deleteProjectAction} className="ml-auto">
                      <input type="hidden" name="id" value={project.id} />
                      <Button variant="danger" type="submit" className="px-3 py-1 text-xs">
                        Delete
                      </Button>
                    </form>
                  </div>

                  <p className="mt-2 text-sm text-ink-muted">{project.description}</p>

                  {project.technology.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {project.technology.map((tech) => (
                        <Badge key={tech}>{tech}</Badge>
                      ))}
                    </div>
                  ) : null}

                  <ProgressBar percent={project.completion} className="mt-3" />
                  <p className="mt-1 text-xs text-ink-muted">{project.completion}% complete</p>

                  <div className="mt-2 flex gap-3 text-xs">
                    {project.githubUrl ? (
                      <a href={project.githubUrl} className="text-accent-soft underline" target="_blank" rel="noreferrer">
                        GitHub
                      </a>
                    ) : null}
                    {project.demoUrl ? (
                      <a href={project.demoUrl} className="text-accent-soft underline" target="_blank" rel="noreferrer">
                        Live demo
                      </a>
                    ) : null}
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink">Edit</summary>
                    <div className="mt-3">
                      <ProjectForm
                        project={{
                          id: project.id,
                          title: project.title,
                          description: project.description,
                          technology: project.technology.join(", "),
                          status: project.status,
                          githubUrl: project.githubUrl ?? "",
                          demoUrl: project.demoUrl ?? "",
                          completion: project.completion,
                        }}
                      />
                    </div>
                  </details>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside>
        <ProjectForm />
      </aside>
    </div>
  );
}
