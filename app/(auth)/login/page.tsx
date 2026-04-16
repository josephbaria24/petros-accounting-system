"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  ShieldCheck,
  BarChart3,
  Sparkles,
  ArrowRight,
  Fingerprint,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault()
    if (!email || !password) {
      toast({
        title: "Missing fields",
        description: "Please enter your email and password.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast({
        title: "Sign-in failed",
        description: error.message,
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase
        .from("profiles")
        .update({ last_sign_in_at: new Date().toISOString() })
        .eq("id", data.user.id)
    }

    toast({
      title: "Welcome back",
      description: "Redirecting to your dashboard.",
    })

    router.push("/")
    router.refresh()
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50">
      {/* ── Brand panel (desktop) ── */}
      <aside
        className={cn(
          "relative hidden lg:flex lg:w-[46%] xl:w-[48%] flex-col justify-between overflow-hidden",
          "bg-linear-to-br from-emerald-950 via-teal-900 to-slate-950 text-white"
        )}
      >
        {/* Soft light orbs */}
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 bottom-32 h-80 w-80 rounded-full bg-teal-400/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
          aria-hidden
        />

        <div className="relative z-10 flex flex-1 flex-col justify-center px-12 xl:px-16 py-14">
          <div className="mb-10 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <Image
                src="/petrobook.png"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
                priority
              />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-emerald-200/90">
                PetroBook
              </p>
              <p className="text-sm font-semibold">Accounting Suite</p>
            </div>
          </div>

          <h1 className="max-w-md text-4xl font-semibold leading-[1.15] tracking-tight xl:text-[2.75rem]">
            Clarity for every{" "}
            <span className="bg-linear-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
              ledger, invoice, and line.
            </span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-emerald-100/85">
            Sign in to manage sales, expenses, and reporting in one calm, focused workspace—built for teams who outgrow spreadsheets.
          </p>

          <ul className="mt-12 space-y-5">
            {[
              {
                icon: BarChart3,
                title: "Live financial picture",
                desc: "Dashboards and reports that stay in sync with your data.",
              },
              {
                icon: ShieldCheck,
                title: "Secure by design",
                desc: "Authentication powered by Supabase with industry-standard practices.",
              },
              {
                icon: Sparkles,
                title: "Built for daily use",
                desc: "Fast workflows for invoices, bills, and customer records.",
              },
            ].map((item) => (
              <li key={item.title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                  <item.icon className="h-5 w-5 text-emerald-200" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="font-medium text-white">{item.title}</p>
                  <p className="mt-0.5 text-sm text-emerald-100/75">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 border-t border-white/10 px-12 xl:px-16 py-6 text-xs text-emerald-200/70">
          © {new Date().getFullYear()} PetroBook · Petrosphere Accounting
        </div>
      </aside>

      {/* ── Sign-in column (intentionally distinct from “template” forms) ── */}
      <main
        className={cn(
          "relative flex flex-1 flex-col justify-center overflow-hidden",
          "bg-linear-to-br from-slate-100 via-white to-emerald-50/35"
        )}
      >
        {/* Ambient mesh + grid — not a flat gray page */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute right-0 top-0 h-[420px] w-[420px] translate-x-1/3 -translate-y-1/4 rounded-full bg-emerald-200/25 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-[380px] w-[380px] -translate-x-1/4 translate-y-1/4 rounded-full bg-teal-200/20 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage: `linear-gradient(to right, rgb(148 163 184 / 0.09) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.09) 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        {/* Vertical accent — ties visually to the left panel */}
        <div
          className="pointer-events-none absolute left-0 top-[12%] hidden h-[76%] w-px bg-linear-to-b from-transparent via-emerald-400/35 to-transparent lg:block"
          aria-hidden
        />

        <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col px-5 py-12 sm:px-10 lg:max-w-xl lg:px-14 xl:max-w-[440px] xl:px-0">
          {/* Mobile brand — tighter, editorial */}
          <div className="mb-9 flex items-center gap-4 lg:hidden">
            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl bg-linear-to-br from-emerald-400/25 to-teal-400/15 blur-md" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg shadow-emerald-900/10 ring-1 ring-emerald-900/5">
                <Image
                  src="/petrobook.png"
                  alt="PetroBook"
                  width={36}
                  height={36}
                  className="h-9 w-9 object-contain"
                  priority
                />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-800/80">
                PetroBook
              </p>
              <p className="text-lg font-semibold tracking-tight text-slate-900">Accounting Suite</p>
            </div>
          </div>

          <h2 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2rem] sm:leading-[1.15]">
            <span className="font-normal text-slate-500">Welcome back —</span>
            <br />
            sign in to your workspace
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">
            Use the email tied to your organization. Traffic is encrypted; we never store your password in plain text.
          </p>

          <form onSubmit={handleSubmit} className="mt-9 space-y-6">
            {/* Composite fields: icon rail + inset label — reads as a designed system, not default inputs */}
            <div className="space-y-4">
              <div
                className={cn(
                  "group rounded-2xl border border-slate-200/90 bg-white/85 shadow-[0_1px_0_0_rgba(15,23,42,0.04)] backdrop-blur-sm",
                  "transition-[box-shadow,border-color] duration-200",
                  "focus-within:border-emerald-400/70 focus-within:shadow-[0_0_0_3px_rgba(16,185,129,0.14),0_16px_40px_-20px_rgba(15,118,110,0.2)]"
                )}
              >
                <div className="flex min-h-17 items-stretch overflow-hidden rounded-2xl">
                  <div className="flex w-14 shrink-0 flex-col items-center justify-center bg-linear-to-b from-emerald-50/95 to-teal-50/60 text-emerald-800">
                    <Mail className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
                    <label
                      htmlFor="email"
                      className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-900/55"
                    >
                      Work email
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full border-0 bg-transparent p-0 text-base font-medium text-slate-900 placeholder:text-slate-400 outline-none ring-0 focus:ring-0"
                    />
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "group rounded-2xl border border-slate-200/90 bg-white/85 shadow-[0_1px_0_0_rgba(15,23,42,0.04)] backdrop-blur-sm",
                  "transition-[box-shadow,border-color] duration-200",
                  "focus-within:border-emerald-400/70 focus-within:shadow-[0_0_0_3px_rgba(16,185,129,0.14),0_16px_40px_-20px_rgba(15,118,110,0.2)]"
                )}
              >
                <div className="flex min-h-17 items-stretch overflow-hidden rounded-2xl">
                  <div className="flex w-14 shrink-0 flex-col items-center justify-center bg-linear-to-b from-emerald-50/95 to-teal-50/60 text-emerald-800">
                    <Lock className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
                    <label
                      htmlFor="password"
                      className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-900/55"
                    >
                      Password
                    </label>
                    <div className="relative mt-1">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border-0 bg-transparent py-0.5 pr-11 text-base font-medium text-slate-900 placeholder:text-slate-400 outline-none ring-0 focus:ring-0"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="border-slate-400 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
                />
                <label htmlFor="remember" className="cursor-pointer text-sm text-slate-600">
                  Keep me signed in on this device
                </label>
              </div>
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-emerald-800 transition-colors hover:text-emerald-950 hover:underline underline-offset-4"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className={cn(
                "group relative h-14 w-full overflow-hidden rounded-2xl text-[15px] font-semibold tracking-wide",
                "bg-linear-to-r from-emerald-700 via-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-900/20",
                "transition-[transform,box-shadow] duration-200 hover:shadow-emerald-900/30",
                "hover:brightness-[1.03] active:scale-[0.99]",
                "focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2",
                "disabled:pointer-events-none disabled:opacity-60"
              )}
            >
              <span className="absolute inset-0 bg-linear-to-t from-white/0 via-white/10 to-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
              <span className="relative flex w-full items-center justify-center gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Continue to dashboard
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </span>
            </Button>
          </form>

          <div className="mt-10 rounded-2xl border border-dashed border-slate-200/90 bg-white/50 px-4 py-4 text-center text-sm text-slate-600 backdrop-blur-sm">
            <span className="text-slate-500">New to PetroBook?</span>{" "}
            <Link
              href="/signup"
              className="font-semibold text-emerald-800 underline decoration-emerald-300/80 underline-offset-4 transition-colors hover:text-emerald-950 hover:decoration-emerald-600"
            >
              Request workspace access
            </Link>
          </div>

          <p className="mt-8 text-center text-[11px] tracking-wide text-slate-400">
            © {new Date().getFullYear()} PetroBook · Petrosphere Accounting
          </p>
        </div>
      </main>
    </div>
  )
}
