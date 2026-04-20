import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase-types"

/** Tables included in JSON backup (RLS applies; PostgREST returns up to 1000 rows per table by default). */
const BACKUP_TABLES = [
  "accounts",
  "bank_transactions",
  "bills",
  "bill_items",
  "customers",
  "expenses",
  "invoices",
  "invoice_items",
  "journal_entries",
  "journal_lines",
  "payments",
  "suppliers",
  "profiles",
] as const satisfies readonly (keyof Database["public"]["Tables"])[]

export type BackupPayload = {
  version: 1
  exportedAt: string
  app: "petrobook"
  tables: Partial<Record<(typeof BACKUP_TABLES)[number], unknown[]>>
  tableErrors?: { table: string; message: string }[]
}

export async function buildBackupPayload(
  supabase: SupabaseClient<Database>,
): Promise<BackupPayload> {
  const tables: BackupPayload["tables"] = {}
  const tableErrors: { table: string; message: string }[] = []

  for (const name of BACKUP_TABLES) {
    const { data, error } = await supabase.from(name).select("*")
    if (error) {
      tableErrors.push({ table: name, message: error.message })
      continue
    }
    ;(tables as Record<string, unknown[]>)[name] = data ?? []
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: "petrobook",
    tables,
    tableErrors: tableErrors.length ? tableErrors : undefined,
  }
}
