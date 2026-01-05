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
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Sales</h1>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <SalesOverview />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesTable />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentsTable />
        </TabsContent>

        <TabsContent value="customers">
          <CustomersTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
