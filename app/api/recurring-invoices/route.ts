import { NextResponse } from "next/server";
import { createServer } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

type Frequency = "weekly" | "monthly";

function addInterval(date: Date, frequency: Frequency, interval: number) {
  const d = new Date(date);
  if (frequency === "weekly") {
    d.setDate(d.getDate() + interval * 7);
    return d;
  }
  // monthly
  const day = d.getDate();
  d.setMonth(d.getMonth() + interval);
  // JS date overflow handling is fine; keep "same day" as best effort
  if (d.getDate() !== day) {
    // move to last day of previous month if overflowed (e.g., Jan 31 + 1 month)
    d.setDate(0);
  }
  return d;
}

export async function POST(req: Request) {
  const supabase = await createServer();
  const {
    customerId,
    name,
    frequency,
    interval,
    startDate,
    template,
  } = await req.json();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!customerId || !name || !frequency || !interval || !startDate || !template) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const freq: Frequency = frequency;
  if (freq !== "weekly" && freq !== "monthly") {
    return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
  }

  const intervalNum = Number(interval);
  if (!Number.isFinite(intervalNum) || intervalNum < 1 || intervalNum > 52) {
    return NextResponse.json({ error: "Invalid interval" }, { status: 400 });
  }

  const start = new Date(String(startDate));
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: "Invalid startDate" }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);

  let nextRun = start;
  while (nextRun < today) {
    nextRun = addInterval(nextRun, freq, intervalNum);
  }

  const admin = createAdminClient();
  const { error } = await admin.from("recurring_invoices" as any).insert({
    customer_id: customerId,
    name,
    frequency: freq,
    interval: intervalNum,
    start_date: start.toISOString().slice(0, 10),
    next_run_date: nextRun.toISOString().slice(0, 10),
    created_by: auth.user.id,
    template,
    is_active: true,
  } as any);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

