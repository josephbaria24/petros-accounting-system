"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Building2, RefreshCw, ThumbsUp, ThumbsDown, AlertCircle } from "lucide-react"

export type BankAccountRow = {
  id: string
  name: string
  /** Shown under the name (e.g. “In QuickBooks”) */
  sourceLabel?: string
  /** Single balance for simple rows */
  balance?: number
  /** Expanded row: bank vs books */
  bankBalance?: number
  quickBooksBalance?: number
  lastSyncedDaysAgo?: number | null
  needsAttention?: boolean
}

function formatPhp(value: number) {
  const abs = Math.abs(value)
  const formatted = `₱${abs.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return value < 0 ? `-${formatted}` : formatted
}

const DEFAULT_MOCK_ACCOUNTS: BankAccountRow[] = [
  {
    id: "1",
    name: "3483 0576 19 Cash on Bank …",
    sourceLabel: "In QuickBooks",
    bankBalance: 35302.57,
    quickBooksBalance: 1361076.74,
    lastSyncedDaysAgo: 340,
    needsAttention: true,
  },
  {
    id: "2",
    name: "3481-0038-99 BPI",
    sourceLabel: "In QuickBooks",
    balance: 576560.0,
  },
  {
    id: "3",
    name: "Cash on Bank (BDO)",
    sourceLabel: "In QuickBooks",
    balance: -326700.0,
  },
  {
    id: "4",
    name: "Petty cash",
    sourceLabel: "In QuickBooks",
    balance: 12500.0,
  },
]

type BankAccountsCardProps = {
  /** When you add a Supabase (or QuickBooks) integration, pass rows here and remove defaults. */
  accounts?: BankAccountRow[]
  className?: string
}

export function BankAccountsCard({ accounts = DEFAULT_MOCK_ACCOUNTS, className }: BankAccountsCardProps) {
  const lastUpdatedMin = 1

  return (
    <Card className={cn("border-border/80 shadow-sm", className)}>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Bank accounts
            </h3>
            <span className="text-xs text-muted-foreground">As of today</span>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs italic text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => {
              /* TODO: wire refresh when bank sync exists */
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Last updated {lastUpdatedMin} minute{lastUpdatedMin === 1 ? "" : "s"} ago
          </button>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0 pt-0">
        <ul className="divide-y divide-border/80">
          {accounts.map((row) => (
            <li key={row.id} className="px-4 py-3.5 first:pt-4 last:pb-4">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white shadow-sm">
                  <Building2 className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  {row.bankBalance != null && row.quickBooksBalance != null ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold leading-tight text-foreground">{row.name}</p>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div className="min-w-0 flex-1 space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Bank balance</span>
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                              {formatPhp(row.bankBalance)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">In QuickBooks</span>
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                              {formatPhp(row.quickBooksBalance)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {row.needsAttention && (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
                          {row.lastSyncedDaysAgo != null && (
                            <span className="text-xs text-muted-foreground">
                              Updated {row.lastSyncedDaysAgo} days ago
                            </span>
                          )}
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 underline-offset-4 hover:underline dark:text-sky-400"
                          >
                            <AlertCircle className="h-3.5 w-3.5 text-destructive" aria-hidden />
                            Needs attention
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight text-foreground">{row.name}</p>
                        {row.sourceLabel && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{row.sourceLabel}</p>
                        )}
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                        {row.balance != null ? formatPhp(row.balance) : "—"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        <Separator />

        <div className="flex flex-col gap-3 bg-muted/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Is this banking info helpful?</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full border-border/80"
              aria-label="Yes, helpful"
              onClick={() => {
                /* TODO: analytics or feedback API */
              }}
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full border-border/80"
              aria-label="Not helpful"
              onClick={() => {
                /* TODO: analytics or feedback API */
              }}
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
