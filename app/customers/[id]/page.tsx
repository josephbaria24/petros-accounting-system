//app\customers\[id]\page.tsx

import CustomerDetails from "@/components/customer-details";
import { createServer } from "@/lib/supabase-server";

export default async function CustomerPage({ params }: { params: { id: string } }) {
  const supabase = await createServer();

  // 1️⃣ Fetch the customer
  const { data: customer, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!customer) {
    return <div className="p-10">Customer not found.</div>;
  }

  // 2️⃣ Fetch the customer's transactions
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("customer_id", params.id)
    .order("issue_date", { ascending: false });

  const { data: payments } = await supabase
    .from("payments")
    .select("*, invoices(invoice_no)")
    .order("payment_date", { ascending: false });

  const customerPayments = payments?.filter(
    (p) => invoices?.some((inv) => inv.id === p.invoice_id)
  );

  // 3️⃣ Attachments
  const { data: attachments } = await supabase
    .from("customer_attachments")
    .select("*")
    .eq("customer_id", params.id);

  return (
    <CustomerDetails
      customer={customer}
      invoices={invoices || []}
      payments={customerPayments || []}
      attachments={attachments || []}
    />
  );
}
