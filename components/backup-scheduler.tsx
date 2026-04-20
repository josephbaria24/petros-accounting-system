"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase-client"
import { runBackupDownload } from "@/lib/backup-download-client"
import { isBackupFileFormat, type BackupFileFormat } from "@/lib/backup-serialize"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"

const STORAGE_PREFIX = "petrobook_daily_backup_done_"

function normHm(s: string): string {
  const t = s.trim().slice(0, 5)
  const [h = "0", m = "0"] = t.split(":")
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`
}

function hhmmInTimeZone(isoTimeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: isoTimeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date())
    const h = parts.find((p) => p.type === "hour")?.value ?? "00"
    const m = parts.find((p) => p.type === "minute")?.value ?? "00"
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`
  } catch {
    return normHm("00:00")
  }
}

function minutesInTimeZone(isoTimeZone: string): number | null {
  const hm = hhmmInTimeZone(isoTimeZone)
  const [h, m] = hm.split(":").map((x) => Number(x))
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

function parseHmToMinutes(hmRaw: unknown): number | null {
  if (typeof hmRaw !== "string") return null
  const hm = normHm(hmRaw)
  const [h, m] = hm.split(":").map((x) => Number(x))
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

function ymdInTimeZone(isoTimeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: isoTimeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date())
    const y = parts.find((p) => p.type === "year")?.value ?? "1970"
    const mo = parts.find((p) => p.type === "month")?.value ?? "01"
    const d = parts.find((p) => p.type === "day")?.value ?? "01"
    return `${y}-${mo}-${d}`
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

function isDailyBackupEnabled(meta: Record<string, unknown>): boolean {
  const v = meta.backup_daily_enabled
  return v === true || v === "true"
}

/**
 * While PetroBook is open (any dashboard screen), checks Auth metadata on a short interval.
 * If **Daily automatic backup** is saved as on, at the configured local time the app downloads once that calendar day—no “Download now” click.
 */
export function BackupScheduler() {
  const ranYmdRef = useRef<string>("")
  const [due, setDue] = useState<{
    ymd: string
    tz: string
    hm: string
    fmt: BackupFileFormat
  } | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const tick = async () => {
      if (cancelled || typeof window === "undefined") return

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setStatus("not signed in")
        return
      }

      const meta = (user.user_metadata ?? {}) as Record<string, unknown>
      if (!isDailyBackupEnabled(meta)) {
        setStatus("daily backup off (not saved or disabled)")
        return
      }

      const configured = typeof meta.backup_local_time === "string" ? meta.backup_local_time : "16:30"
      const targetHm = normHm(configured)
      const tz =
        typeof meta.backup_timezone === "string" && meta.backup_timezone.trim()
          ? meta.backup_timezone.trim()
          : Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"

      const ymd = ymdInTimeZone(tz)

      const targetMin = parseHmToMinutes(configured)
      const nowMin = minutesInTimeZone(tz)
      if (targetMin == null || nowMin == null) {
        setStatus("time parse failed")
        return
      }

      // Trigger when the local clock is at-or-after the scheduled time (no strict minute match).
      // This avoids missing the run if the tab was in the background at the exact minute.
      if (nowMin < targetMin) {
        // Not due yet today.
        setDue(null)
        setStatus(`waiting (${targetHm} ${tz})`)
        return
      }

      const storageKey = STORAGE_PREFIX + user.id
      if (localStorage.getItem(storageKey) === ymd) {
        ranYmdRef.current = ymd
        setDue(null)
        setStatus(`done today (${targetHm} ${tz})`)
        return
      }
      if (ranYmdRef.current === ymd) return

      const fmtRaw = meta.backup_file_format
      const fmt: BackupFileFormat = isBackupFileFormat(fmtRaw) ? fmtRaw : "json"
      setStatus(`due now (${targetHm} ${tz})`)
      // Many browsers block file downloads triggered from timers. We still try once automatically,
      // but we always show a "ready" button so the user can click (user gesture) if needed.
      setDue({ ymd, tz, hm: targetHm, fmt })

      try {
        const ok = await runBackupDownload(fmt)
        if (ok) {
          ranYmdRef.current = ymd
          localStorage.setItem(storageKey, ymd)
          setDue(null)
          toast({
            title: "Scheduled backup downloaded",
            description: `Your ${fmt.toUpperCase()} export was saved (${targetHm} ${tz}).`,
          })
        }
      } catch {
        // leave `due` visible so the user can click Download.
      }
    }

    const supabaseOuter = createClient()
    const {
      data: { subscription },
    } = supabaseOuter.auth.onAuthStateChange(() => {
      void tick()
    })

    const id = setInterval(tick, 15_000)
    void tick()
    return () => {
      cancelled = true
      clearInterval(id)
      subscription.unsubscribe()
    }
  }, [])

  // Tiny invisible debug hook (hover bottom-right area if needed).
  if (!due && status) {
    return (
      <div className="fixed bottom-1 right-1 z-50 select-none text-[10px] text-muted-foreground/40">
        backup: {status}
      </div>
    )
  }

  if (!due) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex max-w-sm items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">Scheduled backup ready</p>
          <p className="text-xs text-slate-600">
            {due.hm} {due.tz} · {due.fmt.toUpperCase()}
          </p>
        </div>
        <Button
          size="sm"
          className="shrink-0 rounded-xl"
          onClick={async () => {
            const ok = await runBackupDownload(due.fmt)
            if (ok) {
              // We can’t read the user id here without another auth call; mark locally for today with a generic key too.
              ranYmdRef.current = due.ymd
              try {
                localStorage.setItem(STORAGE_PREFIX + "manual", due.ymd)
              } catch {
                /* ignore */
              }
              setDue(null)
            }
          }}
        >
          Download
        </Button>
      </div>
    </div>
  )
}
