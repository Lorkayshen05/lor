"use client";

import { useActionState } from "react";
import { upsertCourseAction, upsertQuestAction, type AdminState } from "@/app/actions/admin";
import { Button, Card, Field, inputClass } from "@/components/ui";

const EMPTY: AdminState = {};

export function CourseForm() {
  const [state, action, pending] = useActionState(upsertCourseAction, EMPTY);

  return (
    <Card>
      <h2 className="font-bold">Create / update course</h2>
      <p className="text-xs text-ink-muted">Matching on slug — an existing slug updates that course.</p>
      <form action={action} className="mt-3 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Slug" name="slug" error={state.fieldErrors?.slug}>
            <input id="slug" name="slug" required className={inputClass} placeholder="reinforcement-learning" />
          </Field>
          <Field label="Title" name="title" error={state.fieldErrors?.title}>
            <input id="title" name="title" required className={inputClass} />
          </Field>
        </div>
        <Field label="Description" name="description" error={state.fieldErrors?.description}>
          <textarea id="description" name="description" required rows={2} className={inputClass} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Icon" name="icon" error={state.fieldErrors?.icon}>
            <input id="icon" name="icon" defaultValue="🎯" className={inputClass} />
          </Field>
          <Field label="Order" name="order" error={state.fieldErrors?.order}>
            <input id="order" name="order" type="number" min={0} defaultValue={0} className={inputClass} />
          </Field>
          <Field label="Published" name="published">
            <select id="published" name="published" defaultValue="true" className={inputClass}>
              <option value="true">Published</option>
              <option value="false">Hidden</option>
            </select>
          </Field>
        </div>
        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-success">{state.success}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save course"}
        </Button>
      </form>
    </Card>
  );
}

export function QuestForm({ lessons }: { lessons: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState(upsertQuestAction, EMPTY);

  return (
    <Card>
      <h2 className="font-bold">Create / update quest</h2>
      <p className="text-xs text-ink-muted">Matching on lesson + slug. Test cases are managed in the seed content.</p>
      <form action={action} className="mt-3 space-y-3">
        <Field label="Lesson" name="lessonId" error={state.fieldErrors?.lessonId}>
          <select id="lessonId" name="lessonId" required className={inputClass}>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Slug" name="slug" error={state.fieldErrors?.slug}>
            <input id="slug" name="slug" required className={inputClass} placeholder="list-comprehensions" />
          </Field>
          <Field label="Title" name="title" error={state.fieldErrors?.title}>
            <input id="title" name="title" required className={inputClass} />
          </Field>
        </div>

        <Field label="Description" name="description" error={state.fieldErrors?.description}>
          <input id="description" name="description" required className={inputClass} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Difficulty" name="difficulty" error={state.fieldErrors?.difficulty}>
            <select id="difficulty" name="difficulty" defaultValue="EASY" className={inputClass}>
              <option value="EASY">Easy (10)</option>
              <option value="MEDIUM">Medium (20)</option>
              <option value="HARD">Hard (40)</option>
              <option value="BOSS">Boss (100)</option>
            </select>
          </Field>
          <Field label="Concept" name="concept" error={state.fieldErrors?.concept}>
            <input id="concept" name="concept" required className={inputClass} />
          </Field>
          <Field label="XP" name="xp" error={state.fieldErrors?.xp}>
            <input id="xp" name="xp" type="number" min={0} defaultValue={10} className={inputClass} />
          </Field>
          <Field label="Order" name="order" error={state.fieldErrors?.order}>
            <input id="order" name="order" type="number" min={0} defaultValue={0} className={inputClass} />
          </Field>
        </div>

        <Field label="Instructions" name="instructions" error={state.fieldErrors?.instructions}>
          <textarea id="instructions" name="instructions" required rows={4} className={`${inputClass} font-mono`} />
        </Field>
        <Field label="Expected behaviour" name="expectedBehavior" error={state.fieldErrors?.expectedBehavior}>
          <input id="expectedBehavior" name="expectedBehavior" required className={inputClass} />
        </Field>
        <Field label="Starter code" name="starterCode" error={state.fieldErrors?.starterCode}>
          <textarea id="starterCode" name="starterCode" rows={4} className={`${inputClass} font-mono`} />
        </Field>
        <Field label="Hints" name="hints" hint="One hint per line." error={state.fieldErrors?.hints}>
          <textarea id="hints" name="hints" rows={3} className={inputClass} />
        </Field>
        <Field label="Solution" name="solution" error={state.fieldErrors?.solution}>
          <textarea id="solution" name="solution" rows={4} className={`${inputClass} font-mono`} />
        </Field>

        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-success">{state.success}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save quest"}
        </Button>
      </form>
    </Card>
  );
}
