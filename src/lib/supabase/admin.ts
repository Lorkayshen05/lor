import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { SUPABASE_DB_OPTIONS, getSupabaseUrl } from "./env";

/**
 * Service-role client that bypasses Row Level Security. Server-only: never
 * import this from a Client Component, and never expose
 * SUPABASE_SERVICE_ROLE_KEY via a NEXT_PUBLIC_ variable.
 *
 * Used narrowly for the public checkout flow, where an anonymous customer
 * must be able to create an order without an authenticated session.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your environment to enable checkout."
    );
  }

  return createSupabaseClient<Database>(getSupabaseUrl(), serviceRoleKey, {
    db: SUPABASE_DB_OPTIONS,
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
