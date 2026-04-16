import { createClient } from "@/lib/supabase-client"
import type { Database } from "@/lib/supabase-types"
import type { User } from "@supabase/supabase-js"

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

export type AccountOverviewData = {
  user: User
  profile: ProfileRow | null
}

/** Typed access to auth user_metadata (works when public.profiles has few or no extra columns). */
export function userMetaString(
  user: User,
  key: "full_name" | "phone" | "job_title" | "company" | "location" | "role" | "plan"
): string {
  const v = (user.user_metadata as Record<string, unknown>)?.[key]
  return typeof v === "string" ? v : ""
}

export async function fetchAccountOverview(): Promise<AccountOverviewData> {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!user) throw new Error("Not signed in")

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.warn("[account-overview] profiles table:", profileError.message)
    return { user, profile: null }
  }

  return { user, profile }
}

export function displayName(user: User, profile: ProfileRow | null): string {
  const metaName = userMetaString(user, "full_name")
  return (
    profile?.full_name?.trim() ||
    metaName.trim() ||
    user.email?.split("@")[0]?.trim() ||
    "User"
  )
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function formatMonthYear(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

export function formatMediumDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
