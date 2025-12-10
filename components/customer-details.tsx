"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, Mail, Phone, Globe, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CustomerDetails({
  customer,
  invoices,
  payments,
  attachments,
}: {
  customer: any;
  invoices: any[];
  payments: any[];
  attachments: any[];
}) {
  const [tab, setTab] = useState("transactions");

  const openBalance =
    invoices.reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0) || 0;

  const overdue =
    invoices
      .filter((inv) => inv.status === "overdue")
      .reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0) || 0;


  const router = useRouter();


  return (
    <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-4">
        <Button
            variant="outline"
            onClick={() => router.push("/sales?tab=customers")}
        >
            ← Back to customers
        </Button>
        </div>

      {/* HEADER */}
      <div className="flex items-start justify-between p-6 bg-card rounded-lg shadow">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-3xl font-bold">
            {customer.name?.slice(0, 2).toUpperCase()}
          </div>

          <div>
            <h1 className="text-2xl font-semibold">{customer.name}</h1>
            {customer.company_name && (
              <p className="text-muted-foreground">{customer.company_name}</p>
            )}

            {/* Contact Icons */}
            <div className="flex gap-3 mt-4">
              {customer.email && (
                <a href={`mailto:${customer.email}`}><Mail /></a>
              )}
              {customer.phone && (
                <a href={`tel:${customer.phone}`}><Phone /></a>
              )}
              {customer.website && (
                <a href={customer.website} target="_blank"><Globe /></a>
              )}
            </div>

            {/* Addresses */}
            <div className="mt-6 grid grid-cols-2 gap-6">
              <div>
                <h2 className="font-semibold">Billing address</h2>
                <p className="text-sm text-muted-foreground">
                  {customer.billing_street}<br/>
                  {customer.billing_city} {customer.billing_zip_code}<br/>
                  {customer.billing_province}<br/>
                  {customer.billing_country}
                </p>
              </div>

              <div>
                <h2 className="font-semibold">Shipping address</h2>
                <p className="text-sm text-muted-foreground">
                  {customer.shipping_street}<br/>
                  {customer.shipping_city} {customer.shipping_zip_code}<br/>
                  {customer.shipping_province}<br/>
                  {customer.shipping_country}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-card p-4 rounded-lg border w-64">
          <h3 className="font-semibold">Financial summary</h3>

          <div className="mt-3">
            <p className="text-sm">Open balance</p>
            <p className="text-xl font-bold">PHP {openBalance.toFixed(2)}</p>
          </div>

          <div className="mt-3">
            <p className="text-sm text-red-500">Overdue payments</p>
            <p className="text-xl font-bold text-red-600">
              PHP {overdue.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-6 mt-6 border-b">
        {["transactions", "activity", "statements", "projects", "details", "notes", "tasks"].map((t) => (
          <button
            key={t}
            className={`pb-2 ${
              tab === t ? "border-b-2 border-primary font-semibold" : "text-muted-foreground"
            }`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div className="mt-6">
        {tab === "transactions" && (
          <TransactionList invoices={invoices} payments={payments} />
        )}

        {tab === "notes" && (
          <div className="p-4 bg-card rounded-lg shadow">{customer.notes}</div>
        )}
      </div>
    </div>
  );
}

function TransactionList({ invoices, payments }: { invoices: any[]; payments: any[] }) {
  return (
    <div className="border rounded-lg">
      <table className="w-full text-left">
        <thead className="bg-muted/40">
          <tr>
            <th className="p-3">Date</th>
            <th className="p-3">Type</th>
            <th className="p-3">No.</th>
            <th className="p-3">Amount</th>
            <th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv: any) => (
            <tr key={inv.id} className="border-b">
              <td className="p-3">{inv.issue_date}</td>
              <td className="p-3">Invoice</td>
              <td className="p-3">{inv.invoice_no}</td>
              <td className="p-3">PHP {inv.total_amount}</td>
              <td className="p-3">{inv.status}</td>
            </tr>
          ))}

          {payments.map((pay) => (
            <tr key={pay.id} className="border-b bg-green-50">
              <td className="p-3">{pay.payment_date}</td>
              <td className="p-3">Payment</td>
              <td className="p-3">{pay.reference_no}</td>
              <td className="p-3">PHP {pay.amount}</td>
              <td className="p-3">Closed</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
