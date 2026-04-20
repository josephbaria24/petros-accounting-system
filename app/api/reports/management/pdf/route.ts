import { NextResponse } from "next/server"
import jsPDF from "jspdf"
import fs from "fs"
import path from "path"

import { createServer } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

type PnLLine = { label: string; amount: number }
type BSLine = { label: string; amount: number }

function toNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function fmtPHP(n: number): string {
  return `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function loadDejaVu(doc: jsPDF) {
  // Embed fonts at runtime so Unicode (₱) renders correctly.
  const base = path.join(process.cwd(), "node_modules", "dejavu-fonts-ttf", "ttf")
  const normalPath = path.join(base, "DejaVuSans.ttf")
  const boldPath = path.join(base, "DejaVuSans-Bold.ttf")
  const normal = fs.readFileSync(normalPath).toString("base64")
  const bold = fs.readFileSync(boldPath).toString("base64")
  doc.addFileToVFS("DejaVuSans.ttf", normal)
  doc.addFont("DejaVuSans.ttf", "DejaVuSans", "normal")
  doc.addFileToVFS("DejaVuSans-Bold.ttf", bold)
  doc.addFont("DejaVuSans-Bold.ttf", "DejaVuSans", "bold")
  doc.setFont("DejaVuSans", "normal")
}

function safeDate(d: string | null | undefined): string {
  if (!d) return ""
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ""
  return dt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

function clampDateIso(s: unknown): string | null {
  if (typeof s !== "string") return null
  const t = s.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null
  return t
}

function addHeader(doc: jsPDF, title: string, subtitle: string) {
  const PAGE_W = doc.internal.pageSize.getWidth()
  doc.setFillColor(24, 63, 115)
  doc.rect(0, 0, PAGE_W, 36, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("DejaVuSans", "bold")
  doc.setFontSize(18)
  doc.text(title, 18, 22)
  doc.setFont("DejaVuSans", "normal")
  doc.setFontSize(10)
  doc.text(subtitle, 18, 30)
  doc.setTextColor(17, 24, 39)
}

function ensurePage(doc: jsPDF, y: number, needed: number) {
  const PAGE_H = doc.internal.pageSize.getHeight()
  if (y + needed <= PAGE_H - 18) return y
  doc.addPage()
  return 20
}

function tableRow(doc: jsPDF, y: number, left: string, right: string, bold = false) {
  const PAGE_W = doc.internal.pageSize.getWidth()
  const L = 18
  const R = PAGE_W - 18
  doc.setFont("DejaVuSans", bold ? "bold" : "normal")
  doc.setFontSize(10)
  doc.text(left, L, y)
  doc.text(right, R, y, { align: "right" })
  doc.setFont("DejaVuSans", "normal")
}

function sectionTitle(doc: jsPDF, y: number, text: string) {
  doc.setFont("DejaVuSans", "bold")
  doc.setFontSize(10)
  doc.text(text.toUpperCase(), 18, y)
  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.25)
  doc.line(18, y + 3, doc.internal.pageSize.getWidth() - 18, y + 3)
  doc.setFont("DejaVuSans", "normal")
}

export async function POST(req: Request) {
  const supabase = await createServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    reportName?: unknown
    companyName?: unknown
    from?: unknown
    to?: unknown
  }

  const reportName = typeof body.reportName === "string" && body.reportName.trim() ? body.reportName.trim() : "Management Report"
  const companyName = typeof body.companyName === "string" && body.companyName.trim() ? body.companyName.trim() : "PetroBook"
  const from = clampDateIso(body.from) ?? new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
  const to = clampDateIso(body.to) ?? new Date().toISOString().slice(0, 10)

  // --------- Data (reuse same operational sources used in the UI) ----------
  const [{ data: inv }, { data: exp }, { data: bills }] = await Promise.all([
    supabase.from("invoices").select("total_amount, issue_date, status").neq("status", "draft").gte("issue_date", from).lte("issue_date", to),
    supabase.from("expenses").select("amount, category, created_at").gte("created_at", from + "T00:00:00").lte("created_at", to + "T23:59:59"),
    supabase.from("bills").select("total_amount, bill_date, status").neq("status", "draft").gte("bill_date", from).lte("bill_date", to),
  ])

  const revenue = (inv || []).reduce((s, i) => s + toNum((i as any).total_amount), 0)

  const expByCat = new Map<string, number>()
  for (const e of exp || []) {
    const cat = String((e as any).category || "Other").trim() || "Other"
    expByCat.set(cat, (expByCat.get(cat) || 0) + toNum((e as any).amount))
  }
  const billTotal = (bills || []).reduce((s, b) => s + toNum((b as any).total_amount), 0)
  if (billTotal) expByCat.set("Bills / Vendor Costs", (expByCat.get("Bills / Vendor Costs") || 0) + billTotal)

  const expenseLines: PnLLine[] = Array.from(expByCat, ([label, amount]) => ({ label, amount }))
    .filter((x) => x.amount !== 0)
    .sort((a, b) => a.label.localeCompare(b.label))

  const totalExpenses = expenseLines.reduce((s, x) => s + x.amount, 0)
  const net = revenue - totalExpenses

  // Balance Sheet (simple, QBO-like): show AR/AP and a cash placeholder, then compute equity plug.
  // For QBO-style look, we prioritize report format over perfect accounting integration.
  const [{ data: unpaidInvoices }, { data: unpaidBills }] = await Promise.all([
    supabase.from("invoices").select("balance_due").in("status", ["sent", "partial", "overdue"]).lte("issue_date", to),
    supabase.from("bills").select("balance_due").in("status", ["unpaid", "partial", "overdue"]).lte("bill_date", to),
  ])
  const ar = (unpaidInvoices || []).reduce((s, r) => s + toNum((r as any).balance_due), 0)
  const ap = (unpaidBills || []).reduce((s, r) => s + toNum((r as any).balance_due), 0)
  const cash = 0

  const assets: BSLine[] = [
    { label: "Cash", amount: cash },
    { label: "Accounts Receivable (A/R)", amount: ar },
  ]
  const liabilities: BSLine[] = [{ label: "Accounts Payable (A/P)", amount: ap }]
  const totalAssets = assets.reduce((s, x) => s + x.amount, 0)
  const totalLiab = liabilities.reduce((s, x) => s + x.amount, 0)
  const equityPlug = totalAssets - totalLiab

  // --------- PDF ----------
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  loadDejaVu(doc)
  const PAGE_W = doc.internal.pageSize.getWidth()

  // Cover
  doc.setFillColor(24, 63, 115)
  doc.rect(0, 0, PAGE_W, 60, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("DejaVuSans", "bold")
  doc.setFontSize(24)
  doc.text(reportName, 18, 34)
  doc.setFont("DejaVuSans", "normal")
  doc.setFontSize(11)
  doc.text(companyName, 18, 44)
  doc.text(`For the period ended ${safeDate(to) || to}`, 18, 52)
  doc.setTextColor(17, 24, 39)

  doc.addPage()

  // TOC
  addHeader(doc, "Table of Contents", `${companyName}`)
  let y = 56
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.text("Profit and Loss", 18, y)
  doc.text("3", PAGE_W - 18, y, { align: "right" })
  y += 10
  doc.text("Balance Sheet", 18, y)
  doc.text("4", PAGE_W - 18, y, { align: "right" })

  // P&L
  doc.addPage()
  addHeader(doc, "Profit and Loss", `${companyName} • ${safeDate(from) || from} – ${safeDate(to) || to}`)
  y = 54
  sectionTitle(doc, y, "Income")
  y += 12
  y = ensurePage(doc, y, 10)
  tableRow(doc, y, "Sales", fmtPHP(revenue))
  y += 10
  tableRow(doc, y, "Total Income", fmtPHP(revenue), true)
  y += 16
  sectionTitle(doc, y, "Expenses")
  y += 12
  for (const line of expenseLines) {
    y = ensurePage(doc, y, 10)
    tableRow(doc, y, line.label, fmtPHP(line.amount))
    y += 9
  }
  y = ensurePage(doc, y, 12)
  tableRow(doc, y, "Total Expenses", fmtPHP(totalExpenses), true)
  y += 14
  doc.setDrawColor(148, 163, 184)
  doc.line(18, y, PAGE_W - 18, y)
  y += 10
  tableRow(doc, y, "NET EARNINGS", fmtPHP(net), true)

  // Balance Sheet
  doc.addPage()
  addHeader(doc, "Balance Sheet", `${companyName} • As of ${safeDate(to) || to}`)
  y = 54
  sectionTitle(doc, y, "Assets")
  y += 12
  for (const a of assets) {
    y = ensurePage(doc, y, 10)
    tableRow(doc, y, a.label, fmtPHP(a.amount))
    y += 9
  }
  y = ensurePage(doc, y, 12)
  tableRow(doc, y, "Total Assets", fmtPHP(totalAssets), true)
  y += 16
  sectionTitle(doc, y, "Liabilities")
  y += 12
  for (const l of liabilities) {
    y = ensurePage(doc, y, 10)
    tableRow(doc, y, l.label, fmtPHP(l.amount))
    y += 9
  }
  y = ensurePage(doc, y, 12)
  tableRow(doc, y, "Total Liabilities", fmtPHP(totalLiab), true)
  y += 16
  sectionTitle(doc, y, "Shareholder's Equity")
  y += 12
  tableRow(doc, y, "Net Income", fmtPHP(net))
  y += 9
  tableRow(doc, y, "Other Equity", fmtPHP(equityPlug - net))
  y += 10
  tableRow(doc, y, "Total Equity", fmtPHP(equityPlug), true)
  y += 12
  doc.setDrawColor(148, 163, 184)
  doc.line(18, y, PAGE_W - 18, y)
  y += 10
  tableRow(doc, y, "Total Liabilities and Shareholder's Equity", fmtPHP(totalLiab + equityPlug), true)

  const pdf = doc.output("arraybuffer")
  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
    },
  })
}

