import type { BackupFileFormat } from "@/lib/backup-serialize"

export function backupFilenameForFormat(format: BackupFileFormat) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const ext = format === "json" ? "json" : format === "xml" ? "xml" : "xlsx"
  return `petrobook-backup-${stamp}.${ext}`
}

function mimeForFormat(format: BackupFileFormat): string {
  if (format === "json") return "application/json;charset=utf-8"
  if (format === "xml") return "application/xml;charset=utf-8"
  return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
}

/**
 * POST /api/backup/export with `{ format }` and trigger a browser download.
 * @returns true if export succeeded and download started
 */
export async function runBackupDownload(format: BackupFileFormat = "json"): Promise<boolean> {
  const res = await fetch("/api/backup/export", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "*/*" },
    body: JSON.stringify({ format }),
  })

  if (!res.ok) {
    let detail = res.statusText
    try {
      const ct = res.headers.get("content-type") ?? ""
      if (ct.includes("application/json")) {
        const j = await res.json()
        if (j?.error) detail = String(j.error)
      }
    } catch {
      /* ignore */
    }
    console.error("[backup]", detail)
    return false
  }

  const buf = await res.arrayBuffer()
  const blob = new Blob([buf], { type: mimeForFormat(format) })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = backupFilenameForFormat(format)
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return true
}
