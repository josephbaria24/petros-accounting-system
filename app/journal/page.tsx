"use client"

import { useState } from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

const accounts = [
  "Cash",
  "Accounts Receivable",
  "Supplies",
  "Rent Expense",
  "Salaries Expense",
  "Accounts Payable",
  "Owner's Equity",
  "Sales Revenue",
  "Utilities Expense"
]

type Entry = {
  id: number
  date: string
  account: string
  description: string
  debit: string
  credit: string
}

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([
    { id: 1, date: "2025-11-21", account: "", description: "", debit: "", credit: "" }
  ])

  const handleAddRow = () => {
    setEntries([...entries, { id: Date.now(), date: "", account: "", description: "", debit: "", credit: "" }])
  }

  const handleChange = (id: number, field: keyof Entry, value: string) => {
    setEntries(prev =>
      prev.map(entry => (entry.id === id ? { ...entry, [field]: value } : entry))
    )
  }

  const total = (key: "debit" | "credit") =>
    entries.reduce((sum, entry) => sum + (parseFloat(entry[key]) || 0), 0)

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Journal Entries</h1>
        <p className="text-muted-foreground">Record and track your transactions. Make sure your debits match credits.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Journal</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right w-[120px]">Debit</TableHead>
                <TableHead className="text-right w-[120px]">Credit</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {entries.map((entry, idx) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Input
                      type="date"
                      value={entry.date}
                      onChange={e => handleChange(entry.id, "date", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={entry.account}
                      onValueChange={value => handleChange(entry.id, "account", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map(acc => (
                          <SelectItem key={acc} value={acc}>
                            {acc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={entry.description}
                      onChange={e => handleChange(entry.id, "description", e.target.value)}
                      placeholder="Memo"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      value={entry.debit}
                      onChange={e => handleChange(entry.id, "debit", e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      value={entry.credit}
                      onChange={e => handleChange(entry.id, "credit", e.target.value)}
                    />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} className="text-right font-bold">
                  Total
                </TableCell>
                <TableCell className="text-right font-bold">
                  {total("debit").toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {total("credit").toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div className="flex justify-end">
            <Button variant="outline" onClick={handleAddRow}>
              + Add Entry Line
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
