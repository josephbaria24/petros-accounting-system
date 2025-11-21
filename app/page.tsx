"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, CreditCard, Filter, Search } from "lucide-react";
import { CalendarDateRangePicker } from "@/components/date-range-picker";
import { createClient } from "@/lib/supabase-client";
import { Database } from "@/lib/supabase-types";

const supabase = createClient();

type Vendor = Database["public"]["Tables"]["vendors"]["Row"];

export default function VendorsDashboard() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVendors() {
      setLoading(true);
      const { data, error } = await supabase.from("vendors").select("*");
      if (error) console.error("Error fetching vendors:", error);
      else setVendors(data);
      setLoading(false);
    }

    fetchVendors();
  }, []);

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
              {loading ? (
                <p>Loading...</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2">Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th className="text-right">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((vendor) => (
                      <tr key={vendor.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 font-medium">{vendor.name}</td>
                        <td>{vendor.email || "-"}</td>
                        <td>{vendor.phone || "-"}</td>
                        <td className="text-right">{new Date(vendor.created_at || '').toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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