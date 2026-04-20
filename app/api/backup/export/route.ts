import { NextResponse } from "next/server"
import { createServer } from "@/lib/supabase-server"
import { buildBackupPayload } from "@/lib/backup-export"
import {
  backupPayloadToXml,
  backupPayloadToXlsxBuffer,
  isBackupFileFormat,
  type BackupFileFormat,
} from "@/lib/backup-serialize"

export const dynamic = "force-dynamic"

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
}

export async function POST(req: Request) {
  const supabase = await createServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let format: BackupFileFormat = "json"
  if (req.headers.get("content-type")?.includes("application/json")) {
    try {
      const body = (await req.json()) as { format?: unknown }
      if (isBackupFileFormat(body?.format)) format = body.format
    } catch {
      /* keep default */
    }
  }

  const payload = await buildBackupPayload(supabase)
  const t = stamp()

  if (format === "json") {
    const body = JSON.stringify(payload)
    const filename = `petrobook-backup-${t}.json`
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  }

  if (format === "xml") {
    const body = backupPayloadToXml(payload)
    const filename = `petrobook-backup-${t}.xml`
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  }

  const buf = backupPayloadToXlsxBuffer(payload)
  const filename = `petrobook-backup-${t}.xlsx`
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
