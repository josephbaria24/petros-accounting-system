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
          // Server Components can only read cookies, not modify them
          // Cookie modifications should happen in Server Actions or Route Handlers
        },
        remove(name: string, options: any) {
          // Server Components can only read cookies, not modify them
        }
      }
    }
  );
}