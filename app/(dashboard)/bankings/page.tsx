"use client"
 
import { useState } from "react"
import { Banknote, Plus, Wallet, CreditCard, TrendingUp, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
 
const bankingAccounts = [
  {
    id: "1",
    name: "Checking Account",
    type: "Checking",
    balance: 5423.67,
    lastReconciled: "2025-10-15",
    icon: Wallet,
    institution: "Chase Bank",
    currency: "USD"
  },
  {
    id: "2",
    name: "Business Credit",
    type: "Credit Card",
    balance: -1287.34,
    lastReconciled: "2025-10-01",
    icon: CreditCard,
    institution: "Capital One",
    currency: "USD"
  },
  {
    id: "3",
    name: "Savings Account",
    type: "Savings",
    balance: 15000.0,
    lastReconciled: "2025-09-28",
    icon: Banknote,
    institution: "Wells Fargo",
    currency: "USD"
  }
]
 
const transactions = [
  {
    id: "TXN-001",
    date: "2025-11-15",
    description: "Client Payment - Project Alpha",
    amount: 2500,
    type: "Income",
    status: "Cleared",
    account: "Checking Account"
  },
  {
    id: "TXN-002",
    date: "2025-11-12",
    description: "AWS Monthly Hosting",
    amount: -320,
    type: "Expense",
    status: "Uncleared",
    account: "Business Credit"
  },
  {
    id: "TXN-003",
    date: "2025-11-10",
    description: "Software License Renewal",
    amount: -540,
    type: "Expense",
    status: "Cleared",
    account: "Business Credit"
  },
  {
    id: "TXN-004",
    date: "2025-11-08",
    description: "Transfer to Savings",
    amount: -2000,
    type: "Transfer",
    status: "Cleared",
    account: "Checking Account"
  }
]
 
export default function BankingPage() {
  const [activeTab, setActiveTab] = useState("accounts")
 
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Banking Dashboard</h1>
          <p className="text-muted-foreground">Track all your business accounts and transactions in one place.</p>
        </div>
        <Button>
          <Plus className="mr-2 w-4 h-4" />
          Add Transaction
        </Button>
      </div>
 
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
 
        {/* Account Summary */}
        <TabsContent value="accounts">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bankingAccounts.map((account) => (
              <Card key={account.id} className="bg-white shadow-sm hover:shadow-md transition">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-medium">{account.name}</CardTitle>
                  <account.icon className="w-6 h-6 text-emerald-600" />
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <strong>Institution:</strong> {account.institution}
                  </p>
                  <p>
                    <strong>Type:</strong> {account.type}
                  </p>
                  <p>
                    <strong>Currency:</strong> {account.currency}
                  </p>
                  <p>
                    <strong>Balance:</strong>{" "}
                    <span className={account.balance < 0 ? "text-red-600" : "text-emerald-600"}>
                      ${account.balance.toLocaleString()}
                    </span>
                  </p>
                  <p>
                    <strong>Last Reconciled:</strong> {account.lastReconciled}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
 
        {/* Recent Transactions */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell>{txn.date}</TableCell>
                      <TableCell>{txn.description}</TableCell>
                      <TableCell>{txn.account}</TableCell>
                      <TableCell>
                        <span
                          className={
                            txn.type === "Income" ? "text-emerald-600 font-medium" :
                            txn.type === "Expense" ? "text-red-600 font-medium" :
                            "text-blue-600 font-medium"
                          }
                        >
                          {txn.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            txn.status === "Cleared" ? "text-green-500" : "text-yellow-600"
                          }
                        >
                          {txn.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {txn.amount < 0 ? "-" : "+"}${Math.abs(txn.amount).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Separator className="my-6" />
              <div className="text-sm text-muted-foreground">
                Showing {transactions.length} recent transactions. To see full history, connect to your bank feed.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}