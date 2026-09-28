import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

/**
 * Supabase client bound to the current request's cookies. Use this in
 * Server Components, Server Actions, and Route Handlers so RLS policies see
 * the signed-in admin's session.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component without the ability to set
          // cookies (e.g. during static rendering). Session refresh is
          // still handled by proxy.ts, so this can be safely ignored.
        }
      },
    },
  });
}
