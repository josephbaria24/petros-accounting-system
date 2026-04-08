import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

type Frequency = "weekly" | "monthly";

function addInterval(date: Date, frequency: Frequency, interval: number) {
  const d = new Date(date);
  if (frequency === "weekly") {
    d.setDate(d.getDate() + interval * 7);
    return d;
  }
  const day = d.getDate();
  d.setMonth(d.getMonth() + interval);
  if (d.getDate() !== day) d.setDate(0);
  return d;
}

export async function POST(req: Request) {
  const secret = process.env.RECURRING_CRON_SECRET;
  const header = req.headers.get("x-cron-secret");
  if (!secret || header !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const todayStr = new Date().toISOString().slice(0, 10);

  const { data: schedules, error } = await admin
    .from("recurring_invoices" as any)
    .select("*")
    .eq("is_active", true)
    .lte("next_run_date", todayStr);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let created = 0;
  for (const s of schedules ?? []) {
    const template = s.template ?? {};
    const items = Array.isArray(template.items) ? template.items : [];

    const issueDate = todayStr;
    const dueDate = template.dueDate || todayStr;
    const invoiceNo = `INV-${Date.now()}`;

    const subtotal = Number(template.subtotal ?? 0);
    const taxTotal = Number(template.taxTotal ?? 0);
    const total = Number(template.total ?? subtotal + taxTotal);

    const { data: invoice, error: invErr } = await admin
      .from("invoices")
      .insert({
        invoice_no: invoiceNo,
        customer_id: s.customer_id,
        issue_date: issueDate,
        due_date: dueDate,
        subtotal,
        tax_total: taxTotal,
        total_amount: total,
        balance_due: total,
        notes: template.note ?? null,
        // Extra columns may exist in your DB; safe to include if present:
        memo: template.memo ?? null,
        customer_email: template.customerEmail ?? null,
        cc_bcc: template.ccBcc ?? null,
        code: template.selectedCode || null,
        location: template.location ?? null,
        terms: template.terms ?? null,
        invoice_amounts: template.invoiceAmounts ?? null,
        status: "draft",
      } as any)
      .select()
      .single();

    if (invErr) continue;

    const itemsToInsert = items
      .filter((it: any) => it.description || it.quantity > 0 || it.rate > 0)
      .map((it: any) => ({
        invoice_id: invoice.id,
        description: it.description,
        quantity: Number(it.quantity ?? 1),
        unit_price: Number(it.rate ?? 0),
        tax_rate: Number(it.tax ?? 0),
        service_date: it.serviceDate || null,
        product_service: it.productService || null,
        class: it.class || null,
      }));

    if (itemsToInsert.length) {
      await admin.from("invoice_items").insert(itemsToInsert as any);
    }

    const next = addInterval(new Date(s.next_run_date), s.frequency as Frequency, Number(s.interval ?? 1));
    await admin
      .from("recurring_invoices" as any)
      .update({ next_run_date: next.toISOString().slice(0, 10) } as any)
      .eq("id", s.id);

    created += 1;
  }

  return NextResponse.json({ success: true, created });
}

