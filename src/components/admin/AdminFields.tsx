import { Field } from "@/components/forms";
import { toMytInput } from "@/lib/admin/engine";
import { relationOptions, type FieldDef, type Option } from "@/lib/admin/resources";

type Row = Record<string, unknown> | null;

function initial(f: FieldDef, row: Row, defaults: Record<string, unknown> | undefined): string {
  const v = row ? row[f.name] : defaults?.[f.name];
  if (v == null) return "";
  switch (f.type) {
    case "money": return typeof v === "number" ? String(v / 100) : "";
    case "datetime": return toMytInput(v);
    case "json": return JSON.stringify(v, null, 2);
    default: return String(v);
  }
}

/** Renders inputs for a resource's whitelisted fields. Pure HTML: the parent <ActionForm> handles submit/state. */
export async function AdminFields({ fields, row, defaults }: { fields: FieldDef[]; row: Row; defaults?: Record<string, unknown> }) {
  const relCache = new Map<string, Option[]>();
  const optionsFor = async (f: FieldDef): Promise<Option[]> => {
    if (f.options) return f.options;
    if (!f.relation) return [];
    if (!relCache.has(f.relation)) relCache.set(f.relation, await relationOptions(f.relation));
    return relCache.get(f.relation)!;
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {await Promise.all(fields.map(async (f) => {
        const value = initial(f, row, defaults);
        const wide = f.type === "textarea" || f.type === "json" || f.type === "multirelation";
        const id = `f-${f.name}`;
        let input: React.ReactNode;
        if (f.type === "textarea" || f.type === "json") {
          input = <textarea id={id} name={f.name} className={`input ${f.type === "json" ? "font-mono text-sm" : ""}`} rows={f.type === "json" ? 6 : 4} defaultValue={value} />;
        } else if (f.type === "boolean") {
          const checked = row ? !!row[f.name] : !!defaults?.[f.name];
          return (
            <div key={f.name} className="flex items-center gap-2 sm:col-span-2">
              <input id={id} name={f.name} type="checkbox" defaultChecked={checked} className="size-5" />
              <label htmlFor={id} className="text-sm font-semibold">{f.label}</label>
            </div>
          );
        } else if (f.type === "select" || f.type === "relation") {
          const options = await optionsFor(f);
          input = (
            <select id={id} name={f.name} className="input" defaultValue={value}>
              {!f.required && <option value="">—</option>}
              {f.required && !value && <option value="" disabled>Select…</option>}
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          );
        } else if (f.type === "multirelation") {
          const options = await optionsFor(f);
          const selected = new Set(((row?.[f.name] as { id: string }[] | undefined) ?? []).map((x) => x.id));
          input = (
            <div className="flex flex-wrap gap-3 rounded-lg border border-line bg-white p-3">
              {options.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-sm"><input type="checkbox" name={f.name} value={o.value} defaultChecked={selected.has(o.value)} className="size-4" />{o.label}</label>
              ))}
            </div>
          );
        } else {
          const type = f.type === "datetime" ? "datetime-local" : f.type === "int" || f.type === "float" ? "number" : f.type === "url" ? "url" : "text";
          input = <input id={id} name={f.name} type={type} step={f.type === "float" ? "any" : f.type === "money" ? "0.01" : undefined} inputMode={f.type === "money" ? "decimal" : undefined} className="input" defaultValue={value} maxLength={f.max} />;
        }
        return (
          <div key={f.name} className={wide ? "sm:col-span-2" : ""}>
            <Field label={f.label + (f.required ? " *" : "")} name={id} hint={f.help}>{input}</Field>
          </div>
        );
      }))}
    </div>
  );
}
