import * as XLSX from "xlsx"
import type { BackupPayload } from "@/lib/backup-export"

export type BackupFileFormat = "json" | "xml" | "xlsx"

export function isBackupFileFormat(v: unknown): v is BackupFileFormat {
  return v === "json" || v === "xml" || v === "xlsx"
}

function escapeXml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function xmlElementName(key: string): string {
  const t = key.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/^([0-9-])/, "_$1")
  return t || "field"
}

/** Spreadsheet tab name rules (Excel). */
function sheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, "_").slice(0, 31) || "Sheet"
}

/**
 * One XML document: metadata + one `<table>` per dataset with `<row>` elements.
 */
export function backupPayloadToXml(payload: BackupPayload): string {
  const parts: string[] = []
  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`)
  parts.push(
    `<petrobook-backup version="${payload.version}" app="${escapeXml(payload.app)}" exportedAt="${escapeXml(payload.exportedAt)}">`,
  )

  if (payload.tableErrors?.length) {
    parts.push("<exportErrors>")
    for (const e of payload.tableErrors) {
      parts.push(`<error table="${escapeXml(e.table)}" message="${escapeXml(e.message)}" />`)
    }
    parts.push("</exportErrors>")
  }

  for (const [tableName, rows] of Object.entries(payload.tables)) {
    parts.push(`<table name="${escapeXml(tableName)}">`)
    const list = Array.isArray(rows) ? rows : []
    for (const row of list) {
      if (row === null || typeof row !== "object") {
        parts.push("<row />")
        continue
      }
      parts.push("<row>")
      for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
        const tag = xmlElementName(k)
        const val =
          v !== null && typeof v === "object" ? escapeXml(JSON.stringify(v)) : escapeXml(v)
        parts.push(`<${tag}>${val}</${tag}>`)
      }
      parts.push("</row>")
    }
    parts.push("</table>")
  }

  parts.push("</petrobook-backup>")
  return parts.join("")
}

/** One workbook, one sheet per table (opens in Excel / LibreOffice). */
export function backupPayloadToXlsxBuffer(payload: BackupPayload): Buffer {
  const wb = XLSX.utils.book_new()

  for (const [tableName, rows] of Object.entries(payload.tables)) {
    const list = Array.isArray(rows) ? rows : []
    let ws: XLSX.WorkSheet
    if (list.length === 0) {
      ws = XLSX.utils.aoa_to_sheet([["(no rows in this table)"]])
    } else {
      ws = XLSX.utils.json_to_sheet(list)
    }
    XLSX.utils.book_append_sheet(wb, ws, sheetName(tableName))
  }

  if (payload.tableErrors?.length) {
    const ws = XLSX.utils.json_to_sheet(payload.tableErrors)
    XLSX.utils.book_append_sheet(wb, ws, sheetName("export_errors"))
  }

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
}
