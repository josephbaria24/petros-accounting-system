import { NextRequest, NextResponse } from "next/server";
import jsPDF from "jspdf";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { createServer } from "@/lib/supabase-server";

import "@/fonts/DejaVuSans-normal.js";
import "@/fonts/DejaVuSans-bold.js";

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, logoBase64 } = await request.json();

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    // Require an authenticated user (prevents URL / body manipulation).
    const authClient = await createServer();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Supabase — Service Role (NO cookies)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*, customers(name, billing_address, email)")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Ownership check (best-effort). If your schema doesn't have created_by, rely on RLS instead.
    // If you add multi-tenant org_id later, check against that here too.
    if ("created_by" in (invoice as any) && (invoice as any).created_by && (invoice as any).created_by !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch items
    const { data: items } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId);

    // ===============================
    // PDF GENERATION — branded redesign
    // ===============================
    const doc = new jsPDF();
    doc.setFont("DejaVuSans", "normal");

    const PAGE_W   = 210;
    const MARGIN   = 15;
    const T_RIGHT  = PAGE_W - MARGIN;   // right edge of content
    const T_W      = T_RIGHT - MARGIN;  // content width

    // ── colour helpers ──────────────────────────────────
    const tc = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);
    const fc = (r: number, g: number, b: number) => doc.setFillColor(r, g, b);
    const dc = (r: number, g: number, b: number) => doc.setDrawColor(r, g, b);

    // Brand palette
    const NAVY  = [26,  47,  78 ] as const;
    const GOLD  = [201, 168, 76 ] as const;
    const DARK  = [30,  41,  59 ] as const;
    const MID   = [100, 116, 139] as const;
    const ALT   = [248, 250, 252] as const;
    const LLINE = [226, 232, 240] as const;
    const CARD  = [245, 247, 250] as const;
    const MUTED = [148, 163, 184] as const;

    const fmtDate = (d: string | null) =>
      d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "N/A";
    const fmtPHP = (n: number) => `\u20b1${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // ── HEADER BAND ─────────────────────────────────────
    const HDR_H = 72;
    fc(...NAVY);  doc.rect(0, 0, PAGE_W, HDR_H, "F");
    fc(...GOLD);  doc.rect(0, HDR_H, PAGE_W, 2.5, "F");
    // Hairline under gold bar (depth)
    dc(18, 32, 52); doc.setLineWidth(0.15);
    doc.line(0, HDR_H + 2.5, PAGE_W, HDR_H + 2.5);

    const LOGO_TOP = 9;
    const LOGO_MAX_H = 28;
    const LOGO_MAX_W = 62;
    let logoBottom = LOGO_TOP + LOGO_MAX_H;
    try {
      let imgData: string | null = null;
      if (logoBase64) {
        imgData = logoBase64;
      } else {
        const lp = path.join(process.cwd(), "public", "logo.png");
        if (fs.existsSync(lp)) imgData = `data:image/png;base64,${fs.readFileSync(lp).toString("base64")}`;
      }
      if (imgData) {
        const ip = doc.getImageProperties(imgData);
        let lH = LOGO_MAX_H, lW = (ip.width * LOGO_MAX_H) / ip.height;
        if (lW > LOGO_MAX_W) { lW = LOGO_MAX_W; lH = (ip.height * LOGO_MAX_W) / ip.width; }
        doc.addImage(imgData, "PNG", MARGIN, LOGO_TOP, lW, lH);
        logoBottom = LOGO_TOP + lH + 3;
      }
    } catch (e) { console.log("Logo error:", e); }

    doc.setFont("DejaVuSans", "normal"); doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("304, 3F, Trigold Business Park, National Highway", MARGIN, logoBottom);
    doc.text("San Pedro, 5300, Puerto Princesa City", MARGIN, logoBottom + 4);

    const status = (invoice.status || "DRAFT").toUpperCase();
    doc.setTextColor(255, 255, 255);
    doc.setFont("DejaVuSans", "bold"); doc.setFontSize(22);
    doc.text("INVOICE", T_RIGHT, 28, { align: "right" });
    doc.setFont("DejaVuSans", "normal"); doc.setFontSize(7);
    doc.setTextColor(226, 232, 240);
    doc.text("Tax document", T_RIGHT, 34, { align: "right" });

    doc.setFont("DejaVuSans", "bold"); doc.setFontSize(7.5);
    const badgeW = Math.max(32, doc.getTextWidth(status) + 9);
    const badgeX = T_RIGHT - badgeW;
    const badgeY = 37;
    fc(...GOLD); doc.roundedRect(badgeX, badgeY, badgeW, 7, 1.2, 1.2, "F");
    tc(...NAVY);
    doc.text(status, badgeX + badgeW / 2, badgeY + 4.8, { align: "center" });

    // ── META + BILL TO (card) ────────────────────────────
    const cardTop = HDR_H + 11;
    const COL2 = 112;
    const meta: [string, string][] = [
      ["Invoice number", String(invoice.invoice_no)],
      ["Issue date", fmtDate(invoice.issue_date)],
      ["Due date", fmtDate(invoice.due_date)],
    ];

    const addrLines = invoice.customers?.billing_address
      ? doc.splitTextToSize(String(invoice.customers.billing_address), 76)
      : [];
    const hLeft = 10 + 8 + meta.length * 11 + 8;
    const hRight =
      10 +
      8 +
      10 +
      (invoice.customers?.email ? 5.5 : 0) +
      (addrLines.length ? addrLines.length * 5.2 : 0) +
      8;
    const cardH = Math.max(hLeft, hRight);
    const cardY = cardTop - 3;

    fc(...CARD);
    doc.roundedRect(MARGIN, cardY, T_W, cardH, 2.5, 2.5, "F");
    dc(...LLINE); doc.setLineWidth(0.25);
    doc.roundedRect(MARGIN, cardY, T_W, cardH, 2.5, 2.5, "S");

    let ly = cardTop + 4;
    doc.setFont("DejaVuSans", "bold"); doc.setFontSize(8); tc(...NAVY);
    doc.text("Invoice details", MARGIN + 5, ly);
    ly += 7;
    meta.forEach(([lbl, val]) => {
      doc.setFont("DejaVuSans", "normal"); doc.setFontSize(7); tc(...MID);
      doc.text(lbl, MARGIN + 5, ly);
      doc.setFont("DejaVuSans", "bold"); doc.setFontSize(9); tc(...DARK);
      doc.text(val, MARGIN + 5, ly + 4);
      ly += 11;
    });

    let billY = cardTop + 4;
    doc.setFont("DejaVuSans", "bold"); doc.setFontSize(8); tc(...NAVY);
    doc.text("Bill to", COL2, billY);
    dc(...GOLD); doc.setLineWidth(0.35);
    doc.line(COL2, billY + 1.8, COL2 + 22, billY + 1.8);
    billY += 8;
    doc.setFont("DejaVuSans", "bold"); doc.setFontSize(10); tc(...DARK);
    doc.text(invoice.customers?.name || "N/A", COL2, billY);
    billY += 6.5;
    if (invoice.customers?.email) {
      doc.setFont("DejaVuSans", "normal"); doc.setFontSize(8); tc(...MID);
      doc.text(invoice.customers.email, COL2, billY);
      billY += 5.5;
    }
    if (addrLines.length) {
      doc.setFont("DejaVuSans", "normal"); doc.setFontSize(8); tc(...MID);
      doc.text(addrLines, COL2, billY);
    }

    let y = cardY + cardH + 12;

    // ── ITEMS TABLE (explicit row tops + baselines for vertical centering) ──
    const CX = {
      num:   MARGIN + 4,
      desc:  MARGIN + 14,
      qty:   T_RIGHT - 74,
      price: T_RIGHT - 40,
      amt:   T_RIGHT - 4,
    };
    const HEADER_H = 6.5;
    const ROW_MIN = 8;
    /** Baseline vertically centred in a row of height h (mm), DejaVu ~8.5pt */
    const baselineInRow = (rowTop: number, h: number) => rowTop + h - 2.4;

    doc.setFont("DejaVuSans", "bold"); doc.setFontSize(9); tc(...NAVY);
    doc.text("Line items", MARGIN, y);
    y += 9;
    dc(...GOLD); doc.setLineWidth(0.4);
    doc.line(MARGIN, y, T_RIGHT, y);
    y += 3.5;

    const drawHeader = (headerTop: number) => {
      fc(...NAVY); doc.rect(MARGIN, headerTop, T_W, HEADER_H, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("DejaVuSans", "bold"); doc.setFontSize(8);
      const t = baselineInRow(headerTop, HEADER_H);
      doc.text("#",           CX.num,   t);
      doc.text("Description", CX.desc,  t);
      doc.text("Qty",         CX.qty,   t, { align: "right" });
      doc.text("Unit price",  CX.price, t, { align: "right" });
      doc.text("Amount",      CX.amt,   t, { align: "right" });
    };

    let headerTop = y;
    drawHeader(headerTop);
    y = headerTop + HEADER_H;

    items?.forEach((item: any, idx: number) => {
      const dLines = doc.splitTextToSize(item.description || "-", CX.qty - CX.desc - 5);
      const textLines = Array.isArray(dLines) ? dLines : [String(dLines)];
      const cellH = Math.max(
        ROW_MIN,
        textLines.length * 5.2 + 3.2
      );

      if (y + cellH > 250) {
        doc.addPage();
        y = 22;
        headerTop = y;
        drawHeader(headerTop);
        y = headerTop + HEADER_H;
      }

      const rowTop = y;

      if (idx % 2 === 1) {
        fc(...ALT); doc.rect(MARGIN, rowTop, T_W, cellH, "F");
      }

      dc(...LLINE); doc.setLineWidth(0.12);
      doc.line(MARGIN, rowTop + cellH, T_RIGHT, rowTop + cellH);

      const lineTotal = item.line_total ?? item.quantity * item.unit_price;
      tc(...DARK);
      doc.setFont("DejaVuSans", "normal"); doc.setFontSize(8.5);

      if (textLines.length === 1) {
        const bl = baselineInRow(rowTop, cellH);
        doc.text(String(idx + 1), CX.num, bl);
        doc.text(textLines[0], CX.desc, bl);
        doc.text(String(item.quantity), CX.qty, bl, { align: "right" });
        doc.text(fmtPHP(Number(item.unit_price)), CX.price, bl, { align: "right" });
        doc.setFont("DejaVuSans", "bold");
        doc.text(fmtPHP(Number(lineTotal)), CX.amt, bl, { align: "right" });
      } else {
        let ly = rowTop + 4;
        textLines.forEach((line: string, li: number) => {
          doc.setFont("DejaVuSans", "normal");
          doc.text(line, CX.desc, ly);
          ly += 5.2;
        });
        const bl = baselineInRow(rowTop, cellH);
        doc.text(String(idx + 1), CX.num, bl);
        doc.text(String(item.quantity), CX.qty, bl, { align: "right" });
        doc.text(fmtPHP(Number(item.unit_price)), CX.price, bl, { align: "right" });
        doc.setFont("DejaVuSans", "bold");
        doc.text(fmtPHP(Number(lineTotal)), CX.amt, bl, { align: "right" });
      }
      doc.setFont("DejaVuSans", "normal");

      y = rowTop + cellH;
    });

    // ── TOTALS ───────────────────────────────────────────
    y += 12;
    const SUM_RIGHT = T_RIGHT - 4;
    const TLBL = T_RIGHT - 72;

    doc.setFont("DejaVuSans", "bold"); doc.setFontSize(9); tc(...NAVY);
    doc.text("Summary", SUM_RIGHT, y, { align: "right" });
    y += 5;
    dc(...GOLD); doc.setLineWidth(0.45);
    doc.line(TLBL, y, SUM_RIGHT, y);
    y += 7;

    const addRow = (lbl: string, val: string) => {
      doc.setFont("DejaVuSans", "normal"); doc.setFontSize(9); tc(...MID);
      doc.text(lbl, TLBL, y);
      doc.text(val, SUM_RIGHT, y, { align: "right" });
      y += 7;
    };

    addRow("Subtotal", fmtPHP(Number(invoice.subtotal ?? 0)));
    const taxTotal = Number(
      (invoice as { tax_total?: number }).tax_total ?? (invoice as { tax_amount?: number }).tax_amount ?? 0
    );
    if (taxTotal > 0)
      addRow("Tax", fmtPHP(taxTotal));
    if (Number(invoice.discount_amount) > 0)
      addRow("Discount", `-${fmtPHP(Number(invoice.discount_amount))}`);

    y += 12;

    const TBX = TLBL - 4;
    const TBW = SUM_RIGHT - TBX + 1;
    const BOX_H = 9;
    const dueTop = y;
    fc(...NAVY);
    doc.roundedRect(TBX, dueTop, TBW, BOX_H, 1.8, 1.8, "F");
    const dueBl = baselineInRow(dueTop, BOX_H);
    doc.setTextColor(255, 255, 255);
    doc.setFont("DejaVuSans", "bold"); doc.setFontSize(9);
    doc.text("Amount due", TLBL + 2, dueBl);
    doc.setFontSize(10);
    const amountDue = Number(
      (invoice as { balance_due?: number }).balance_due ??
        (invoice as { total_amount?: number }).total_amount ??
        Number(invoice.subtotal ?? 0) + taxTotal
    );
    doc.text(fmtPHP(amountDue), SUM_RIGHT - 1, dueBl, { align: "right" });
    tc(...DARK);
    y = dueTop + BOX_H + 10;

    // ── FOOTER (all pages) ───────────────────────────────
    const PAGES = (doc.internal as any).pages.length - 1;
    for (let pg = 1; pg <= PAGES; pg++) {
      doc.setPage(pg);

      dc(...GOLD); doc.setLineWidth(0.4);
      doc.line(MARGIN, 262, T_RIGHT, 262);

      doc.setFont("DejaVuSans", "bold"); doc.setFontSize(7.5); tc(...NAVY);
      doc.text("Questions?", MARGIN, 268);
      doc.setFont("DejaVuSans", "normal"); doc.setFontSize(6.8); tc(...MID);
      doc.text("0917-708-7994  \u2022  info@petrosphere.com.ph  \u2022  Mon\u2013Fri 8:00\u201317:00", MARGIN, 273);

      doc.setFontSize(6.8); tc(...MID);
      doc.text("PETROBOOK", PAGE_W / 2, 268, { align: "center" });
      doc.text(`Page ${pg} of ${PAGES}`, T_RIGHT - 2, 268, { align: "right" });

      tc(...DARK);
    }

    // Output
    const pdfBlob = doc.output("blob");

    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice.invoice_no}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}