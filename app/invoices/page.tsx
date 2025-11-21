"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { saveAs } from "file-saver";

const dummyCustomers = [
  { id: "cust-1", name: "Alex Johnson", email: "alex.johnson@example.com", company: "GlobeTech", status: "inactive", joined: "2023-08-27", balance: 3777.0 },
  { id: "cust-2", name: "Emily Allen", email: "emily.allen@example.com", company: "DataCore", status: "inactive", joined: "2024-07-01", balance: 6890.59 },
  { id: "cust-3", name: "Linda Johnson", email: "linda.johnson@example.com", company: "GlobeTech", status: "inactive", joined: "2025-09-25", balance: 4267.78 },
  { id: "cust-4", name: "Alex Brown", email: "alex.brown@example.com", company: "BlueWave", status: "inactive", joined: "2023-06-18", balance: 6890.39 },
  { id: "cust-5", name: "Chris Davis", email: "chris.davis@example.com", company: "Prime Logistics", status: "active", joined: "2024-07-31", balance: 7712.4 },
  { id: "cust-6", name: "Laura Allen", email: "laura.allen@example.com", company: "BlueWave", status: "inactive", joined: "2024-01-14", balance: 8103.08 },
  { id: "cust-7", name: "Anna Garcia", email: "anna.garcia@example.com", company: "EdgePulse", status: "active", joined: "2024-10-08", balance: 3516.68 },
  { id: "cust-8", name: "Sophia Brown", email: "sophia.brown@example.com", company: "EdgePulse", status: "active", joined: "2023-11-06", balance: 6682.02 },
  { id: "cust-9", name: "Sophia Davis", email: "sophia.davis@example.com", company: "CoreVision", status: "active", joined: "2024-06-30", balance: 6543.72 },
  { id: "cust-10", name: "Jane Smith", email: "jane.smith@example.com", company: "CoreVision", status: "active", joined: "2024-04-24", balance: 8404.13 },
  { id: "cust-11", name: "Sophia Allen", email: "sophia.allen@example.com", company: "TerraDynamics", status: "inactive", joined: "2025-09-09", balance: 6268.64 },
  { id: "cust-12", name: "Laura Clark", email: "laura.clark@example.com", company: "SmartForge", status: "inactive", joined: "2024-03-19", balance: 3201.27 },
  { id: "cust-13", name: "Anna Garcia", email: "anna.garcia@example.com", company: "Infinit Solutions", status: "inactive", joined: "2023-11-02", balance: 9106.83 },
  { id: "cust-14", name: "Emily Martinez", email: "emily.martinez@example.com", company: "TerraDynamics", status: "active", joined: "2024-04-09", balance: 5024.66 },
  { id: "cust-15", name: "Linda King", email: "linda.king@example.com", company: "EdgePulse", status: "inactive", joined: "2024-05-21", balance: 690.96 },
];

type Customer = typeof dummyCustomers[number];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    setCustomers(dummyCustomers);
  }, []);

  const filtered = customers.filter((cust) =>
    cust.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterStatus === "all" || cust.status === filterStatus)
  );

  const handleCreateInvoice = () => {
    alert("Redirecting to invoice creation page...");
  };

  const handleSendReminders = () => {
    alert("Sending reminder emails to overdue customers...");
  };

  const handleDownloadPDFs = () => {
    const url = "/mnt/data/f65dc3bb-a0b1-4b00-9e63-cec8dffb528b.png";
    saveAs("/mnt/data/f65dc3bb-a0b1-4b00-9e63-cec8dffb528b.png", "all-invoices.pdf");
};

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Customers</h1>
        <p className="text-muted-foreground">Manage and view all customer records and billing activity.</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full grid grid-cols-3 md:grid-cols-4 gap-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Customer Overview</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 justify-between">
                <Input
                  placeholder="Search customers..."
                  className="w-full md:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((cust) => (
                    <TableRow key={cust.id}>
                      <TableCell>{cust.name}</TableCell>
                      <TableCell>{cust.company}</TableCell>
                      <TableCell>{cust.email}</TableCell>
                      <TableCell>{cust.status}</TableCell>
                      <TableCell className="text-right">
                        {cust.balance.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-muted-foreground">Shortcuts for commonly used tasks:</p>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleCreateInvoice}>Create New Invoice</Button>
                <Button variant="outline" onClick={handleSendReminders}>Send Reminder Emails</Button>
                <Button variant="outline" onClick={handleDownloadPDFs}>Download All PDFs</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profiles">
          <Card>
            <CardHeader><CardTitle>Customer Profiles</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground">View detailed profiles, contact info, and purchase history.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader><CardTitle>Customer Analytics</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Visualize trends in customer acquisition, revenue, and retention.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
