/**
 * PostgREST's `.or()`/`.filter()` builders take a raw filter-syntax string —
 * supabase-js does no escaping of it (see the `.or()` JSDoc in
 * @supabase/postgrest-js). Reserved characters in a value
 * (`,` `.` `(` `)` `:` `"` `\`) must be escaped or they get parsed as filter
 * syntax instead of literal text, e.g. a search for "猪肉, 新鲜" would
 * otherwise split into two bogus filter clauses. Wrapping the value in
 * double quotes, per PostgREST's own escaping convention, avoids that.
 */
export function escapePostgrestValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
