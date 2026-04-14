//app\(dashboard)\sales\SalesClient.tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import SalesOverview from "@/components/sales-tabs/sales-overview";
import InvoicesTable from "@/components/sales-tabs/invoice-table";
import PaymentsTable from "@/components/sales-tabs/payments-table";
import CustomersTable from "@/components/sales-tabs/customers-table";

export default function SalesClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabFromURL = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(tabFromURL);

  // Sync tab with URL changes
  useEffect(() => {
    setActiveTab(tabFromURL);
  }, [tabFromURL]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/sales?tab=${value}`, { scroll: false });
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:px-8 lg:py-6 2xl:max-w-[1536px]">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Sales</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Sales</h1>
        <p className="text-sm text-muted-foreground">Invoices, payments, and customers in one place.</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-2 h-10 w-full justify-start gap-1 rounded-xl border border-border/70 bg-muted/40 p-1">
          <TabsTrigger value="overview" className="rounded-lg px-3">
            Overview
          </TabsTrigger>
          <TabsTrigger value="invoices" className="rounded-lg px-3">
            Invoices
          </TabsTrigger>
          <TabsTrigger value="payments" className="rounded-lg px-3">
            Payments
          </TabsTrigger>
          <TabsTrigger value="customers" className="rounded-lg px-3">
            Customers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <SalesOverview />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <InvoicesTable />
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <PaymentsTable />
        </TabsContent>

        <TabsContent value="customers" className="mt-4">
          <CustomersTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
