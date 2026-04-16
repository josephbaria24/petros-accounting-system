"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { createClient } from "@/lib/supabase-client"
import {
  fetchAccountOverview,
  displayName,
  initialsFromName,
  formatMonthYear,
  formatMediumDate,
  formatDateTime,
  userMetaString,
} from "@/lib/fetch-account-overview"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  User,
  Mail,
  Shield,
  CreditCard,
  Clock,
  Globe,
  Bell,
  Lock,
  Smartphone,
  Eye,
  Download,
  Settings,
  Key,
  Monitor,
  MapPin,
  Calendar,
  CheckCircle2,
  Check,
  Pencil,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowUpRight,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const ACCOUNT_ROLE_PRESETS = [
  { value: "admin", label: "Administrator" },
  { value: "manager", label: "Manager" },
  { value: "accountant", label: "Accountant" },
  { value: "sales", label: "Sales" },
  { value: "user", label: "User" },
] as const

type AccountRolePreset = (typeof ACCOUNT_ROLE_PRESETS)[number]["value"]

const ROLE_SYNONYMS: Record<string, AccountRolePreset> = {
  admin: "admin",
  administrator: "admin",
  manager: "manager",
  accountant: "accountant",
  accounting: "accountant",
  sales: "sales",
  user: "user",
}

function normalizeAccountRole(raw: string | null | undefined): string {
  if (!raw?.trim()) return "user"
  const key = raw.trim().toLowerCase()
  if (key in ROLE_SYNONYMS) return ROLE_SYNONYMS[key]
  if (ACCOUNT_ROLE_PRESETS.some((p) => p.value === key)) return key as AccountRolePreset
  return raw.trim().toLowerCase()
}

function roleOptionLabel(value: string): string {
  const preset = ACCOUNT_ROLE_PRESETS.find((p) => p.value === value)
  return preset?.label ?? (value ? value.charAt(0).toUpperCase() + value.slice(1) : "—")
}

