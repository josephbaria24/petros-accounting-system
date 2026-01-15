"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";
import { Search, TrendingUp, TrendingDown, DollarSign, FileText, ChevronDown, Plus } from "lucide-react";

type Code = {
  id: string;
  code: string;
  name: string;
  description?: string;
};

type IncomeTransaction = {
  id: string;
  invoice_no: string;
  issue_date: string;
  total_amount: number;
  customers: { name: string } | { name: string }[] | null;
  notes?: string | null;
};

type BillTransaction = {
  id: string;
  bill_no: string;
  bill_date: string | null;
  total_amount: number | null;
  suppliers: { name: string } | { name: string }[] | null;
  notes?: string | null;
};

type ExpenseTransaction = {
  id: string;
  category: string | null;
  amount: number;
  created_at: string | null;
  suppliers: { name: string } | { name: string }[] | null;
  notes?: string | null;
};

export default function CodeReportPage() {
  const supabase = createClient();
  const [codes, setCodes] = useState<Code[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCodeDropdown, setShowCodeDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Fetch all codes
  useEffect(() => {
    fetchCodes();
  }, []);

  // Fetch report when code is selected
  useEffect(() => {
    if (selectedCode) {
      fetchReport(selectedCode);
    } else {
      setReportData(null);
    }
  }, [selectedCode]);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("codes")
        .select("*")
        .order("code");

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error("Error fetching codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async (code: string) => {
    setLoadingReport(true);
    try {
      // Helper function to get name from supplier/customer object or array
      const getName = (obj: any): string => {
        if (!obj) return "Unknown";
        if (Array.isArray(obj)) return obj[0]?.name || "Unknown";
        return obj.name || "Unknown";
      };

      // Fetch invoices (income)
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_no,
          issue_date,
          total_amount,
          notes,
          customers!inner (name)
        `)
        .eq("code", code)
        .order("issue_date", { ascending: false });

      if (invoicesError) {
        console.error("Error fetching invoices:", invoicesError);
        throw invoicesError;
      }

      // Fetch bills
      const { data: bills, error: billsError } = await supabase
        .from("bills")
        .select(`
          id,
          bill_no,
          bill_date,
          total_amount,
          notes,
          suppliers!inner (name)
        `)
        .eq("code", code)
        .order("bill_date", { ascending: false });

      if (billsError) {
        console.error("Error fetching bills:", billsError);
        throw billsError;
      }

      // Fetch expenses
      const { data: expenses, error: expensesError } = await supabase
        .from("expenses")
        .select(`
          id,
          category,
          amount,
          notes,
          created_at,
          suppliers!inner (name)
        `)
        .eq("code", code)
        .order("created_at", { ascending: false });

      if (expensesError) {
        console.error("Error fetching expenses:", expensesError);
        throw expensesError;
      }

      // Calculate totals
      const totalIncome = (invoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      
      const totalBills = (bills || []).reduce((sum, bill) => sum + (bill.total_amount || 0), 0);
      const totalExpenses = (expenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const totalExpensesAmount = totalBills + totalExpenses;
      
      const balance = totalIncome - totalExpensesAmount;
      const profitMargin = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(2) : "0.00";

      // Combine bills and expenses for display
      const allExpenses = [
        ...(bills || []).map(bill => ({
          id: bill.id,
          bill_no: bill.bill_no,
          date: bill.bill_date || "",
          amount: bill.total_amount || 0,
          vendor: getName(bill.suppliers),
          description: bill.notes || "Bill payment",
          type: "Bill"
        })),
        ...(expenses || []).map(exp => ({
          id: exp.id,
          bill_no: exp.category || "EXP",
          date: exp.created_at || "",
          amount: exp.amount || 0,
          vendor: getName(exp.suppliers),
          description: exp.notes || exp.category || "Expense",
          type: "Expense"
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setReportData({
        income: invoices || [],
        expenses: allExpenses,
        totalIncome,
        totalExpenses: totalExpensesAmount,
        balance,
        profitMargin
      });
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoadingReport(false);
    }
  };

  const filteredCodes = codes.filter(code => 
    code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    code.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Helper function to get name from supplier/customer object or array
  const getName = (obj: any): string => {
    if (!obj) return "N/A";
    if (Array.isArray(obj)) return obj[0]?.name || "N/A";
    return obj.name || "N/A";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Code-Based Financial Report</h1>
          <p className="text-gray-600">Track income and expenses for specific projects, trainings, or events</p>
        </div>

        {/* Code Selector */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Code
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCodeDropdown(!showCodeDropdown)}
              className="w-full md:w-96 flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <span className={selectedCode ? "text-gray-900" : "text-gray-500"}>
                {loading ? "Loading codes..." : selectedCode || "Choose a code..."}
              </span>
              <ChevronDown className="h-5 w-5 text-gray-400" />
            </button>

            {showCodeDropdown && (
              <div className="absolute z-10 mt-2 w-full md:w-96 bg-white border border-gray-200 rounded-lg shadow-lg">
                <div className="p-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search codes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredCodes.length > 0 ? (
                    filteredCodes.map((code) => (
                      <button
                        key={code.id}
                        type="button"
                        onClick={() => {
                          setSelectedCode(code.code);
                          setShowCodeDropdown(false);
                          setSearchQuery("");
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{code.code}</div>
                        <div className="text-sm text-gray-600">{code.name}</div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-gray-500">
                      {searchQuery ? "No codes found" : "No codes available. Please add codes first."}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Report Content */}
        {loadingReport ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading report...</p>
          </div>
        ) : reportData ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Total Income</span>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(reportData.totalIncome)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {reportData.income.length} transaction{reportData.income.length !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Total Expenses</span>
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(reportData.totalExpenses)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {reportData.expenses.length} transaction{reportData.expenses.length !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Available Balance</span>
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div className={`text-2xl font-bold ${reportData.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(reportData.balance)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Net result
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Profit Margin</span>
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {reportData.profitMargin}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Of total income
                </div>
              </div>
            </div>

            {/* Income Table */}
            <div className="bg-white rounded-lg shadow-sm border mb-6">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Income Transactions</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice No
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.income.length > 0 ? (
                      reportData.income.map((item: IncomeTransaction) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(item.issue_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                            {item.invoice_no}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getName(item.customers)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {item.notes || "Invoice payment"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                            {formatCurrency(item.total_amount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          No income transactions found for this code
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                        Total Income:
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">
                        {formatCurrency(reportData.totalIncome)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Expenses Table */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Expense Transactions</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reference
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.expenses.length > 0 ? (
                      reportData.expenses.map((item: any) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(item.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {item.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                            {item.bill_no}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.vendor}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {item.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          No expense transactions found for this code
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                        Total Expenses:
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 text-right">
                        {formatCurrency(reportData.totalExpenses)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Final Summary */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-sm border border-blue-700 mt-6 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Net Result for {selectedCode}</h3>
                  <p className="text-blue-100 text-sm">
                    {codes.find(c => c.code === selectedCode)?.name}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-blue-100 mb-1">Available Balance</div>
                  <div className={`text-3xl font-bold ${reportData.balance >= 0 ? 'text-white' : 'text-yellow-300'}`}>
                    {formatCurrency(reportData.balance)}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Code Selected</h3>
            <p className="text-gray-600">
              Please select a code from the dropdown above to view the financial report
            </p>
          </div>
        )}
      </div>
    </div>
  );
}