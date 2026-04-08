"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const chartOfAccounts = [
  { id: 1, name: "Cash on Hand", type: "Asset", detail: "Petty cash or undeposited funds", balance: 12000.0, status: "active" },
  { id: 2, name: "Bank", type: "Asset", detail: "Business checking account", balance: 45000.0, status: "active" },
  { id: 3, name: "Accounts Receivable", type: "Asset", detail: "Money customers owe you", balance: 8700.5, status: "active" },
  { id: 4, name: "Office Supplies", type: "Expense", detail: "Stationery and office materials", balance: 530.75, status: "active" },
  { id: 5, name: "Salaries and Wages", type: "Expense", detail: "Employee compensation", balance: 15200.0, status: "active" },
  { id: 6, name: "Accounts Payable", type: "Liability", detail: "Bills you owe suppliers", balance: -3900.0, status: "active" },
  { id: 7, name: "Sales Income", type: "Income", detail: "Revenue from product sales", balance: 128000.75, status: "active" },
  { id: 8, name: "Consulting Income", type: "Income", detail: "Revenue from consulting", balance: 23400.0, status: "active" },
  { id: 9, name: "Rent Expense", type: "Expense", detail: "Monthly office rental", balance: 9600.0, status: "active" },
  { id: 10, name: "Utilities", type: "Expense", detail: "Electricity, water, internet", balance: 2300.25, status: "active" },
  { id: 11, name: "Retained Earnings", type: "Equity", detail: "Profits reinvested in the business", balance: 47000.0, status: "active" },
  { id: 12, name: "Loans Payable", type: "Liability", detail: "Outstanding business loans", balance: -12000.0, status: "active" },
];

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState(chartOfAccounts);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const filtered = accounts.filter((acc) =>
    acc.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterType === "all" || acc.type === filterType)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Chart of Accounts</h1>
        <p className="text-muted-foreground">Manage, categorize, and track all your financial accounts in one place.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Account List</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 justify-between">
            <Input
              placeholder="Search accounts..."
              className="w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Account Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Asset">Asset</SelectItem>
                <SelectItem value="Liability">Liability</SelectItem>
                <SelectItem value="Income">Income</SelectItem>
                <SelectItem value="Expense">Expense</SelectItem>
                <SelectItem value="Equity">Equity</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((acc) => (
                <TableRow key={acc.id}>
                  <TableCell>{acc.name}</TableCell>
                  <TableCell>{acc.type}</TableCell>
                  <TableCell>{acc.detail}</TableCell>
                  <TableCell>{acc.status}</TableCell>
                  <TableCell className="text-right">
                    {acc.balance.toLocaleString("en-US", {
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
    </div>
  );
}