export default function Overview() {
  const { toast } = useToast()
  const profileSectionRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState("settings")
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingRole, setSavingRole] = useState(false)
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    jobTitle: "",
    company: "",
    location: "",
    role: "user",
  })

  const { data, error, isLoading, mutate } = useSWR(
    "account-overview",
    fetchAccountOverview,
    { revalidateOnFocus: true, dedupingInterval: 60_000, keepPreviousData: true }
  )

  useEffect(() => {
    if (!data) return
    const { user, profile } = data
    setForm({
      fullName: displayName(user, profile),
      email: user.email ?? "",
      phone: profile?.phone ?? userMetaString(user, "phone"),
      jobTitle: profile?.job_title ?? userMetaString(user, "job_title"),
      company: profile?.company ?? userMetaString(user, "company"),
      location: profile?.location ?? userMetaString(user, "location"),
      // Prefer Auth user metadata (we write role there), fall back to profiles.role if needed.
      role: normalizeAccountRole(userMetaString(user, "role") || profile?.role),
    })
  }, [data])

  const handleSaveProfile = async () => {
    if (!data?.user) return
    setSavingProfile(true)
    try {
      const supabase = createClient()
      const { data: updated, error: authErr } = await supabase.auth.updateUser({
        data: {
          full_name: form.fullName.trim() || undefined,
          phone: form.phone.trim() || undefined,
          job_title: form.jobTitle.trim() || undefined,
          company: form.company.trim() || undefined,
          location: form.location.trim() || undefined,
          role: form.role.trim() || undefined,
        },
      })
      if (authErr) throw authErr

      if (updated.user) {
        // Update SWR cache immediately to avoid UI "snapping back" while auth metadata propagates.
        mutate({ user: updated.user, profile: data.profile }, { revalidate: false })
      }
      toast({
        title: "Profile saved",
        description: "Saved to your Supabase Auth user profile (user metadata).",
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Update failed."
      toast({
        title: "Could not save",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleRoleChange = async (next: string) => {
    if (!data?.user) return
    const prev = form.role
    setForm((f) => ({ ...f, role: next }))
    setSavingRole(true)
    try {
      const supabase = createClient()
      const { data: updated, error: authErr } = await supabase.auth.updateUser({
        data: { role: next.trim() || undefined },
      })
      if (authErr) throw authErr
      if (updated.user) {
        mutate({ user: updated.user, profile: data.profile }, { revalidate: false })
      }
      toast({
        title: "Role updated",
        description: "Saved to your Supabase Auth user metadata.",
      })
    } catch (e: unknown) {
      setForm((f) => ({ ...f, role: prev }))
      const msg = e instanceof Error ? e.message : "Update failed."
      toast({
        title: "Could not update role",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setSavingRole(false)
    }
  }

  const handleEditProfileClick = () => {
    setActiveTab("settings")
    window.setTimeout(() => {
      profileSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 80)
  }

  if (isLoading && !data) {
    return (
      <div className="min-h-[70vh] bg-linear-to-b from-slate-50/90 via-white to-emerald-50/15">
        <div className="mx-auto max-w-7xl space-y-8 px-3 py-10 sm:px-4 lg:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <Skeleton className="h-8 w-56 rounded-lg" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-3xl" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
          <Skeleton className="h-12 w-full max-w-xl rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-3xl" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-[50vh] bg-linear-to-b from-slate-50/90 to-white px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-xl">
          <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-6 shadow-sm flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-destructive">Could not load account</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {error instanceof Error ? error.message : "Sign in again or check your Supabase connection."}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { user, profile } = data
  const name = displayName(user, profile)
  const initials = initialsFromName(name)
  const lastSignIn =
    profile?.last_sign_in_at || user.last_sign_in_at || null
  const emailVerified = Boolean(user.email_confirmed_at)

  const planLabel =
    profile?.plan?.trim() || userMetaString(user, "plan").trim() || "—"
  const locationLabel =
    profile?.location?.trim() || userMetaString(user, "location").trim() || "—"

  const statItems = [
    { label: "Joined", value: formatMonthYear(user.created_at), icon: Calendar },
    { label: "Plan", value: planLabel, icon: CreditCard },
    { label: "Location", value: locationLabel, icon: MapPin },
  ]

  const roleSelectIsPreset = ACCOUNT_ROLE_PRESETS.some((p) => p.value === form.role)

  return (
    <div className="relative min-h-full overflow-hidden bg-linear-to-b from-slate-50/90 via-white to-emerald-50/12">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -right-24 top-0 h-80 w-80 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="absolute -left-20 bottom-40 h-72 w-72 rounded-full bg-teal-200/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `linear-gradient(to right, rgb(148 163 184 / 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.06) 1px, transparent 1px)`,
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-3 py-8 sm:px-4 lg:px-6 lg:py-10">
        {/* Page intro */}
        <header className="mb-8 flex flex-col gap-6 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Overview
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              Profile, security signals, and preferences—aligned with Supabase Auth and your workspace data.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-10 shrink-0 gap-2 rounded-xl border-slate-200 bg-white/80 shadow-sm backdrop-blur-sm hover:bg-white hover:border-emerald-200/80"
            asChild
          >
            <Link href="/settings">
              <Settings className="h-4 w-4" />
              Preferences
              <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
            </Link>
          </Button>
        </header>

        {/* Hero profile */}
        <section className="mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 shadow-[0_24px_48px_-20px_rgba(15,118,110,0.12)] backdrop-blur-md sm:mb-10">
          <div className="relative h-36 sm:h-40">
            <div
              className={cn(
                "absolute inset-0 bg-linear-to-br from-emerald-800 via-teal-700 to-emerald-950"
              )}
            />
            <div
              className="absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/25 to-transparent" />
          </div>

          <div className="relative px-5 pb-6 pt-0 sm:px-8">
            <div className="-mt-6 pt-4 flex flex-col gap-6 sm:-mt-8 sm:pt-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
                <div
                  className={cn(
                    "flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-white text-2xl font-bold tracking-tight text-emerald-800",
                    "shadow-[0_20px_40px_-12px_rgba(15,118,110,0.35)]"
                  )}
                >
                  {initials}
                </div>
                <div className="pb-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 gap-y-1">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                      {name}
                    </h2>
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-white shadow-sm ring-2 ring-white"
                      title="Verified"
                      aria-label="Verified"
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  </div>
                  <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-600">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <Mail className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate font-medium text-slate-700">{user.email ?? "—"}</span>
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-10 shrink-0 gap-2 rounded-xl border-slate-200 bg-white shadow-sm hover:border-emerald-300/80 hover:bg-emerald-50/50"
                type="button"
                onClick={handleEditProfileClick}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit profile
              </Button>
            </div>

            {/* Stat bento */}
            <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <div className="group rounded-2xl border border-slate-100 bg-linear-to-b from-slate-50/90 to-white p-4 shadow-sm transition-[box-shadow,transform] hover:shadow-md hover:-translate-y-0.5">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <User className="h-3.5 w-3.5 text-emerald-600/80" strokeWidth={2} />
                  Role
                </div>
                <Select
                  value={form.role}
                  onValueChange={handleRoleChange}
                  disabled={savingRole || savingProfile}
                >
                  <SelectTrigger
                    aria-label="Account role"
                    className="mt-2 h-9 w-full rounded-lg border-slate-200 bg-white text-left text-sm font-semibold text-slate-900 shadow-none hover:bg-slate-50/80"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_ROLE_PRESETS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                    {!roleSelectIsPreset && form.role ? (
                      <SelectItem value={form.role}>{roleOptionLabel(form.role)}</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
                {savingRole ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving…
                  </p>
                ) : (
                  <p className="mt-1.5 text-[11px] text-slate-500">Saved to Auth metadata</p>
                )}
              </div>
              {statItems.map((stat) => (
                <div
                  key={stat.label}
                  className="group rounded-2xl border border-slate-100 bg-linear-to-b from-slate-50/90 to-white p-4 shadow-sm transition-[box-shadow,transform] hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <stat.icon className="h-3.5 w-3.5 text-emerald-600/80" strokeWidth={2} />
                    {stat.label}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900 line-clamp-2">{stat.value}</p>
                </div>
              ))}
              <div className="group col-span-2 rounded-2xl border border-slate-100 bg-linear-to-br from-emerald-50/80 to-white p-4 shadow-sm transition-[box-shadow,transform] hover:shadow-md hover:-translate-y-0.5 lg:col-span-1">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <Globe className="h-3.5 w-3.5 text-emerald-600/80" strokeWidth={2} />
                  Usage
                </div>
                <Progress value={0} className="mt-3 h-1.5 bg-slate-200/80" />
                <p className="mt-2 text-xs text-slate-500">Storage not tracked</p>
              </div>
            </div>
          </div>
        </section>

        {/* Insight cards */}
        <div className="mb-10 grid gap-4 md:grid-cols-3">
          <article className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm transition-all hover:border-blue-200/60 hover:shadow-lg hover:shadow-blue-500/5">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl transition-opacity group-hover:opacity-100" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-500/15 to-blue-600/5 text-blue-700 ring-1 ring-blue-500/10">
                <CreditCard className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Billing</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Subscription and cards aren&apos;t stored in-app yet. When you set a <span className="font-medium text-slate-700">plan</span> in Supabase, it surfaces in your stats above.
                </p>
              </div>
            </div>
          </article>

          <article className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm transition-all hover:border-emerald-200/60 hover:shadow-lg hover:shadow-emerald-500/5">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl transition-opacity group-hover:opacity-100" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500/15 to-teal-500/5 text-emerald-800 ring-1 ring-emerald-500/10">
                <Monitor className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900">Sessions</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Last sign-in</dt>
                    <dd className="font-medium text-slate-800 tabular-nums">{formatMediumDate(lastSignIn)}</dd>
                  </div>
                  {lastSignIn ? (
                    <div className="flex flex-col gap-0.5 border-t border-slate-100 pt-2">
                      <dt className="text-xs text-slate-400">Full timestamp</dt>
                      <dd className="text-xs text-slate-600 wrap-break-word">{formatDateTime(lastSignIn)}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </div>
          </article>

          <article className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm transition-all hover:border-amber-200/60 hover:shadow-lg hover:shadow-amber-500/5">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl transition-opacity group-hover:opacity-100" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-amber-500/12 to-orange-500/5 text-amber-900 ring-1 ring-amber-500/10">
                <Shield className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Security</h3>
                <ul className="mt-3 space-y-2.5 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className={cn("h-4 w-4 shrink-0", emailVerified ? "text-emerald-600" : "text-slate-300")} />
                    <span className={emailVerified ? "text-slate-700" : "text-slate-500"}>
                      {emailVerified ? "Email verified" : "Email not verified"}
                    </span>
                  </li>
                  <li className="flex items-center gap-2 text-slate-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    Password via Supabase Auth
                  </li>
                  <li className="flex items-start gap-2 text-slate-500">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                    <span>2FA: configure in Supabase Dashboard</span>
                  </li>
                </ul>
              </div>
            </div>
          </article>
        </div>

        {/* Tabs + content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="mb-8 overflow-x-auto pb-1">
            <TabsList className="inline-flex h-auto w-auto min-w-0 flex-wrap gap-1 rounded-2xl border border-slate-200/80 bg-slate-100/60 p-1.5 shadow-inner">
              {[
                { value: "settings", label: "Profile", icon: User },
                { value: "billing", label: "Billing", icon: CreditCard },
                { value: "security", label: "Security", icon: Shield },
                { value: "notifications", label: "Notifications", icon: Bell },
                { value: "activity", label: "Activity", icon: Clock },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600",
                    "data-[state=active]:bg-white data-[state=active]:text-emerald-900 data-[state=active]:shadow-sm",
                    "data-[state=active]:ring-1 data-[state=active]:ring-slate-200/80",
                    "transition-all"
                  )}
                >
                  <tab.icon className="h-4 w-4 opacity-70" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="settings" forceMount className="mt-0 outline-none data-[state=inactive]:hidden">
            <div
              ref={profileSectionRef}
              id="overview-profile-form"
              className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)]"
            >
              <div className="border-b border-slate-100 bg-linear-to-r from-slate-50/80 to-white px-6 py-6 sm:px-8">
                <h3 className="text-lg font-semibold text-slate-900">Profile & contact</h3>
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
                  Saved to <strong className="font-medium text-slate-800">Supabase Auth</strong> user metadata. Values from <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700">public.profiles</code> still show when present.
                </p>
              </div>
              <div className="p-6 sm:p-8">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Full name</Label>
                    <Input
                      className="h-11 rounded-xl border-slate-200 bg-slate-50/50 shadow-inner shadow-slate-900/2 focus-visible:border-emerald-400/60 focus-visible:ring-emerald-500/20"
                      value={form.fullName}
                      onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</Label>
                    <Input
                      type="email"
                      className="h-11 rounded-xl border-slate-200 bg-slate-100/60"
                      value={form.email}
                      readOnly
                    />
                    <p className="text-xs text-slate-500">Managed by Supabase Auth.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</Label>
                    <Input
                      className="h-11 rounded-xl border-slate-200 bg-slate-50/50 shadow-inner shadow-slate-900/2 focus-visible:border-emerald-400/60 focus-visible:ring-emerald-500/20"
                      placeholder="+63 ···"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Job title</Label>
                    <Input
                      className="h-11 rounded-xl border-slate-200 bg-slate-50/50 shadow-inner shadow-slate-900/2 focus-visible:border-emerald-400/60 focus-visible:ring-emerald-500/20"
                      value={form.jobTitle}
                      onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</Label>
                    <Select
                      value={form.role}
                      onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
                      disabled={savingProfile || savingRole}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/50 shadow-inner shadow-slate-900/2 focus-visible:border-emerald-400/60 focus-visible:ring-emerald-500/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCOUNT_ROLE_PRESETS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                        {!roleSelectIsPreset && form.role ? (
                          <SelectItem value={form.role}>{roleOptionLabel(form.role)}</SelectItem>
                        ) : null}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      Included when you save changes (same as the Role card above).
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</Label>
                    <Input
                      className="h-11 rounded-xl border-slate-200 bg-slate-50/50 shadow-inner shadow-slate-900/2 focus-visible:border-emerald-400/60 focus-visible:ring-emerald-500/20"
                      value={form.location}
                      onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Company</Label>
                    <Input
                      className="h-11 rounded-xl border-slate-200 bg-slate-50/50 shadow-inner shadow-slate-900/2 focus-visible:border-emerald-400/60 focus-visible:ring-emerald-500/20"
                      value={form.company}
                      onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    className="h-11 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 px-8 font-semibold text-white shadow-lg shadow-emerald-900/15 hover:from-emerald-500 hover:to-teal-500"
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="billing" className="mt-0 outline-none">
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
                <h3 className="text-lg font-semibold text-slate-900">Plan & payments</h3>
                <p className="mt-1 text-sm text-slate-600">Connect billing when you&apos;re ready—data layer is prepared for it.</p>
              </div>
              <div className="p-6 sm:p-8">
                <div className="rounded-2xl border border-emerald-100 bg-linear-to-br from-emerald-50/90 to-white p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-slate-900">
                      {planLabel !== "—" ? `${planLabel} plan` : "No plan on file"}
                    </span>
                    <Badge className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800">Active</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    Set <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">plan</code> on{" "}
                    <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">public.profiles</code> or wire Stripe later.
                  </p>
                </div>
                <div className="mt-6">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment method</h4>
                  <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5 text-sm text-slate-600">
                    No payment methods in PetroBook yet. Persist card hints on profiles or your billing provider when you integrate.
                  </p>
                </div>
                <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-100 pt-6">
                  <Button variant="outline" size="sm" className="h-10 rounded-xl gap-2" type="button" disabled>
                    <Download className="h-4 w-4" />
                    Download invoice
                  </Button>
                  <Button variant="ghost" size="sm" className="h-10 rounded-xl" type="button" disabled>
                    Billing history
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security" className="mt-0 outline-none">
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
                <h3 className="text-lg font-semibold text-slate-900">Security</h3>
                <p className="mt-1 text-sm text-slate-600">Core auth is handled by Supabase.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  {
                    icon: Lock,
                    title: "Password",
                    description: `Last sign-in: ${formatDateTime(lastSignIn)}`,
                    action: (
                      <Button variant="outline" size="sm" className="h-9 rounded-xl text-sm" type="button" disabled>
                        Change password
                      </Button>
                    ),
                  },
                  {
                    icon: Smartphone,
                    title: "Two-factor authentication",
                    description: "Configure MFA under Supabase Auth settings.",
                    action: (
                      <Badge variant="secondary" className="rounded-lg text-xs">
                        Supabase
                      </Badge>
                    ),
                  },
                  {
                    icon: Key,
                    title: "Recovery email",
                    description: user.email ?? "—",
                    action: (
                      <Button variant="outline" size="sm" className="h-9 rounded-xl text-sm" type="button" disabled>
                        Update
                      </Button>
                    ),
                  },
                  {
                    icon: Eye,
                    title: "Sessions",
                    description: "Last activity time is listed above.",
                    action: (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-xl text-sm text-red-600 border-red-200 hover:bg-red-50"
                        type="button"
                        disabled
                      >
                        Sign out everywhere
                      </Button>
                    ),
                  },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <item.icon className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <p className="text-sm text-slate-500 wrap-break-word">{item.description}</p>
                      </div>
                    </div>
                    <div className="shrink-0 pl-15 sm:pl-0">{item.action}</div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-0 outline-none">
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
                <h3 className="text-lg font-semibold text-slate-900">Notifications</h3>
                <p className="mt-1 text-sm text-slate-600">Preferences are local UI for now.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  { title: "Email notifications", description: "Account activity summaries" },
                  { title: "Invoice reminders", description: "Before due dates" },
                  { title: "Payment alerts", description: "When payments post" },
                  { title: "Security alerts", description: "Unusual sign-in activity" },
                  { title: "Product updates", description: "Features and tips" },
                ].map((pref, i) => (
                  <div key={pref.title} className="flex items-center justify-between gap-4 px-6 py-4 sm:px-8">
                    <div>
                      <p className="font-medium text-slate-900">{pref.title}</p>
                      <p className="text-sm text-slate-500">{pref.description}</p>
                    </div>
                    <Switch defaultChecked={i < 4} />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-0 outline-none">
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
                <h3 className="text-lg font-semibold text-slate-900">Recent activity</h3>
                <p className="mt-1 text-sm text-slate-600">Latest sign-in from Supabase Auth.</p>
              </div>
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200/80 text-blue-600">
                    <Monitor className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">Signed in</p>
                    <p className="text-sm text-slate-500">Supabase session</p>
                  </div>
                  <span className="text-xs font-medium tabular-nums text-slate-500 sm:text-sm">
                    {formatDateTime(lastSignIn)}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
