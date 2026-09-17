"use client";

import { useActionState } from "react";
import { createProjectAction, updateProjectAction, type ProjectState } from "@/app/actions/projects";
import { Button, Card, Field, inputClass } from "@/components/ui";

const EMPTY: ProjectState = {};

export type ProjectValues = {
  id?: string;
  title: string;
  description: string;
  technology: string;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED";
  githubUrl: string;
  demoUrl: string;
  completion: number;
};

const BLANK: ProjectValues = {
  title: "",
  description: "",
  technology: "",
  status: "PLANNED",
  githubUrl: "",
  demoUrl: "",
  completion: 0,
};

export function ProjectForm({ project, onDone }: { project?: ProjectValues; onDone?: () => void }) {
  const editing = Boolean(project?.id);
  const [state, action, pending] = useActionState(editing ? updateProjectAction : createProjectAction, EMPTY);
  const values = project ?? BLANK;

  return (
    <Card>
      <h2 className="font-bold">{editing ? "Edit project" : "Add a project"}</h2>
      <form
        action={async (formData) => {
          await action(formData);
          onDone?.();
        }}
        className="mt-4 space-y-3"
      >
        {editing ? <input type="hidden" name="id" value={project?.id} /> : null}

        <Field label="Title" name="title" error={state.fieldErrors?.title}>
          <input id="title" name="title" defaultValue={values.title} required className={inputClass} />
        </Field>

        <Field label="Description" name="description" error={state.fieldErrors?.description}>
          <textarea id="description" name="description" defaultValue={values.description} required rows={3} className={inputClass} />
        </Field>

        <Field label="Technology" name="technology" error={state.fieldErrors?.technology} hint="Comma separated, e.g. Python, Pandas, scikit-learn">
          <input id="technology" name="technology" defaultValue={values.technology} className={inputClass} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Status" name="status" error={state.fieldErrors?.status}>
            <select id="status" name="status" defaultValue={values.status} className={inputClass}>
              <option value="PLANNED">Planned</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </Field>

          <Field label="Completion %" name="completion" error={state.fieldErrors?.completion}>
            <input id="completion" name="completion" type="number" min={0} max={100} defaultValue={values.completion} className={inputClass} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="GitHub URL" name="githubUrl" error={state.fieldErrors?.githubUrl}>
            <input id="githubUrl" name="githubUrl" type="url" defaultValue={values.githubUrl} className={inputClass} />
          </Field>
          <Field label="Demo URL" name="demoUrl" error={state.fieldErrors?.demoUrl}>
            <input id="demoUrl" name="demoUrl" type="url" defaultValue={values.demoUrl} className={inputClass} />
          </Field>
        </div>

        {state.error ? (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? <p className="text-sm text-success">{state.success}</p> : null}

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : editing ? "Save project" : "Add project"}
        </Button>
      </form>
    </Card>
  );
}
