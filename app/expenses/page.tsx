"use client"
 
import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Download, UploadCloud } from "lucide-react"
 
export default function ExpensesPage() {
  const [filter, setFilter] = useState("this-month")
 
  const expenses = [
    {
      id: "EXP-001",
      date: "2025-11-05",
      vendor: "Amazon Web Services",
      category: "Cloud Hosting",
      amount: 450,
      status: "Paid"
    },
    {
      id: "EXP-002",
      date: "2025-11-12",
      vendor: "Google Ads",
      category: "Marketing",
      amount: 600,
      status: "Paid"
    },
    {
      id: "EXP-003",
      date: "2025-11-15",
      vendor: "WeWork",
      category: "Office Rent",
      amount: 1200,
      status: "Due"
    }
  ]
 
  const categories = [
    { name: "Marketing", percentage: 35 },
    { name: "Cloud Hosting", percentage: 25 },
    { name: "Office Rent", percentage: 40 }
  ]
 
  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
        <p className="text-muted-foreground">Track, manage, and analyze your business expenses in one place.</p>
      </div>
 
      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full grid grid-cols-4 md:grid-cols-5 gap-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>
 
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">$2,250.00</p>
                <p className="text-sm text-muted-foreground">All-time recorded</p>
              </CardContent>
            </Card>
 
            <Card>
              <CardHeader>
                <CardTitle>This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">$1,150.00</p>
                <p className="text-sm text-muted-foreground">Expenses from Nov 1 – Nov 20</p>
              </CardContent>
            </Card>
 
            <Card>
              <CardHeader>
                <CardTitle>Top Category</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">Office Rent</p>
                <Progress value={40} className="mt-2" />
              </CardContent>
            </Card>
          </div>
 
          {/* Expense Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between gap-4 mb-4 flex-wrap">
                <Input placeholder="Search by vendor..." className="w-full md:w-64" />
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell>{exp.date}</TableCell>
                      <TableCell>{exp.vendor}</TableCell>
                      <TableCell>{exp.category}</TableCell>
                      <TableCell className="text-right">${exp.amount}</TableCell>
                      <TableCell className="text-right">{exp.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
 
        {/* Receipts Tab */}
        <TabsContent value="receipts">
          <Card>
            <CardHeader>
              <CardTitle>Upload Receipts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Upload scanned receipts and match them to expenses.</p>
              <div className="border border-dashed rounded-lg p-6 text-center">
                <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm">Drag and drop your receipt here, or click to browse.</p>
                <Button className="mt-4">Upload Receipt</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
 
        {/* Vendors Tab */}
        <TabsContent value="vendors">
          <Card>
            <CardHeader>
              <CardTitle>Top Vendors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between border-b py-2">
                <span>Amazon Web Services</span>
                <span className="font-medium">$1,200</span>
              </div>
              <div className="flex justify-between border-b py-2">
                <span>Google Ads</span>
                <span className="font-medium">$600</span>
              </div>
              <div className="flex justify-between py-2">
                <span>WeWork</span>
                <span className="font-medium">$1,450</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
 
        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {categories.map((cat, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-1 text-sm font-medium">
                    <span>{cat.name}</span>
                    <span>{cat.percentage}%</span>
                  </div>
                  <Progress value={cat.percentage} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
 
        {/* Insights Tab */}
        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>Smart Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>📈 You spent 25% more in November compared to October.</p>
              <p>🏆 Your top recurring vendor is <strong>WeWork</strong>.</p>
              <p>📂 <strong>Office Rent</strong> continues to be your largest expense category.</p>
              <p>💡 Tip: Set spending limits to avoid going over budget in key categories.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
 