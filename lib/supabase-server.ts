//lib\supabase-server.ts

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Route Handlers can set cookies; required for auth refresh flows.
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // ignore when running in a read-only cookies context
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // ignore when running in a read-only cookies context
          }
        }
      }
    }
  );
}