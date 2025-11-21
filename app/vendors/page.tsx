"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, CreditCard, Filter, Search } from "lucide-react";
import { CalendarDateRangePicker } from "@/components/date-range-picker";

const dummyVendors = [
  { id: 1, name: "Globe Telecom", email: "billing@globe.com", phone: "09171234567", balance: 3500.0 },
  { id: 2, name: "PLDT", email: "info@pldt.com", phone: "09181234567", balance: 2890.5 },
  { id: 3, name: "Amazon Web Services", email: "support@aws.com", phone: "09171230000", balance: 10500.0 },
  { id: 4, name: "Palawan Electric Co.", email: "contact@paleco.ph", phone: "09192345678", balance: 4600.75 },
  { id: 5, name: "Zoom Video", email: "billing@zoom.us", phone: "09175555555", balance: 1200.0 },
  { id: 6, name: "Smart Communications", email: "help@smart.com.ph", phone: "09191231234", balance: 3100.0 },
  { id: 7, name: "Google Workspace", email: "support@google.com", phone: "09171239999", balance: 9800.0 },
  { id: 8, name: "Jollibee Corp.", email: "vendor@jollibee.com", phone: "09190001234", balance: 1500.75 },
  { id: 9, name: "Lazada PH", email: "biz@lazada.com.ph", phone: "09198887777", balance: 2390.0 },
  { id: 10, name: "Shopee PH", email: "accounts@shopee.ph", phone: "09179998888", balance: 2100.0 }
];

export default function VendorsDashboard() {
  const [vendors] = useState(dummyVendors);
  const totalBalance = vendors.reduce((acc, v) => acc + v.balance, 0);

  return (
    <div className="flex flex-col min-h-screen p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Vendors</h2>
        <div className="flex gap-2">
          <CalendarDateRangePicker />
          <Button variant="default">
            <Plus className="mr-2 h-4 w-4" />
            Add Vendor
          </Button>
        </div>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">
            <FileText className="mr-2 h-4 w-4" /> List View
          </TabsTrigger>
          <TabsTrigger value="summary">
            <CreditCard className="mr-2 h-4 w-4" /> Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <CardTitle>All Vendors</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Search className="mr-2 h-4 w-4" /> Search
                </Button>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" /> Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th className="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor) => (
                    <tr key={vendor.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 font-medium">{vendor.name}</td>
                      <td>{vendor.email}</td>
                      <td>{vendor.phone}</td>
                      <td className="text-right">₱{vendor.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Total Vendor Balances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">₱{totalBalance.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Number of Vendors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">{vendors.length}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}