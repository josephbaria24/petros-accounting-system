"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { createClient } from "@/lib/supabase-client"
import {
  fetchAccountOverview,
  displayName,
  initialsFromName,
  formatDateTime,
  userMetaString,
} from "@/lib/fetch-account-overview"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Bell,
  CreditCard,
  KeyRound,
  Lock,
  Settings as SettingsIcon,
  Shield,
  Sparkles,
  Users,
  Loader2,
  ArrowUpRight,
  Mail,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

type NotificationPrefs = {
  email: boolean
  sms: boolean
  inApp: boolean
  invoiceReminders: boolean
  paymentAlerts: boolean
  securityAlerts: boolean
}

function metaBool(meta: Record<string, unknown> | undefined, key: string, fallback: boolean) {
  const v = meta?.[key]
  return typeof v === "boolean" ? v : fallback
}

export default function Settings() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("profile")
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingNotifs, setSavingNotifs] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    jobTitle: "",
    company: "",
    location: "",
  })

  const [notifs, setNotifs] = useState<NotificationPrefs>({
    email: true,
    sms: false,
    inApp: true,
    invoiceReminders: true,
    paymentAlerts: true,
    securityAlerts: true,
  })

  const { data, error, isLoading, mutate } = useSWR(
    "settings/account",
    fetchAccountOverview,
    { revalidateOnFocus: true, dedupingInterval: 60_000, keepPreviousData: true }
  )

  useEffect(() => {
    if (!data) return
    const { user, profile } = data
    const meta = (user.user_metadata as Record<string, unknown> | undefined) ?? {}

    setProfileForm({
      fullName: displayName(user, profile),
      email: user.email ?? "",
      phone: profile?.phone ?? userMetaString(user, "phone"),
      jobTitle: profile?.job_title ?? userMetaString(user, "job_title"),
      company: profile?.company ?? userMetaString(user, "company"),
      location: profile?.location ?? userMetaString(user, "location"),
    })

    setNotifs({
      email: metaBool(meta, "notif_email", true),
      sms: metaBool(meta, "notif_sms", false),
      inApp: metaBool(meta, "notif_in_app", true),
      invoiceReminders: metaBool(meta, "notif_invoice_reminders", true),
      paymentAlerts: metaBool(meta, "notif_payment_alerts", true),
      securityAlerts: metaBool(meta, "notif_security_alerts", true),
    })
  }, [data])

  const name = useMemo(() => {
    if (!data) return ""
    return displayName(data.user, data.profile)
  }, [data])

  const initials = initialsFromName(name || "User")
  const lastSignIn = data?.profile?.last_sign_in_at || data?.user?.last_sign_in_at || null
  const emailVerified = Boolean(data?.user?.email_confirmed_at)

  const saveProfile = async () => {
    if (!data?.user) return
    setSavingProfile(true)
    try {
      const supabase = createClient()
      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          full_name: profileForm.fullName.trim() || undefined,
          phone: profileForm.phone.trim() || undefined,
          job_title: profileForm.jobTitle.trim() || undefined,
          company: profileForm.company.trim() || undefined,
          location: profileForm.location.trim() || undefined,
        },
      })
      if (authErr) throw authErr
      await mutate()
      toast({ title: "Saved", description: "Profile updated in Supabase Auth metadata." })
    } catch (e: unknown) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Update failed.",
        variant: "destructive",
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const saveNotifications = async () => {
    if (!data?.user) return
    setSavingNotifs(true)
    try {
      const supabase = createClient()
      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          notif_email: notifs.email,
          notif_sms: notifs.sms,
          notif_in_app: notifs.inApp,
          notif_invoice_reminders: notifs.invoiceReminders,
          notif_payment_alerts: notifs.paymentAlerts,
          notif_security_alerts: notifs.securityAlerts,
        },
      })
      if (authErr) throw authErr
      await mutate()
      toast({ title: "Saved", description: "Notification preferences synced." })
    } catch (e: unknown) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Update failed.",
        variant: "destructive",
      })
    } finally {
      setSavingNotifs(false)
    }
  }

  const sendPasswordReset = async () => {
    const email = data?.user?.email
    if (!email) return
    setSendingReset(true)
    try {
      const supabase = createClient()
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email)
      if (resetErr) throw resetErr
      toast({
        title: "Check your inbox",
        description: "We sent a password reset link to your email.",
      })
    } catch (e: unknown) {
      toast({
        title: "Could not send reset",
        description: e instanceof Error ? e.message : "Request failed.",
        variant: "destructive",
      })
    } finally {
      setSendingReset(false)
    }
  }

  if (isLoading && !data) {
    return (
      <div className="min-h-[70vh] bg-linear-to-b from-slate-50/90 via-white to-emerald-50/12">
        <div className="mx-auto max-w-7xl px-3 py-10 sm:px-4 lg:px-6">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-44 rounded-lg" />
              <Skeleton className="h-4 w-72 rounded" />
            </div>
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
          <Skeleton className="mt-8 h-24 w-full rounded-3xl" />
          <Skeleton className="mt-6 h-14 w-full max-w-xl rounded-2xl" />
          <Skeleton className="mt-6 h-96 w-full rounded-3xl" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-[50vh] bg-linear-to-b from-slate-50/90 to-white px-3 py-10 sm:px-4 lg:px-6">
        <div className="mx-auto max-w-xl">
          <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-6 shadow-sm flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
              <Shield className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-destructive">Could not load settings</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {error instanceof Error ? error.message : "Sign in again or check your Supabase connection."}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-linear-to-b from-slate-50/90 via-white to-emerald-50/12">
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
        <header className="mb-8 flex flex-col gap-6 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Account settings</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Synced to your <strong className="font-medium text-slate-800">Supabase Auth</strong> user metadata. Changes apply to the currently signed-in account.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-10 shrink-0 gap-2 rounded-xl border-slate-200 bg-white/80 shadow-sm backdrop-blur-sm hover:bg-white hover:border-emerald-200/80"
            asChild
          >
            <Link href="/overview">
              <SettingsIcon className="h-4 w-4" />
              Account overview
              <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
            </Link>
          </Button>
        </header>

        <section className="mb-10 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 shadow-[0_24px_48px_-20px_rgba(15,118,110,0.12)] backdrop-blur-md">
          <div className="flex flex-col gap-6 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-lg font-bold text-emerald-800 shadow-[0_20px_40px_-16px_rgba(15,118,110,0.35)] ring-1 ring-slate-200/80">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold tracking-tight text-slate-900">{name}</p>
                  <Badge className="rounded-lg border border-emerald-200/90 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 hover:bg-emerald-50">
                    {emailVerified ? "Verified" : "Unverified"}
                  </Badge>
                </div>
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Mail className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate font-medium text-slate-700">{data.user.email ?? "—"}</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Last sign-in: <span className="font-medium tabular-nums">{formatDateTime(lastSignIn)}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                onClick={sendPasswordReset}
                disabled={sendingReset}
              >
                {sendingReset ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Reset password
                  </>
                )}
              </Button>
            </div>
          </div>
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="mb-8 overflow-x-auto pb-1">
            <TabsList className="inline-flex h-auto w-auto min-w-0 flex-wrap gap-1 rounded-2xl border border-slate-200/80 bg-slate-100/60 p-1.5 shadow-inner">
              {[
                { value: "profile", label: "Profile", icon: SettingsIcon },
                { value: "team", label: "Team", icon: Users },
                { value: "billing", label: "Billing", icon: CreditCard },
                { value: "notifications", label: "Notifications", icon: Bell },
                { value: "security", label: "Security", icon: Shield },
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

          <TabsContent value="profile" className="mt-0 outline-none">
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-100 bg-linear-to-r from-slate-50/80 to-white px-6 py-6 sm:px-8">
                <h3 className="text-lg font-semibold text-slate-900">Profile</h3>
                <p className="mt-1.5 text-sm text-slate-600">Update your display details (stored in Supabase Auth metadata).</p>
              </div>
              <div className="p-6 sm:p-8">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Full name</Label>
                    <Input
                      className="h-11 rounded-xl border-slate-200 bg-slate-50/50 shadow-inner shadow-slate-900/2 focus-visible:border-emerald-400/60 focus-visible:ring-emerald-500/20"
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</Label>
                    <Input
                      type="email"
                      className="h-11 rounded-xl border-slate-200 bg-slate-100/60"
                      value={profileForm.email}
                      readOnly
                    />
                    <p className="text-xs text-slate-500">Managed by Supabase Auth.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</Label>
                    <Input
                      className="h-11 rounded-xl border-slate-200 bg-slate-50/50 shadow-inner shadow-slate-900/2 focus-visible:border-emerald-400/60 focus-visible:ring-emerald-500/20"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Job title</Label>
                    <Input
                      className="h-11 rounded-xl border-slate-200 bg-slate-50/50 shadow-inner shadow-slate-900/2 focus-visible:border-emerald-400/60 focus-visible:ring-emerald-500/20"
                      value={profileForm.jobTitle}
                      onChange={(e) => setProfileForm((f) => ({ ...f, jobTitle: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</Label>
                    <Input
                      className="h-11 rounded-xl border-slate-200 bg-slate-50/50 shadow-inner shadow-slate-900/2 focus-visible:border-emerald-400/60 focus-visible:ring-emerald-500/20"
                      value={profileForm.location}
                      onChange={(e) => setProfileForm((f) => ({ ...f, location: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Company</Label>
                    <Input
                      className="h-11 rounded-xl border-slate-200 bg-slate-50/50 shadow-inner shadow-slate-900/2 focus-visible:border-emerald-400/60 focus-visible:ring-emerald-500/20"
                      value={profileForm.company}
                      onChange={(e) => setProfileForm((f) => ({ ...f, company: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
                  <Button
                    type="button"
                    className="h-11 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 px-8 font-semibold text-white shadow-lg shadow-emerald-900/15 hover:from-emerald-500 hover:to-teal-500"
                    onClick={saveProfile}
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

          <TabsContent value="notifications" className="mt-0 outline-none">
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
                <h3 className="text-lg font-semibold text-slate-900">Notifications</h3>
                <p className="mt-1 text-sm text-slate-600">Synced per account (Supabase Auth metadata).</p>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  {
                    id: "email",
                    title: "Email notifications",
                    desc: "Account and activity updates",
                    value: notifs.email,
                    set: (v: boolean) => setNotifs((p) => ({ ...p, email: v })),
                  },
                  {
                    id: "sms",
                    title: "SMS notifications",
                    desc: "Critical alerts to your phone",
                    value: notifs.sms,
                    set: (v: boolean) => setNotifs((p) => ({ ...p, sms: v })),
                  },
                  {
                    id: "inApp",
                    title: "In-app notifications",
                    desc: "Toasts and inbox inside PetroBook",
                    value: notifs.inApp,
                    set: (v: boolean) => setNotifs((p) => ({ ...p, inApp: v })),
                  },
                  {
                    id: "invoiceReminders",
                    title: "Invoice reminders",
                    desc: "Before due dates",
                    value: notifs.invoiceReminders,
                    set: (v: boolean) => setNotifs((p) => ({ ...p, invoiceReminders: v })),
                  },
                  {
                    id: "paymentAlerts",
                    title: "Payment alerts",
                    desc: "When payments post",
                    value: notifs.paymentAlerts,
                    set: (v: boolean) => setNotifs((p) => ({ ...p, paymentAlerts: v })),
                  },
                  {
                    id: "securityAlerts",
                    title: "Security alerts",
                    desc: "Unusual sign-in activity",
                    value: notifs.securityAlerts,
                    set: (v: boolean) => setNotifs((p) => ({ ...p, securityAlerts: v })),
                  },
                ].map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-4 px-6 py-4 sm:px-8">
                    <div>
                      <p className="font-medium text-slate-900">{row.title}</p>
                      <p className="text-sm text-slate-500">{row.desc}</p>
                    </div>
                    <Switch checked={row.value} onCheckedChange={row.set} />
                  </div>
                ))}
              </div>
              <div className="flex justify-end border-t border-slate-100 px-6 py-5 sm:px-8">
                <Button
                  type="button"
                  className="h-11 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 px-8 font-semibold text-white shadow-lg shadow-emerald-900/15 hover:from-emerald-500 hover:to-teal-500"
                  onClick={saveNotifications}
                  disabled={savingNotifs}
                >
                  {savingNotifs ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save preferences"
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="billing" className="mt-0 outline-none">
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
                <h3 className="text-lg font-semibold text-slate-900">Billing</h3>
                <p className="mt-1 text-sm text-slate-600">Displays plan from your profile metadata when set.</p>
              </div>
              <div className="p-6 sm:p-8">
                <div className="rounded-2xl border border-emerald-100 bg-linear-to-br from-emerald-50/90 to-white p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-slate-900">
                      {userMetaString(data.user, "plan").trim() || "No plan on file"}
                    </span>
                    <Badge className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800">Active</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    You can set <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">plan</code> in user metadata or wire Stripe later.
                  </p>
                </div>
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5 text-sm text-slate-600">
                  Payment methods and invoices aren&apos;t stored in PetroBook yet.
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security" className="mt-0 outline-none">
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
                <h3 className="text-lg font-semibold text-slate-900">Security</h3>
                <p className="mt-1 text-sm text-slate-600">Supabase Auth handles passwords and sessions.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  {
                    icon: Lock,
                    title: "Password",
                    desc: "Send a reset link to your email.",
                    action: (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-xl"
                        type="button"
                        onClick={sendPasswordReset}
                        disabled={sendingReset}
                      >
                        Reset password
                      </Button>
                    ),
                  },
                  {
                    icon: Shield,
                    title: "Email verification",
                    desc: emailVerified ? "Verified" : "Not verified",
                    action: (
                      <Badge className="rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                        {emailVerified ? "Verified" : "Needs action"}
                      </Badge>
                    ),
                  },
                  {
                    icon: KeyRound,
                    title: "Last sign-in",
                    desc: formatDateTime(lastSignIn),
                    action: (
                      <Badge variant="secondary" className="rounded-lg text-xs">
                        Supabase
                      </Badge>
                    ),
                  },
                ].map((row) => (
                  <div key={row.title} className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <row.icon className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{row.title}</p>
                        <p className="text-sm text-slate-500 wrap-break-word">{row.desc}</p>
                      </div>
                    </div>
                    <div className="shrink-0 pl-15 sm:pl-0">{row.action}</div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="team" className="mt-0 outline-none">
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
                <h3 className="text-lg font-semibold text-slate-900">Team</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Listing all accounts requires a dedicated table or server-side admin access. This view shows the currently signed-in account.
                </p>
              </div>
              <div className="p-6 sm:p-8">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-base font-bold text-emerald-800 shadow-sm ring-1 ring-slate-200/80">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{name}</p>
                      <p className="text-sm text-slate-600 truncate">{data.user.email ?? "—"}</p>
                    </div>
                    <Badge className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800">Active</Badge>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
