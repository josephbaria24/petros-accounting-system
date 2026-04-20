"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";
import {
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  ChevronDown,
  Scale,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Types for Code-Based Report ────────────────────────────────────────────
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

// ─── Types for new reports ───────────────────────────────────────────────────
type DateRange = { from: string; to: string };

type PnLLineItem = { label: string; amount: number };
type PnLSection = { items: PnLLineItem[]; total: number };

type PnLData = {
  incomeSection: PnLSection;
  costOfSalesSection: PnLSection;
  grossProfit: number;
  expensesSection: PnLSection;
  otherExpensesSection: PnLSection;
  netEarnings: number;
};

type BSLineItem = { label: string; amount: number };
type BSSubGroup = { label: string; items: BSLineItem[]; total: number };

type BalanceSheetData = {
  arSubGroup: BSSubGroup;
  currentAssetItems: BSLineItem[];
  currentAssetsTotal: number;
  longTermAssetItems: BSLineItem[];
  longTermAssetsTotal: number;
  totalAssets: number;

  apSubGroup: BSSubGroup;
  currentLiabilityItems: BSLineItem[];
  currentLiabilitiesTotal: number;
  nonCurrentLiabilityItems: BSLineItem[];
  nonCurrentLiabilitiesTotal: number;
  totalLiabilities: number;

  equityItems: BSLineItem[];
  totalEquity: number;

  totalLiabilitiesAndEquity: number;
};

type ARAgingRow = {
  customerId: string;
  customerName: string;
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days90plus: number;
  total: number;
};

type TopTab = "standard" | "custom" | "management";
type StandardSubTab = "code-report" | "profit-loss" | "balance-sheet" | "ar-aging";

type CustomReport = {
  id: string;
  name: string;
  createdBy: string;
  lastModifiedBy: string;
  dateRange: string;
  access: "Private" | "Shared";
  createdAt: string;
};

type ManagementReport = {
  id: string;
  name: string;
  createdBy: string;
  lastModified: string;
  builtIn: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getDateRange(period: string): DateRange {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const quarter = Math.floor(month / 3);

  switch (period) {
    case "this-month":
      return {
        from: new Date(year, month, 1).toISOString().split("T")[0],
        to: new Date(year, month + 1, 0).toISOString().split("T")[0],
      };
    case "this-quarter":
      return {
        from: new Date(year, quarter * 3, 1).toISOString().split("T")[0],
        to: new Date(year, quarter * 3 + 3, 0).toISOString().split("T")[0],
      };
    case "last-year":
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
    default: // this-year
      return { from: `${year}-01-01`, to: `${year}-12-31` };
  }
}

/** Local YYYY-MM-DD (avoids UTC shift from toISOString). */
function localISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfWeekMonday(base: Date): Date {
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + diff);
}

function endOfWeekSunday(base: Date): Date {
  const s = startOfWeekMonday(base);
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6);
}

/** Maps Management report "REPORT PERIOD" labels to [from, to] inclusive. */
function getManagementPeriodRange(period: string): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (period) {
    case "All dates":
      return { from: "1970-01-01", to: localISODate(now) };
    case "Custom":
      return { from: localISODate(now), to: localISODate(now) };
    case "Today":
      return { from: localISODate(now), to: localISODate(now) };
    case "Yesterday": {
      const yest = new Date(y, m, d - 1);
      return { from: localISODate(yest), to: localISODate(yest) };
    }
    case "This week":
      return { from: localISODate(startOfWeekMonday(now)), to: localISODate(endOfWeekSunday(now)) };
    case "This week to date":
      return { from: localISODate(startOfWeekMonday(now)), to: localISODate(now) };
    case "Last week": {
      const prev = new Date(y, m, d - 7);
      return {
        from: localISODate(startOfWeekMonday(prev)),
        to: localISODate(endOfWeekSunday(prev)),
      };
    }
    case "Last week to date": {
      const s = startOfWeekMonday(new Date(y, m, d - 7));
      const end = new Date(Math.min(now.getTime(), endOfWeekSunday(s).getTime()));
      return { from: localISODate(s), to: localISODate(end) };
    }
    case "This month":
      return { from: localISODate(new Date(y, m, 1)), to: localISODate(new Date(y, m + 1, 0)) };
    case "This month to date":
      return { from: localISODate(new Date(y, m, 1)), to: localISODate(now) };
    case "Last month": {
      const lm = m === 0 ? 11 : m - 1;
      const ly = m === 0 ? y - 1 : y;
      return { from: localISODate(new Date(ly, lm, 1)), to: localISODate(new Date(ly, lm + 1, 0)) };
    }
    case "Last month to date": {
      const lm = m === 0 ? 11 : m - 1;
      const ly = m === 0 ? y - 1 : y;
      const lastDay = new Date(ly, lm + 1, 0).getDate();
      const dayPick = Math.min(d, lastDay);
      return {
        from: localISODate(new Date(ly, lm, 1)),
        to: localISODate(new Date(ly, lm, dayPick)),
      };
    }
    case "This quarter": {
      const q = Math.floor(m / 3);
      return {
        from: localISODate(new Date(y, q * 3, 1)),
        to: localISODate(new Date(y, q * 3 + 3, 0)),
      };
    }
    case "This quarter to date":
      return { from: localISODate(new Date(y, Math.floor(m / 3) * 3, 1)), to: localISODate(now) };
    case "Last quarter": {
      const cq = Math.floor(m / 3);
      const lq = cq === 0 ? 3 : cq - 1;
      const ly = cq === 0 ? y - 1 : y;
      const startM = lq * 3;
      return {
        from: localISODate(new Date(ly, startM, 1)),
        to: localISODate(new Date(ly, startM + 3, 0)),
      };
    }
    case "Last quarter to date": {
      const cq = Math.floor(m / 3);
      const lq = cq === 0 ? 3 : cq - 1;
      const ly = cq === 0 ? y - 1 : y;
      const startM = lq * 3;
      return { from: localISODate(new Date(ly, startM, 1)), to: localISODate(now) };
    }
    case "This year":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "This year to date":
      return { from: `${y}-01-01`, to: localISODate(now) };
    case "This year to last month": {
      const lm = m === 0 ? 11 : m - 1;
      const ly = m === 0 ? y - 1 : y;
      return { from: `${y}-01-01`, to: localISODate(new Date(ly, lm + 1, 0)) };
    }
    case "Last year":
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    case "Last year to date": {
      const ly = y - 1;
      const endTry = new Date(ly, m, d);
      const end =
        endTry.getMonth() !== m ? new Date(ly, m + 1, 0) : endTry;
      return { from: `${ly}-01-01`, to: localISODate(end) };
    }
    case "Recent":
      return { from: localISODate(new Date(y, m, d - 7)), to: localISODate(now) };
    case "Since 30 days ago":
      return { from: localISODate(new Date(y, m, d - 30)), to: localISODate(now) };
    case "Since 60 days ago":
      return { from: localISODate(new Date(y, m, d - 60)), to: localISODate(now) };
    case "Since 90 days ago":
      return { from: localISODate(new Date(y, m, d - 90)), to: localISODate(now) };
    case "Since 365 days ago":
      return { from: localISODate(new Date(y, m, d - 365)), to: localISODate(now) };
    case "Next week": {
      const next = new Date(y, m, d + 7);
      return {
        from: localISODate(startOfWeekMonday(next)),
        to: localISODate(endOfWeekSunday(next)),
      };
    }
    case "Next 4 weeks":
      return { from: localISODate(now), to: localISODate(new Date(y, m, d + 28)) };
    case "Next month": {
      const nm = m === 11 ? 0 : m + 1;
      const ny = m === 11 ? y + 1 : y;
      return { from: localISODate(new Date(ny, nm, 1)), to: localISODate(new Date(ny, nm + 1, 0)) };
    }
    case "Next quarter": {
      const cq = Math.floor(m / 3);
      const nq = cq === 3 ? 0 : cq + 1;
      const ny = cq === 3 ? y + 1 : y;
      return {
        from: localISODate(new Date(ny, nq * 3, 1)),
        to: localISODate(new Date(ny, nq * 3 + 3, 0)),
      };
    }
    case "Next year":
      return { from: `${y + 1}-01-01`, to: `${y + 1}-12-31` };
    default:
      return { from: `${y}-01-01`, to: localISODate(now) };
  }
}

// ─── P&L Row helper ──────────────────────────────────────────────────────────
function PnlRow({
  label,
  amount,
  depth = 0,
  isSection = false,
  isTotal = false,
  isGross = false,
  isNet = false,
  collapsed,
  onToggle,
  dash = false,
}: {
  label: string;
  amount?: number;
  depth?: number;
  isSection?: boolean;
  isTotal?: boolean;
  isGross?: boolean;
  isNet?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  dash?: boolean;
}) {
  const padMap: Record<number, string> = { 0: "px-6", 1: "px-10", 2: "px-14" };
  const pl = padMap[depth] ?? "px-16";

  const fmtAmt = (v: number) =>
    `${v < 0 ? "-" : ""}₱${Math.abs(v).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (isNet) {
    return (
      <tr className="border-t-2 border-foreground/30 bg-secondary/40">
        <td className="px-6 py-2 font-bold text-foreground">{label}</td>
        <td className={`px-6 py-2 text-right font-bold ${amount !== undefined && amount < 0 ? "text-red-600" : "text-foreground"}`}>
          {amount !== undefined ? fmtAmt(amount) : ""}
        </td>
      </tr>
    );
  }

  if (isGross) {
    return (
      <tr className="border-t bg-secondary/20">
        <td className="px-6 py-2 font-semibold text-foreground">{label}</td>
        <td className={`px-6 py-2 text-right font-semibold ${amount !== undefined && amount < 0 ? "text-red-600" : "text-foreground"}`}>
          {amount !== undefined ? fmtAmt(amount) : ""}
        </td>
      </tr>
    );
  }

  if (isTotal) {
    return (
      <tr className="border-t">
        <td className={`${pl} py-1.5 font-semibold text-foreground/80`}>{label}</td>
        <td className={`px-6 py-1.5 text-right font-semibold ${amount !== undefined && amount < 0 ? "text-red-600" : "text-foreground"}`}>
          {amount !== undefined ? fmtAmt(amount) : ""}
        </td>
      </tr>
    );
  }

  if (isSection) {
    return (
      <tr className="border-t bg-secondary/30 cursor-pointer select-none" onClick={onToggle}>
        <td className={`${pl} py-2 font-semibold text-foreground flex items-center gap-1`}>
          <svg className={`h-3 w-3 shrink-0 transition-transform ${collapsed ? "-rotate-90" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {label}
        </td>
        <td className="px-6 py-2"></td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-secondary/30 border-t border-gray-50">
      <td className={`${pl} py-1.5 text-foreground/80`}>{label}</td>
      <td className={`px-6 py-1.5 text-right ${dash ? "text-foreground/40" : amount !== undefined && amount < 0 ? "text-red-600" : "text-foreground"}`}>
        {dash ? "—" : amount !== undefined ? fmtAmt(amount) : ""}
      </td>
    </tr>
  );
}

// ─── Balance Sheet Row helper ────────────────────────────────────────────────
function BsRow({
  depth = 0,
  label,
  amount,
  isSection = false,
  isTotal = false,
  isSectionTotal = false,
  muted = false,
  collapsed,
  onToggle,
}: {
  depth?: number;
  label: string;
  amount?: number;
  isSection?: boolean;
  isTotal?: boolean;
  isSectionTotal?: boolean;
  muted?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const paddingMap: Record<number, string> = { 0: "px-4", 1: "px-8", 2: "px-12", 3: "px-16" };
  const pl = paddingMap[depth] ?? "px-20";

  const formatAmt = (v: number) =>
    `${v < 0 ? "-" : ""}₱${Math.abs(v).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (isSectionTotal) {
    return (
      <tr className="border-t-2 border-foreground/20 bg-secondary/30">
        <td className={`${pl} py-2 font-bold text-foreground`}>{label}</td>
        <td className={`px-6 py-2 text-right font-bold ${amount !== undefined && amount < 0 ? "text-red-600" : "text-foreground"}`}>
          {amount !== undefined ? formatAmt(amount) : ""}
        </td>
      </tr>
    );
  }

  if (isTotal) {
    return (
      <tr className="border-t">
        <td className={`${pl} py-1.5 font-semibold text-foreground/80`}>{label}</td>
        <td className={`px-6 py-1.5 text-right font-semibold ${amount !== undefined && amount < 0 ? "text-red-600" : "text-foreground"}`}>
          {amount !== undefined ? formatAmt(amount) : ""}
        </td>
      </tr>
    );
  }

  if (isSection) {
    return (
      <tr className={`border-t ${depth === 0 ? "bg-secondary/40" : ""} cursor-pointer select-none`} onClick={onToggle}>
        <td className={`${pl} py-2 font-semibold text-foreground flex items-center gap-1`}>
          <svg
            className={`h-3 w-3 shrink-0 transition-transform ${collapsed ? "-rotate-90" : ""}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {label}
        </td>
        <td className="px-6 py-2"></td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-secondary/30 border-t border-gray-50">
      <td className={`${pl} py-1.5 ${muted ? "text-foreground/40 italic" : "text-foreground/80"}`}>{label}</td>
      <td className={`px-6 py-1.5 text-right ${muted ? "text-foreground/40" : amount !== undefined && amount < 0 ? "text-red-600" : "text-foreground"}`}>
        {amount !== undefined ? formatAmt(amount) : ""}
      </td>
    </tr>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const supabase = createClient();
  const [topTab, setTopTab] = useState<TopTab>("standard");
  const [activeTab, setActiveTab] = useState<StandardSubTab>("code-report");

  // ── Custom Reports state ─────────────────────────────────────────────────
  const [customReports, setCustomReports] = useState<CustomReport[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [customSearch, setCustomSearch] = useState("");

  // ── Management Reports ────────────────────────────────────────────────────
  const managementReportRows: ManagementReport[] = [
    { id: "company-overview", name: "Company Overview", createdBy: "PetroBook", lastModified: "", builtIn: true },
    { id: "sales-performance", name: "Sales Performance", createdBy: "PetroBook", lastModified: "", builtIn: true },
    { id: "expenses-performance", name: "Expenses Performance", createdBy: "PetroBook", lastModified: "", builtIn: true },
  ];
  const [managementPeriodById, setManagementPeriodById] = useState<Record<string, string>>(() =>
    Object.fromEntries(managementReportRows.map((r) => [r.id, "This year"]))
  );
  const [mgmtActionMenu, setMgmtActionMenu] = useState<string | null>(null);
  const [mgmtDialogOpen, setMgmtDialogOpen] = useState(false);
  const [mgmtDialogLoading, setMgmtDialogLoading] = useState(false);
  const [mgmtDialogTitle, setMgmtDialogTitle] = useState("");
  const [mgmtDialogPeriodLabel, setMgmtDialogPeriodLabel] = useState("");
  const [mgmtDialogRange, setMgmtDialogRange] = useState({ from: "", to: "" });
  const [mgmtDialogLines, setMgmtDialogLines] = useState<{ label: string; value: string }[]>([]);

  // ── Create Management Report state ─────────────────────────────────────
  const [createMgmtOpen, setCreateMgmtOpen] = useState(false);
  const [createMgmtPage, setCreateMgmtPage] = useState<"cover" | "toc" | "preliminary" | "reports">("cover");
  const [createMgmtName, setCreateMgmtName] = useState("");
  const [createMgmtPeriod, setCreateMgmtPeriod] = useState("This year");
  const [createMgmtCover, setCreateMgmtCover] = useState({
    title: "Management Report",
    subtitle: "Petrosphere Accounting",
    reportPeriod: "For the period ended [Report end date]",
    preparedOn: new Date().toISOString().split("T")[0],
    preparedBy: "",
    disclaimer: "",
  });

  // ── Code-based report state ──────────────────────────────────────────────
  const [codes, setCodes] = useState<Code[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCodeDropdown, setShowCodeDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // ── P&L state ───────────────────────────────────────────────────────────
  const [pnlPeriod, setPnlPeriod] = useState("this-year");
  const [pnlDateRange, setPnlDateRange] = useState<DateRange>(getDateRange("this-year"));
  const [pnlData, setPnlData] = useState<PnLData | null>(null);
  const [loadingPnl, setLoadingPnl] = useState(false);
  const [pnlMethod, setPnlMethod] = useState<"cash" | "accrual">("accrual");
  const [pnlCollapsed, setPnlCollapsed] = useState<Record<string, boolean>>({});

  // ── Balance Sheet state ──────────────────────────────────────────────────
  const [bsPeriod, setBsPeriod] = useState("this-year-to-date");
  const [bsFrom, setBsFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [bsTo, setBsTo] = useState(new Date().toISOString().split("T")[0]);
  const [bsMethod, setBsMethod] = useState<"cash" | "accrual">("accrual");
  const [bsData, setBsData] = useState<BalanceSheetData | null>(null);
  const [loadingBs, setLoadingBs] = useState(false);
  const [bsCollapsed, setBsCollapsed] = useState<Record<string, boolean>>({});

  // ── AR Aging state ───────────────────────────────────────────────────────
  const [arAgingData, setArAgingData] = useState<ARAgingRow[]>([]);
  const [loadingArAging, setLoadingArAging] = useState(false);
  const [arAgingPeriod, setArAgingPeriod] = useState("today");
  const [arAgingAsOf, setArAgingAsOf] = useState(new Date().toISOString().split("T")[0]);

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => { fetchCodes(); }, []);
  useEffect(() => { if (selectedCode) fetchReport(selectedCode); else setReportData(null); }, [selectedCode]);

  useEffect(() => {
    if (activeTab === "profit-loss") fetchPnL(pnlDateRange.from, pnlDateRange.to);
  }, [activeTab, pnlDateRange]);

  useEffect(() => {
    if (activeTab === "balance-sheet") fetchBalanceSheet(bsTo);
  }, [activeTab, bsTo]);

  useEffect(() => {
    if (activeTab === "ar-aging") fetchARAging();
  }, [activeTab, arAgingAsOf]);

  // ── Code-based report fetchers ───────────────────────────────────────────
  const fetchCodes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("codes").select("*").order("code");
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
      const getName = (obj: any): string => {
        if (!obj) return "Unknown";
        if (Array.isArray(obj)) return obj[0]?.name || "Unknown";
        return obj.name || "Unknown";
      };

      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select(`id, invoice_no, issue_date, total_amount, notes, customers!inner (name)`)
        .eq("code", code)
        .order("issue_date", { ascending: false });
      if (invoicesError) throw invoicesError;

      const { data: bills, error: billsError } = await supabase
        .from("bills")
        .select(`id, bill_no, bill_date, total_amount, notes, suppliers!inner (name)`)
        .eq("code", code)
        .order("bill_date", { ascending: false });
      if (billsError) throw billsError;

      const { data: expenses, error: expensesError } = await supabase
        .from("expenses")
        .select(`id, category, amount, notes, created_at, suppliers!inner (name)`)
        .eq("code", code)
        .order("created_at", { ascending: false });
      if (expensesError) throw expensesError;

      const totalIncome = (invoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const totalBills = (bills || []).reduce((sum, bill) => sum + (bill.total_amount || 0), 0);
      const totalExpenses = (expenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const totalExpensesAmount = totalBills + totalExpenses;
      const balance = totalIncome - totalExpensesAmount;
      const profitMargin = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(2) : "0.00";

      const allExpenses = [
        ...(bills || []).map((bill) => ({
          id: bill.id,
          bill_no: bill.bill_no,
          date: bill.bill_date || "",
          amount: bill.total_amount || 0,
          vendor: getName(bill.suppliers),
          description: bill.notes || "Bill payment",
          type: "Bill",
        })),
        ...(expenses || []).map((exp) => ({
          id: exp.id,
          bill_no: exp.category || "EXP",
          date: exp.created_at || "",
          amount: exp.amount || 0,
          vendor: getName(exp.suppliers),
          description: exp.notes || exp.category || "Expense",
          type: "Expense",
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setReportData({ income: invoices || [], expenses: allExpenses, totalIncome, totalExpenses: totalExpensesAmount, balance, profitMargin });
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoadingReport(false);
    }
  };

  // ── P&L fetcher ──────────────────────────────────────────────────────────
  const fetchPnL = async (from: string, to: string) => {
    setLoadingPnl(true);
    try {
      const [{ data: invoices }, { data: expenses }, { data: bills }] = await Promise.all([
        supabase.from("invoices").select("total_amount").neq("status", "draft").gte("issue_date", from).lte("issue_date", to),
        supabase.from("expenses").select("amount, category").gte("created_at", from).lte("created_at", to),
        supabase.from("bills").select("total_amount").neq("status", "draft").gte("bill_date", from).lte("bill_date", to),
      ]);

      // Income / expenses from the same operational tables as Sales and Expenses screens (not the GL alone).
      const invoiceTotal = (invoices || []).reduce((s, i) => s + (i.total_amount || 0), 0);
      const incomeItems: PnLLineItem[] = [];
      if (invoiceTotal !== 0) incomeItems.push({ label: "Sales", amount: invoiceTotal });
      const totalIncome = incomeItems.reduce((s, i) => s + i.amount, 0);

      const expenseItems: PnLLineItem[] = [];
      const expByCat: Record<string, number> = {};
      for (const e of expenses || []) {
        const cat = e.category || "Other";
        expByCat[cat] = (expByCat[cat] || 0) + e.amount;
      }
      for (const [label, amount] of Object.entries(expByCat)) expenseItems.push({ label, amount });
      const billsTotal = (bills || []).reduce((s, b) => s + (b.total_amount || 0), 0);
      if (billsTotal > 0) expenseItems.push({ label: "Bills / Vendor Costs", amount: billsTotal });
      expenseItems.sort((a, b) => a.label.localeCompare(b.label));
      const totalExpenses = expenseItems.reduce((s, i) => s + i.amount, 0);

      setPnlData({
        incomeSection: { items: incomeItems, total: totalIncome },
        costOfSalesSection: { items: [], total: 0 },
        grossProfit: totalIncome,
        expensesSection: { items: expenseItems, total: totalExpenses },
        otherExpensesSection: { items: [], total: 0 },
        netEarnings: totalIncome - totalExpenses,
      });
    } catch (e) {
      console.error("Error fetching P&L:", e);
    } finally {
      setLoadingPnl(false);
    }
  };

  // ── Balance Sheet fetcher ─────────────────────────────────────────────────
  const fetchBalanceSheet = async (asOfDate: string) => {
    setLoadingBs(true);
    try {
      const [
        { data: unpaidInvoices },
        { data: unpaidBills },
        { data: assetAccounts },
        { data: journalLines },
        { data: allInvoices },
        { data: allExpenses },
        { data: allBills },
      ] = await Promise.all([
        supabase.from("invoices").select("balance_due").in("status", ["sent", "partial", "overdue"]).lte("issue_date", asOfDate),
        supabase.from("bills").select("balance_due").in("status", ["unpaid", "partial", "overdue"]).lte("bill_date", asOfDate),
        supabase.from("accounts").select("id, name").eq("type", "asset").order("name"),
        supabase.from("journal_lines").select("account_id, debit, credit"),
        supabase.from("invoices").select("total_amount").neq("status", "draft").lte("issue_date", asOfDate),
        supabase.from("expenses").select("amount").lte("created_at", asOfDate),
        supabase.from("bills").select("total_amount").neq("status", "draft").lte("bill_date", asOfDate),
      ]);

      // Journal-based balance per account (debit − credit), same raw sum as before
      const journalBalances: Record<string, number> = {};
      for (const line of journalLines || []) {
        if (!line.account_id) continue;
        journalBalances[line.account_id] =
          (journalBalances[line.account_id] || 0) + (line.debit || 0) - (line.credit || 0);
      }

      // AR sub-group (open invoices only)
      const arTotal = (unpaidInvoices || []).reduce((s, i) => s + (i.balance_due || 0), 0);
      const arSubGroup: BSSubGroup = {
        label: "Accounts Receivable",
        items: arTotal !== 0 ? [{ label: "Accounts Receivable (A/R)", amount: arTotal }] : [],
        total: arTotal,
      };

      // Every asset on the chart of accounts, including ₱0 (ledger balance)
      const currentAssetItems: BSLineItem[] = (assetAccounts || []).map((acct) => ({
        label: acct.name,
        amount: journalBalances[acct.id] || 0,
      }));
      const longTermAssetItems: BSLineItem[] = [];

      const currentAssetsTotal = arSubGroup.total + currentAssetItems.reduce((s, i) => s + i.amount, 0);
      const longTermAssetsTotal = longTermAssetItems.reduce((s, i) => s + i.amount, 0);
      const totalAssets = currentAssetsTotal + longTermAssetsTotal;

      // AP sub-group
      const apTotal = (unpaidBills || []).reduce((s, b) => s + (b.balance_due || 0), 0);
      const apSubGroup: BSSubGroup = {
        label: "Accounts Payable",
        items: apTotal !== 0 ? [{ label: "Accounts Payable (A/P)", amount: apTotal }] : [],
        total: apTotal,
      };

      // No separate GL liability lines — matches Bills tab as source of payables
      const currentLiabilityItems: BSLineItem[] = [];
      const nonCurrentLiabilityItems: BSLineItem[] = [];

      const currentLiabilitiesTotal = apSubGroup.total + currentLiabilityItems.reduce((s, i) => s + i.amount, 0);
      const nonCurrentLiabilitiesTotal = nonCurrentLiabilityItems.reduce((s, i) => s + i.amount, 0);
      const totalLiabilities = currentLiabilitiesTotal + nonCurrentLiabilitiesTotal;

      // Equity: net income from invoices / expenses / bills (same basis as P&L), plus plug so A = L + E
      const totalRevenue = (allInvoices || []).reduce((s, i) => s + (i.total_amount || 0), 0);
      const totalExpensesAmt = (allExpenses || []).reduce((s, e) => s + e.amount, 0);
      const totalBillsAmt = (allBills || []).reduce((s, b) => s + (b.total_amount || 0), 0);
      const netIncome = totalRevenue - totalExpensesAmt - totalBillsAmt;

      const totalEquityFromEquation = totalAssets - totalLiabilities;
      const otherEquity = totalEquityFromEquation - netIncome;

      const finalEquityItems: BSLineItem[] = [
        { label: "Net Income", amount: netIncome },
        { label: "Retained Earnings", amount: 0 },
      ];
      if (Math.abs(otherEquity) > 0.005) {
        finalEquityItems.push({
          label: "Other equity & adjustments",
          amount: otherEquity,
        });
      }
      const totalEquity = finalEquityItems.reduce((s, i) => s + i.amount, 0);

      setBsData({
        arSubGroup,
        currentAssetItems,
        currentAssetsTotal,
        longTermAssetItems,
        longTermAssetsTotal,
        totalAssets,
        apSubGroup,
        currentLiabilityItems,
        currentLiabilitiesTotal,
        nonCurrentLiabilityItems,
        nonCurrentLiabilitiesTotal,
        totalLiabilities,
        equityItems: finalEquityItems,
        totalEquity,
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      });
    } catch (e) {
      console.error("Error fetching Balance Sheet:", e);
    } finally {
      setLoadingBs(false);
    }
  };

  // ── AR Aging fetcher ──────────────────────────────────────────────────────
  const fetchARAging = async () => {
    setLoadingArAging(true);
    try {
      const today = new Date(arAgingAsOf + "T00:00:00");

      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, customer_id, due_date, balance_due, customers(name)")
        .in("status", ["sent", "partial", "overdue"])
        .gt("balance_due", 0)
        .lte("issue_date", arAgingAsOf);

      const customerMap = new Map<string, ARAgingRow>();

      for (const inv of invoices || []) {
        const customerId = inv.customer_id || "unknown";
        const customerName = Array.isArray(inv.customers)
          ? (inv.customers[0] as any)?.name || "Unknown"
          : (inv.customers as any)?.name || "Unknown";
        const amount = inv.balance_due || 0;
        const dueDate = inv.due_date ? new Date(inv.due_date) : null;
        const daysOverdue = dueDate ? Math.floor((today.getTime() - dueDate.getTime()) / 86400000) : 0;

        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, { customerId, customerName, current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90plus: 0, total: 0 });
        }

        const row = customerMap.get(customerId)!;
        row.total += amount;
        if (daysOverdue <= 0) row.current += amount;
        else if (daysOverdue <= 30) row.days1_30 += amount;
        else if (daysOverdue <= 60) row.days31_60 += amount;
        else if (daysOverdue <= 90) row.days61_90 += amount;
        else row.days90plus += amount;
      }

      setArAgingData(Array.from(customerMap.values()).sort((a, b) => b.total - a.total));
    } catch (e) {
      console.error("Error fetching AR Aging:", e);
    } finally {
      setLoadingArAging(false);
    }
  };

  // ── Custom Reports fetcher ─────────────────────────────────────────────────
  useEffect(() => {
    if (topTab === "custom") fetchCustomReports();
  }, [topTab]);

  const fetchCustomReports = async () => {
    setLoadingCustom(true);
    try {
      const { data, error } = await supabase
        .from("custom_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCustomReports(
        (data || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          createdBy: r.created_by || "—",
          lastModifiedBy: r.last_modified_by || "—",
          dateRange: r.date_range || "—",
          access: r.access || "Private",
          createdAt: r.created_at,
        }))
      );
    } catch {
      setCustomReports([]);
    } finally {
      setLoadingCustom(false);
    }
  };

  const deleteCustomReport = async (id: string) => {
    try {
      await supabase.from("custom_reports").delete().eq("id", id);
      setCustomReports((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error("Error deleting report:", e);
    }
  };

  // ── Utilities ────────────────────────────────────────────────────────────
  const filteredCodes = codes.filter(
    (code) =>
    code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    code.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number) =>
    `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const openManagementPreview = async (report: ManagementReport) => {
    const period = managementPeriodById[report.id] ?? "This year";
    const { from, to } = getManagementPeriodRange(period);
    setMgmtDialogTitle(report.name);
    setMgmtDialogPeriodLabel(period);
    setMgmtDialogRange({ from, to });
    setMgmtDialogOpen(true);
    setMgmtDialogLoading(true);
    setMgmtDialogLines([]);
    try {
      if (report.id === "company-overview") {
        const [{ data: inv }, { data: exp }, { data: bills }] = await Promise.all([
          supabase.from("invoices").select("total_amount").neq("status", "draft").gte("issue_date", from).lte("issue_date", to),
          supabase.from("expenses").select("amount").gte("created_at", from + "T00:00:00").lte("created_at", to + "T23:59:59"),
          supabase.from("bills").select("total_amount").neq("status", "draft").gte("bill_date", from).lte("bill_date", to),
        ]);
        const revenue = (inv || []).reduce((s, i) => s + (i.total_amount || 0), 0);
        const expTot = (exp || []).reduce((s, e) => s + e.amount, 0);
        const billTot = (bills || []).reduce((s, b) => s + (b.total_amount || 0), 0);
        const expenses = expTot + billTot;
        const net = revenue - expenses;
        setMgmtDialogLines([
          { label: "Invoice revenue", value: formatCurrency(revenue) },
          { label: "Expenses + bills", value: formatCurrency(expenses) },
          { label: "Net (period)", value: formatCurrency(net) },
        ]);
      } else if (report.id === "sales-performance") {
        const { data: inv } = await supabase
          .from("invoices")
          .select("id, total_amount")
          .neq("status", "draft")
          .gte("issue_date", from)
          .lte("issue_date", to);
        const count = (inv || []).length;
        const total = (inv || []).reduce((s, i) => s + (i.total_amount || 0), 0);
        setMgmtDialogLines([
          { label: "Invoices in period", value: String(count) },
          { label: "Total invoiced", value: formatCurrency(total) },
          { label: "Average per invoice", value: formatCurrency(count ? total / count : 0) },
        ]);
      } else {
        const [{ data: exp }, { data: bills }] = await Promise.all([
          supabase.from("expenses").select("amount").gte("created_at", from + "T00:00:00").lte("created_at", to + "T23:59:59"),
          supabase.from("bills").select("total_amount").neq("status", "draft").gte("bill_date", from).lte("bill_date", to),
        ]);
        const expTot = (exp || []).reduce((s, e) => s + e.amount, 0);
        const billTot = (bills || []).reduce((s, b) => s + (b.total_amount || 0), 0);
        setMgmtDialogLines([
          { label: "Expense entries", value: formatCurrency(expTot) },
          { label: "Bills (vendor)", value: formatCurrency(billTot) },
          { label: "Total spend", value: formatCurrency(expTot + billTot) },
        ]);
      }
    } catch (e) {
      console.error("Management preview:", e);
      setMgmtDialogLines([{ label: "Error", value: "Could not load data for this period." }]);
    } finally {
      setMgmtDialogLoading(false);
    }
  };

  const getName = (obj: any): string => {
    if (!obj) return "N/A";
    if (Array.isArray(obj)) return obj[0]?.name || "N/A";
    return obj.name || "N/A";
  };

  const standardSubTabs = [
    { id: "code-report" as StandardSubTab, label: "Code-Based Report", icon: FileText },
    { id: "profit-loss" as StandardSubTab, label: "Profit & Loss", icon: TrendingUp },
    { id: "balance-sheet" as StandardSubTab, label: "Balance Sheet", icon: Scale },
    { id: "ar-aging" as StandardSubTab, label: "AR Aging Summary", icon: Clock },
  ];

  const topTabs: { id: TopTab; label: string }[] = [
    { id: "standard", label: "Standard reports" },
    { id: "custom", label: "Custom reports" },
    { id: "management", label: "Management reports" },
  ];

  const filteredCustomReports = customReports.filter((r) =>
    r.name.toLowerCase().includes(customSearch.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-2">
          <h1 className="text-3xl font-bold mb-1">Reports</h1>
        </div>

        {/* Top-level Tab Navigation (Standard / Custom / Management) */}
        <div className="border-b mb-6">
          <nav className="flex gap-1 overflow-x-auto">
            {topTabs.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTopTab(id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  topTab === id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-foreground/60 hover:text-foreground hover:border-foreground/30"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* ═══════════ STANDARD REPORTS ═══════════ */}
        {topTab === "standard" && (<>
          {/* Search + sub-tab navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
              <input
                type="text"
                placeholder="Type report name here"
                className="pl-9 pr-4 py-2 border rounded-md bg-card text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Favorites section */}
        <div className="mb-8">
            <button className="flex items-center gap-1 text-sm font-semibold text-foreground mb-3">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              Favorites
            </button>
            <div className="space-y-0 border rounded-lg overflow-hidden bg-card">
              {[
                { label: "Accounts receivable aging summary", tab: "ar-aging" as StandardSubTab },
                { label: "Balance Sheet", tab: "balance-sheet" as StandardSubTab },
                { label: "Profit and Loss", tab: "profit-loss" as StandardSubTab },
              ].map(({ label, tab }) => (
                <div key={tab} className="flex items-center justify-between px-6 py-3 border-b last:border-b-0 hover:bg-secondary/40 transition-colors">
                  <button onClick={() => setActiveTab(tab)} className="text-sm text-foreground hover:text-blue-600 hover:underline">
                    {label}
                  </button>
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-yellow-500 fill-yellow-500" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <button className="text-foreground/40 hover:text-foreground">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Standard sub-tabs */}
          <div className="border-b mb-6">
            <nav className="flex gap-1 overflow-x-auto">
              {standardSubTabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-foreground/60 hover:text-foreground hover:border-foreground/30"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

        {/* ── TAB 1: Code-Based Report ─────────────────────────────────── */}
        {activeTab === "code-report" && (
          <>
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-1">Code-Based Financial Report</h2>
              <p className="text-foreground/60">Track income and expenses for specific projects, trainings, or events</p>
        </div>

        {/* Code Selector */}
        <div className="bg-card rounded-lg shadow-sm border p-6 mb-6">
              <label className="block text-sm font-medium mb-2">Select Code</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCodeDropdown(!showCodeDropdown)}
              className="w-full md:w-96 flex items-center justify-between px-4 py-3 bg-card border border-gray-300 rounded-lg hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
                  <span>{loading ? "Loading codes..." : selectedCode || "Choose a code..."}</span>
              <ChevronDown className="h-5 w-5 text-gray-400" />
            </button>

            {showCodeDropdown && (
              <div className="absolute z-10 mt-2 w-full md:w-96 bg-card border border-gray-200 rounded-lg shadow-lg">
                <div className="p-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground" />
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
                            onClick={() => { setSelectedCode(code.code); setShowCodeDropdown(false); setSearchQuery(""); }}
                        className="w-full text-left px-4 py-3 hover:bg-secondary transition-colors"
                      >
                        <div className="font-medium text-foreground">{code.code}</div>
                        <div className="text-sm text-foreground/50">{code.name}</div>
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
          <div className="bg-card rounded-lg shadow-sm border p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading report...</p>
          </div>
        ) : reportData ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-card rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Total Income</span>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                    <div className="text-2xl font-bold text-foreground">{formatCurrency(reportData.totalIncome)}</div>
                    <div className="text-xs text-foreground/50 mt-1">{reportData.income.length} transaction{reportData.income.length !== 1 ? "s" : ""}</div>
                </div>
              <div className="bg-card rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Total Expenses</span>
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                    <div className="text-2xl font-bold text-foreground">{formatCurrency(reportData.totalExpenses)}</div>
                    <div className="text-xs text-foreground/50 mt-1">{reportData.expenses.length} transaction{reportData.expenses.length !== 1 ? "s" : ""}</div>
                </div>
              <div className="bg-card rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Available Balance</span>
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                    <div className={`text-2xl font-bold ${reportData.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(reportData.balance)}
                </div>
                    <div className="text-xs text-gray-500 mt-1">Net result</div>
                </div>
              <div className="bg-card rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Profit Margin</span>
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                    <div className="text-2xl font-bold text-foreground">{reportData.profitMargin}%</div>
                    <div className="text-xs text-foreground/50 mt-1">Of total income</div>
              </div>
            </div>

            {/* Income Table */}
            <div className="bg-card rounded-lg shadow-sm border mb-6">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-foreground">Income Transactions</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-card-50 border-b">
                    <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Invoice No</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Customer</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Description</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-gray-200">
                    {reportData.income.length > 0 ? (
                      reportData.income.map((item: IncomeTransaction) => (
                        <tr key={item.id} className="hover:bg-secondary">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{formatDate(item.issue_date)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.invoice_no}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{getName(item.customers)}</td>
                              <td className="px-6 py-4 text-sm text-foreground">{item.notes || "Invoice payment"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">{formatCurrency(item.total_amount)}</td>
                        </tr>
                      ))
                    ) : (
                          <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No income transactions found for this code</td></tr>
                    )}
                  </tbody>
                  <tfoot className="bg-secondary">
                    <tr>
                          <td colSpan={4} className="px-6 py-4 text-sm font-semibold text-foreground text-right">Total Income:</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">{formatCurrency(reportData.totalIncome)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Expenses Table */}
            <div className="bg-card rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-foreground">Expense Transactions</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-card border-b">
                    <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Reference</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Vendor</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Description</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-gray-200">
                    {reportData.expenses.length > 0 ? (
                      reportData.expenses.map((item: any) => (
                        <tr key={item.id} className="hover:bg-secondary">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{formatDate(item.date)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{item.type}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.bill_no}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{item.vendor}</td>
                              <td className="px-6 py-4 text-sm text-foreground">{item.description}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))
                    ) : (
                          <tr><td colSpan={6} className="px-6 py-8 text-center text-foreground">No expense transactions found for this code</td></tr>
                    )}
                  </tbody>
                  <tfoot className="bg-secondary">
                    <tr>
                          <td colSpan={5} className="px-6 py-4 text-sm font-semibold text-foreground text-right">Total Expenses:</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 text-right">{formatCurrency(reportData.totalExpenses)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Final Summary */}
                <div className="bg-linear-to-r from-blue-600 to-blue-700 rounded-lg shadow-sm border border-blue-700 mt-6 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Net Result for {selectedCode}</h3>
                      <p className="text-blue-100 text-sm">{codes.find((c) => c.code === selectedCode)?.name}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-blue-100 mb-1">Available Balance</div>
                      <div className={`text-3xl font-bold ${reportData.balance >= 0 ? "text-white" : "text-yellow-300"}`}>
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
                <p className="text-gray-600">Please select a code from the dropdown above to view the financial report</p>
              </div>
            )}
          </>
        )}

        {/* ── TAB 2: Profit & Loss ─────────────────────────────────────── */}
        {activeTab === "profit-loss" && (
          <>
            {/* Report controls bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 pb-4 border-b flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground/60 whitespace-nowrap">Report period</span>
                <select
                  value={pnlPeriod}
                  onChange={(e) => {
                    const p = e.target.value;
                    setPnlPeriod(p);
                    if (p !== "custom") setPnlDateRange(getDateRange(p));
                  }}
                  className="px-3 py-1.5 border rounded-md bg-card text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="this-month">This month to date</option>
                  <option value="this-quarter">This quarter to date</option>
                  <option value="this-year">This year to date</option>
                  <option value="last-year">Last year</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground/60">From</span>
                <input type="date" value={pnlDateRange.from}
                  onChange={(e) => { setPnlDateRange(r => ({ ...r, from: e.target.value })); setPnlPeriod("custom"); }}
                  className="px-3 py-1.5 border rounded-md bg-card text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="text-sm text-foreground/60">To</span>
                <input type="date" value={pnlDateRange.to}
                  onChange={(e) => { setPnlDateRange(r => ({ ...r, to: e.target.value })); setPnlPeriod("custom"); }}
                  className="px-3 py-1.5 border rounded-md bg-card text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-center gap-1 sm:ml-2">
                <span className="text-sm text-foreground/60 mr-1">Accounting method</span>
                <div className="flex rounded-md border overflow-hidden text-sm">
                  <button onClick={() => setPnlMethod("cash")}
                    className={`px-3 py-1.5 transition-colors ${pnlMethod === "cash" ? "bg-blue-600 text-white" : "bg-card text-foreground/70 hover:bg-secondary"}`}>
                    Cash
                  </button>
                  <button onClick={() => setPnlMethod("accrual")}
                    className={`px-3 py-1.5 transition-colors ${pnlMethod === "accrual" ? "bg-blue-600 text-white" : "bg-card text-foreground/70 hover:bg-secondary"}`}>
                    Accrual
                  </button>
                </div>
              </div>
              <div className="sm:ml-auto flex items-center gap-2">
                <button onClick={() => fetchPnL(pnlDateRange.from, pnlDateRange.to)} title="Refresh"
                  className="p-2 rounded-md border bg-card hover:bg-secondary transition-colors text-foreground/60 hover:text-foreground">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                </button>
                <button onClick={() => window.print()} title="Print"
                  className="p-2 rounded-md border bg-card hover:bg-secondary transition-colors text-foreground/60 hover:text-foreground">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                </button>
              </div>
            </div>

            {loadingPnl ? (
              <div className="bg-card rounded-lg shadow-sm border p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading report...</p>
              </div>
            ) : pnlData ? (
              <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
                {/* Formal report header */}
                <div className="text-center py-5 border-b">
                  <h2 className="text-xl font-bold text-foreground">Profit and Loss</h2>
                  <p className="text-sm text-foreground/70 mt-0.5">Petrosphere Accounting</p>
                  <p className="text-sm text-foreground/60">
                    {new Date(pnlDateRange.from + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                    {" - "}
                    {new Date(pnlDateRange.to + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-6 py-2 text-left w-full"></th>
                      <th className="px-6 py-2 text-right font-semibold text-foreground/60 text-xs tracking-wider whitespace-nowrap">
                        <span className="flex items-center justify-end gap-1">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 15-6-6-6 6"/><path d="m18 9-6-6-6 6"/></svg>
                          Total
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* ── INCOME ── */}
                    <PnlRow label="Income" isSection depth={0} collapsed={!!pnlCollapsed.income} onToggle={() => setPnlCollapsed(p => ({ ...p, income: !p.income }))} />
                    {!pnlCollapsed.income && (<>
                      {pnlData.incomeSection.items.length > 0
                        ? pnlData.incomeSection.items.map((item, i) => <PnlRow key={i} label={item.label} amount={item.amount} depth={1} />)
                        : <PnlRow label="No income data for this period" depth={1} dash />
                      }
                      <PnlRow label="Total for Income" amount={pnlData.incomeSection.total} isTotal depth={0} />
                    </>)}

                    {/* ── COST OF SALES (only if data) ── */}
                    {pnlData.costOfSalesSection.items.length > 0 && (<>
                      <PnlRow label="Cost of Sales" isSection depth={0} collapsed={!!pnlCollapsed.cos} onToggle={() => setPnlCollapsed(p => ({ ...p, cos: !p.cos }))} />
                      {!pnlCollapsed.cos && pnlData.costOfSalesSection.items.map((item, i) => (
                        <PnlRow key={i} label={item.label} amount={item.amount} depth={1} />
                      ))}
                      <PnlRow label="Total for Cost of Sales" amount={pnlData.costOfSalesSection.total} isTotal depth={0} />
                      <PnlRow label="Gross Profit" amount={pnlData.grossProfit} isGross />
                    </>)}

                    {/* ── EXPENSES ── */}
                    <PnlRow label="Expenses" isSection depth={0} collapsed={!!pnlCollapsed.expenses} onToggle={() => setPnlCollapsed(p => ({ ...p, expenses: !p.expenses }))} />
                    {!pnlCollapsed.expenses && (<>
                      {pnlData.expensesSection.items.length > 0
                        ? pnlData.expensesSection.items.map((item, i) => <PnlRow key={i} label={item.label} amount={item.amount} depth={1} />)
                        : <PnlRow label="No expense data for this period" depth={1} dash />
                      }
                      <PnlRow label="Total for Expenses" amount={pnlData.expensesSection.total} isTotal depth={0} />
                    </>)}

                    {/* ── OTHER EXPENSES (only if data) ── */}
                    {pnlData.otherExpensesSection.items.length > 0 && (<>
                      <PnlRow label="Other Expenses" isSection depth={0} collapsed={!!pnlCollapsed.otherExp} onToggle={() => setPnlCollapsed(p => ({ ...p, otherExp: !p.otherExp }))} />
                      {!pnlCollapsed.otherExp && pnlData.otherExpensesSection.items.map((item, i) => (
                        <PnlRow key={i} label={item.label} amount={item.amount} depth={1} />
                      ))}
                      <PnlRow label="Total for Other Expenses" amount={pnlData.otherExpensesSection.total} isTotal depth={0} />
                    </>)}

                    {/* ── NET EARNINGS ── */}
                    <PnlRow label="Net earnings" amount={pnlData.netEarnings} isNet />
                  </tbody>
                </table>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-3 border-t bg-secondary/20 text-xs text-foreground/50">
                  <button className="flex items-center gap-1 text-green-700 font-medium hover:underline">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                    Add note
                  </button>
                  <span>
                    {pnlMethod === "accrual" ? "Accrual" : "Cash"} basis | {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} GMT+08:00
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-lg shadow-sm border p-12 text-center">
                <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Select a period to view the Profit & Loss report</p>
          </div>
        )}
          </>
        )}

        {/* ── TAB 3: Balance Sheet ─────────────────────────────────────── */}
        {activeTab === "balance-sheet" && (
          <>
            {/* Report controls bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 pb-4 border-b flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground/60 whitespace-nowrap">Report period</span>
                <select
                  value={bsPeriod}
                  onChange={(e) => {
                    const p = e.target.value;
                    setBsPeriod(p);
                    const now = new Date();
                    const y = now.getFullYear();
                    const m = now.getMonth();
                    const q = Math.floor(m / 3);
                    const todayStr = now.toISOString().split("T")[0];
                    if (p === "this-year-to-date") { setBsFrom(`${y}-01-01`); setBsTo(todayStr); }
                    else if (p === "this-quarter-to-date") { setBsFrom(new Date(y, q * 3, 1).toISOString().split("T")[0]); setBsTo(todayStr); }
                    else if (p === "this-month-to-date") { setBsFrom(new Date(y, m, 1).toISOString().split("T")[0]); setBsTo(todayStr); }
                    else if (p === "last-year") { setBsFrom(`${y - 1}-01-01`); setBsTo(`${y - 1}-12-31`); }
                  }}
                  className="px-3 py-1.5 border rounded-md bg-card text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="this-year-to-date">This year to date</option>
                  <option value="this-quarter-to-date">This quarter to date</option>
                  <option value="this-month-to-date">This month to date</option>
                  <option value="last-year">Last year</option>
                  <option value="custom">Custom</option>
                </select>
      </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground/60">From</span>
                <input type="date" value={bsFrom} onChange={(e) => { setBsFrom(e.target.value); setBsPeriod("custom"); }}
                  className="px-3 py-1.5 border rounded-md bg-card text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="text-sm text-foreground/60">To</span>
                <input type="date" value={bsTo} onChange={(e) => { setBsTo(e.target.value); setBsPeriod("custom"); }}
                  className="px-3 py-1.5 border rounded-md bg-card text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
              <div className="flex items-center gap-1 sm:ml-2">
                <span className="text-sm text-foreground/60 mr-1">Accounting method</span>
                <div className="flex rounded-md border overflow-hidden text-sm">
                  <button onClick={() => setBsMethod("cash")}
                    className={`px-3 py-1.5 transition-colors ${bsMethod === "cash" ? "bg-blue-600 text-white" : "bg-card text-foreground/70 hover:bg-secondary"}`}>
                    Cash
                  </button>
                  <button onClick={() => setBsMethod("accrual")}
                    className={`px-3 py-1.5 transition-colors ${bsMethod === "accrual" ? "bg-blue-600 text-white" : "bg-card text-foreground/70 hover:bg-secondary"}`}>
                    Accrual
                  </button>
                </div>
              </div>
              <div className="sm:ml-auto flex items-center gap-2">
                <button onClick={() => fetchBalanceSheet(bsTo)} title="Refresh"
                  className="p-2 rounded-md border bg-card hover:bg-secondary transition-colors text-foreground/60 hover:text-foreground">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                </button>
                <button onClick={() => window.print()} title="Print"
                  className="p-2 rounded-md border bg-card hover:bg-secondary transition-colors text-foreground/60 hover:text-foreground">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                </button>
              </div>
            </div>

            {loadingBs ? (
              <div className="bg-card rounded-lg shadow-sm border p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading report...</p>
              </div>
            ) : bsData ? (
              <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
                {/* Formal report header */}
                <div className="text-center py-5 border-b">
                  <h2 className="text-xl font-bold text-foreground">Balance Sheet</h2>
                  <p className="text-sm text-foreground/70 mt-0.5">Petrosphere Accounting</p>
                  <p className="text-sm text-foreground/60">
                    As of {new Date(bsTo + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-6 py-2 text-left w-full"></th>
                      <th className="px-6 py-2 text-right font-semibold text-foreground/60 text-xs tracking-wider whitespace-nowrap">
                        <span className="flex items-center justify-end gap-1">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 15-6-6-6 6"/><path d="m18 9-6-6-6 6"/></svg>
                          Total
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>

                    {/* ══ ASSETS ══ */}
                    <BsRow depth={0} label="Assets" collapsed={!!bsCollapsed.assets} onToggle={() => setBsCollapsed(p => ({ ...p, assets: !p.assets }))} isSection />

                    {!bsCollapsed.assets && (<>
                      {/* Current Assets */}
                      <BsRow depth={1} label="Current Assets" collapsed={!!bsCollapsed.currentAssets} onToggle={() => setBsCollapsed(p => ({ ...p, currentAssets: !p.currentAssets }))} isSection />

                      {!bsCollapsed.currentAssets && (<>
                        {/* AR sub-group */}
                        {bsData.arSubGroup.total !== 0 && (<>
                          <BsRow depth={2} label="Accounts Receivable" collapsed={!!bsCollapsed.arGroup} onToggle={() => setBsCollapsed(p => ({ ...p, arGroup: !p.arGroup }))} isSection />
                          {!bsCollapsed.arGroup && bsData.arSubGroup.items.map((item, i) => (
                            <BsRow key={i} depth={3} label={item.label} amount={item.amount} />
                          ))}
                          <BsRow depth={2} label="Total for Accounts Receivable" amount={bsData.arSubGroup.total} isTotal />
                        </>)}

                        {/* Individual current asset accounts */}
                        {bsData.currentAssetItems.map((item, i) => (
                          <BsRow key={i} depth={2} label={item.label} amount={item.amount} />
                        ))}

                        {bsData.arSubGroup.total === 0 && bsData.currentAssetItems.length === 0 && (
                          <BsRow depth={2} label="No current asset data" amount={0} muted />
                        )}
                      </>)}

                      <BsRow depth={1} label="Total for Current Assets" amount={bsData.currentAssetsTotal} isTotal />

                      {/* Long-term assets */}
                      {bsData.longTermAssetItems.length > 0 && (<>
                        <BsRow depth={1} label="Long-term assets" collapsed={!!bsCollapsed.longTerm} onToggle={() => setBsCollapsed(p => ({ ...p, longTerm: !p.longTerm }))} isSection />
                        {!bsCollapsed.longTerm && bsData.longTermAssetItems.map((item, i) => (
                          <BsRow key={i} depth={2} label={item.label} amount={item.amount} />
                        ))}
                        <BsRow depth={1} label="Total for Long-term assets" amount={bsData.longTermAssetsTotal} isTotal />
                      </>)}

                      <BsRow depth={0} label="Total for Assets" amount={bsData.totalAssets} isSectionTotal />
                    </>)}

                    {/* ══ LIABILITIES AND SHAREHOLDER'S EQUITY ══ */}
                    <BsRow depth={0} label="Liabilities and Shareholder's Equity" collapsed={!!bsCollapsed.liabEquity} onToggle={() => setBsCollapsed(p => ({ ...p, liabEquity: !p.liabEquity }))} isSection />

                    {!bsCollapsed.liabEquity && (<>

                      {/* Current Liabilities */}
                      <BsRow depth={1} label="Current Liabilities" collapsed={!!bsCollapsed.currentLiab} onToggle={() => setBsCollapsed(p => ({ ...p, currentLiab: !p.currentLiab }))} isSection />

                      {!bsCollapsed.currentLiab && (<>
                        {/* AP sub-group */}
                        {bsData.apSubGroup.total !== 0 && (<>
                          <BsRow depth={2} label="Accounts Payable" collapsed={!!bsCollapsed.apGroup} onToggle={() => setBsCollapsed(p => ({ ...p, apGroup: !p.apGroup }))} isSection />
                          {!bsCollapsed.apGroup && bsData.apSubGroup.items.map((item, i) => (
                            <BsRow key={i} depth={3} label={item.label} amount={item.amount} />
                          ))}
                          <BsRow depth={2} label="Total for Accounts Payable" amount={bsData.apSubGroup.total} isTotal />
                        </>)}

                        {bsData.currentLiabilityItems.map((item, i) => (
                          <BsRow key={i} depth={2} label={item.label} amount={item.amount} />
                        ))}

                        {bsData.apSubGroup.total === 0 && bsData.currentLiabilityItems.length === 0 && (
                          <BsRow depth={2} label="No current liability data" amount={0} muted />
                        )}
                      </>)}

                      <BsRow depth={1} label="Total for Current Liabilities" amount={bsData.currentLiabilitiesTotal} isTotal />

                      {/* Non-current Liabilities */}
                      {bsData.nonCurrentLiabilityItems.length > 0 && (<>
                        <BsRow depth={1} label="Non-current Liabilities" collapsed={!!bsCollapsed.nonCurrentLiab} onToggle={() => setBsCollapsed(p => ({ ...p, nonCurrentLiab: !p.nonCurrentLiab }))} isSection />
                        {!bsCollapsed.nonCurrentLiab && bsData.nonCurrentLiabilityItems.map((item, i) => (
                          <BsRow key={i} depth={2} label={item.label} amount={item.amount} />
                        ))}
                        <BsRow depth={1} label="Total for Non-current Liabilities" amount={bsData.nonCurrentLiabilitiesTotal} isTotal />
                      </>)}

                      {/* Shareholder's Equity */}
                      <BsRow depth={1} label="Shareholder's Equity" collapsed={!!bsCollapsed.equity} onToggle={() => setBsCollapsed(p => ({ ...p, equity: !p.equity }))} isSection />

                      {!bsCollapsed.equity && bsData.equityItems.map((item, i) => (
                        <BsRow key={i} depth={2} label={item.label} amount={item.amount} />
                      ))}

                      <BsRow depth={1} label="Total for Shareholder's Equity" amount={bsData.totalEquity} isTotal />

                      <BsRow depth={0} label="Total for Liabilities and Shareholder's Equity" amount={bsData.totalLiabilitiesAndEquity} isSectionTotal />
                    </>)}
                  </tbody>
                </table>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-3 border-t bg-secondary/20 text-xs text-foreground/50">
                  <button className="flex items-center gap-1 text-green-700 font-medium hover:underline">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                    Add note
                  </button>
                  <span>
                    {bsMethod === "accrual" ? "Accrual" : "Cash"} basis | {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} GMT+08:00
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-lg shadow-sm border p-12 text-center">
                <Scale className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Loading balance sheet data...</p>
              </div>
            )}
          </>
        )}

        {/* ── TAB 4: AR Aging Summary ──────────────────────────────────── */}
        {activeTab === "ar-aging" && (
          <>
            {/* Report controls bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4 pb-4 border-b">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground/60">Report period</span>
                  <select
                    value={arAgingPeriod}
                    onChange={(e) => {
                      setArAgingPeriod(e.target.value);
                      if (e.target.value === "today") setArAgingAsOf(new Date().toISOString().split("T")[0]);
                    }}
                    className="px-3 py-1.5 border rounded-md bg-card text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="today">Today</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground/60">as of</span>
                  <input
                    type="date"
                    value={arAgingAsOf}
                    onChange={(e) => { setArAgingAsOf(e.target.value); setArAgingPeriod("custom"); }}
                    className="px-3 py-1.5 border rounded-md bg-card text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="sm:ml-auto flex items-center gap-2">
                <button
                  onClick={fetchARAging}
                  title="Refresh"
                  className="p-2 rounded-md border bg-card hover:bg-secondary transition-colors text-foreground/60 hover:text-foreground"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                </button>
                <button
                  onClick={() => window.print()}
                  title="Print"
                  className="p-2 rounded-md border bg-card hover:bg-secondary transition-colors text-foreground/60 hover:text-foreground"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                </button>
              </div>
            </div>

            {loadingArAging ? (
              <div className="bg-card rounded-lg shadow-sm border p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading report...</p>
              </div>
            ) : (
              <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
                {/* Formal report header */}
                <div className="text-center py-6 border-b">
                  <h2 className="text-xl font-bold text-foreground">A/R Ageing Summary Report</h2>
                  <p className="text-sm text-foreground/70 mt-1">Petrosphere Accounting</p>
                  <p className="text-sm text-foreground/60 mt-0.5">
                    As of{" "}
                    {new Date(arAgingAsOf + "T00:00:00").toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-6 py-3 text-left font-semibold text-foreground/70 uppercase text-xs tracking-wider w-[30%]"> </th>
                        <th className="px-4 py-3 text-right font-semibold text-foreground/70 uppercase text-xs tracking-wider">CURRENT</th>
                        <th className="px-4 py-3 text-right font-semibold text-foreground/70 uppercase text-xs tracking-wider">1 - 30</th>
                        <th className="px-4 py-3 text-right font-semibold text-foreground/70 uppercase text-xs tracking-wider">31 - 60</th>
                        <th className="px-4 py-3 text-right font-semibold text-foreground/70 uppercase text-xs tracking-wider">61 - 90</th>
                        <th className="px-4 py-3 text-right font-semibold text-foreground/70 uppercase text-xs tracking-wider">91 AND OVER</th>
                        <th className="px-4 py-3 text-right font-semibold text-foreground/70 uppercase text-xs tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {arAgingData.length > 0 ? (
                        arAgingData.map((row) => (
                          <tr key={row.customerId} className="hover:bg-secondary/50">
                            <td className="px-6 py-3 text-foreground font-medium">{row.customerName}</td>
                            <td className="px-4 py-3 text-right text-foreground/80">{row.current > 0 ? formatCurrency(row.current) : "—"}</td>
                            <td className="px-4 py-3 text-right text-foreground/80">{row.days1_30 > 0 ? formatCurrency(row.days1_30) : "—"}</td>
                            <td className="px-4 py-3 text-right text-foreground/80">{row.days31_60 > 0 ? formatCurrency(row.days31_60) : "—"}</td>
                            <td className="px-4 py-3 text-right text-foreground/80">{row.days61_90 > 0 ? formatCurrency(row.days61_90) : "—"}</td>
                            <td className="px-4 py-3 text-right text-red-600">{row.days90plus > 0 ? formatCurrency(row.days90plus) : "—"}</td>
                            <td className="px-4 py-3 text-right font-semibold text-foreground">{formatCurrency(row.total)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-14 text-center">
                            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No outstanding invoices</p>
                            <p className="text-gray-400 text-sm mt-1">All invoices are paid or there are no sent invoices.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {arAgingData.length > 0 && (() => {
                      const totals = arAgingData.reduce(
                        (acc, r) => ({ current: acc.current + r.current, days1_30: acc.days1_30 + r.days1_30, days31_60: acc.days31_60 + r.days31_60, days61_90: acc.days61_90 + r.days61_90, days90plus: acc.days90plus + r.days90plus, total: acc.total + r.total }),
                        { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90plus: 0, total: 0 }
                      );
                      return (
                        <tfoot>
                          <tr className="border-t-2 border-foreground/20 bg-secondary/40">
                            <td className="px-6 py-3 font-bold text-foreground">TOTAL</td>
                            <td className="px-4 py-3 text-right font-bold text-foreground">{formatCurrency(totals.current)}</td>
                            <td className="px-4 py-3 text-right font-bold text-foreground">{formatCurrency(totals.days1_30)}</td>
                            <td className="px-4 py-3 text-right font-bold text-foreground">{formatCurrency(totals.days31_60)}</td>
                            <td className="px-4 py-3 text-right font-bold text-foreground">{formatCurrency(totals.days61_90)}</td>
                            <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(totals.days90plus)}</td>
                            <td className="px-4 py-3 text-right font-bold text-foreground">{formatCurrency(totals.total)}</td>
                          </tr>
                        </tfoot>
                      );
                    })()}
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        </>)}

        {/* ═══════════ CUSTOM REPORTS ═══════════ */}
        {topTab === "custom" && (
          <>
            {/* Search bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                <input
                  type="text"
                  placeholder="Type report name here"
                  value={customSearch}
                  onChange={(e) => setCustomSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 border rounded-md bg-card text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {loadingCustom ? (
              <div className="bg-card rounded-lg shadow-sm border p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading custom reports...</p>
              </div>
            ) : (
              <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-secondary/30">
                        <th className="px-6 py-3 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wider">Report name</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wider">Created by</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wider">Last Modified by</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wider">Date range</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            Access
                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 15-6-6-6 6"/><path d="m18 9-6-6-6 6"/></svg>
                          </span>
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredCustomReports.length > 0 ? (
                        filteredCustomReports.map((report) => (
                          <tr key={report.id} className="hover:bg-secondary/30">
                            <td className="px-6 py-3 text-foreground font-medium">{report.name}</td>
                            <td className="px-4 py-3 text-foreground/70">{report.createdBy}</td>
                            <td className="px-4 py-3 text-foreground/70">{report.lastModifiedBy}</td>
                            <td className="px-4 py-3 text-foreground/70">{report.dateRange}</td>
                            <td className="px-4 py-3 text-foreground/70">{report.access}</td>
                            <td className="px-4 py-3 text-foreground/70"></td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => deleteCustomReport(report.id)}
                                  className="text-red-500 hover:text-red-700 text-sm font-medium hover:underline"
                                >
                                  Delete
                                </button>
                                <button className="p-1 text-foreground/40 hover:text-foreground">
                                  <ChevronDown className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-14 text-center">
                            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No custom reports</p>
                            <p className="text-gray-400 text-sm mt-1">
                              Customize a standard report and save it to see it here.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {filteredCustomReports.length > 0 && (
                  <div className="flex items-center justify-end gap-2 px-6 py-3 border-t text-sm text-foreground/60">
                    <button className="hover:text-foreground">First</button>
                    <button className="hover:text-foreground">Previous</button>
                    <span className="text-foreground">1 - {filteredCustomReports.length}</span>
                    <button className="hover:text-foreground">Next</button>
                    <button className="hover:text-foreground">Last</button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ═══════════ MANAGEMENT REPORTS ═══════════ */}
        {topTab === "management" && (
          <>
            {/* Header with button */}
            <div className="flex items-center justify-end mb-6">
              <button
                onClick={() => {
                  setCreateMgmtOpen(true);
                  setCreateMgmtPage("cover");
                  setCreateMgmtName("");
                  setCreateMgmtPeriod("This year");
                  setCreateMgmtCover({
                    title: "Management Report",
                    subtitle: "Petrosphere Accounting",
                    reportPeriod: "For the period ended [Report end date]",
                    preparedOn: new Date().toISOString().split("T")[0],
                    preparedBy: "",
                    disclaimer: "",
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-md text-sm font-medium hover:bg-green-800 transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                Management report
              </button>
            </div>

            <div className="bg-card rounded-lg shadow-sm border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-secondary/30">
                      <th className="px-6 py-3 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wider">NAME</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wider">CREATED BY</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wider">LAST MODIFIED</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wider">REPORT PERIOD</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wider">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {managementReportRows.map((report) => (
                      <tr key={report.id} className="hover:bg-secondary/30">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-foreground font-medium">{report.name}</span>
                            {report.builtIn && (
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded bg-blue-600 text-white uppercase tracking-wider">
                                PetroBook Report
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-foreground/70">{report.createdBy}</td>
                        <td className="px-4 py-3 text-foreground/70">{report.lastModified || "—"}</td>
                        <td className="px-4 py-3">
                          <select
                            value={managementPeriodById[report.id] ?? "This year"}
                            className="px-2 py-1 border rounded-md bg-card text-sm text-foreground/70 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onChange={(e) =>
                              setManagementPeriodById((p) => ({ ...p, [report.id]: e.target.value }))
                            }
                          >
                            <option>All dates</option>
                            <option>Custom</option>
                            <option>Today</option>
                            <option>This week</option>
                            <option>This week to date</option>
                            <option>This month</option>
                            <option>This month to date</option>
                            <option>This quarter</option>
                            <option>This quarter to date</option>
                            <option>This year</option>
                            <option>This year to date</option>
                            <option>This year to last month</option>
                            <option>Yesterday</option>
                            <option>Recent</option>
                            <option>Last week</option>
                            <option>Last week to date</option>
                            <option>Last month</option>
                            <option>Last month to date</option>
                            <option>Last quarter</option>
                            <option>Last quarter to date</option>
                            <option>Last year</option>
                            <option>Last year to date</option>
                            <option>Since 30 days ago</option>
                            <option>Since 60 days ago</option>
                            <option>Since 90 days ago</option>
                            <option>Since 365 days ago</option>
                            <option>Next week</option>
                            <option>Next 4 weeks</option>
                            <option>Next month</option>
                            <option>Next quarter</option>
                            <option>Next year</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 relative">
                            <button
                              type="button"
                              onClick={() => openManagementPreview(report)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                            >
                              Preview
                            </button>
                            <button
                              type="button"
                              onClick={() => setMgmtActionMenu(mgmtActionMenu === report.id ? null : report.id)}
                              className="p-1 text-foreground/40 hover:text-foreground"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            {mgmtActionMenu === report.id && (
                              <>
                                <div className="fixed inset-0 z-[9998]" onClick={() => setMgmtActionMenu(null)} />
                                <div className="fixed z-[9999] w-44 bg-card border rounded-md shadow-lg py-1"
                                  ref={(el) => {
                                    if (el) {
                                      const btn = el.previousElementSibling?.previousElementSibling as HTMLElement | null;
                                      if (btn) {
                                        const rect = btn.getBoundingClientRect();
                                        el.style.top = `${rect.bottom + 4}px`;
                                        el.style.left = `${rect.right - el.offsetWidth}px`;
                                      }
                                    }
                                  }}
                                >
                                  {[
                                    { label: "Edit", action: () => {} },
                                    { label: "Send", action: () => {} },
                                    { label: "Export as PDF", action: () => window.print() },
                                    { label: "Export as DOCX", action: () => {} },
                                    { label: "Duplicate", action: () => {} },
                                  ].map(({ label, action }) => (
                                    <button
                                      key={label}
                                      type="button"
                                      onClick={() => { action(); setMgmtActionMenu(null); }}
                                      className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                                    >
                                      {label}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ═══════════ CREATE MANAGEMENT REPORT DIALOG ═══════════ */}
        <Dialog open={createMgmtOpen} onOpenChange={setCreateMgmtOpen}>
          <DialogContent className="sm:max-w-[95vw] max-h-[95vh] p-0 overflow-hidden flex flex-col">
            <DialogTitle className="sr-only">Create management report</DialogTitle>
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b bg-card shrink-0">
              <h2 className="text-lg font-semibold text-foreground">Create management report</h2>
              <select
                value={createMgmtPeriod}
                onChange={(e) => setCreateMgmtPeriod(e.target.value)}
                className="px-3 py-1.5 border rounded-md bg-card text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>All dates</option>
                <option>Custom</option>
                <option>Today</option>
                <option>This week</option>
                <option>This week to date</option>
                <option>This month</option>
                <option>This month to date</option>
                <option>This quarter</option>
                <option>This quarter to date</option>
                <option>This year</option>
                <option>This year to date</option>
                <option>This year to last month</option>
                <option>Yesterday</option>
                <option>Recent</option>
                <option>Last week</option>
                <option>Last week to date</option>
                <option>Last month</option>
                <option>Last month to date</option>
                <option>Last quarter</option>
                <option>Last quarter to date</option>
                <option>Last year</option>
                <option>Last year to date</option>
                <option>Since 30 days ago</option>
                <option>Since 60 days ago</option>
                <option>Since 90 days ago</option>
                <option>Since 365 days ago</option>
                <option>Next week</option>
                <option>Next 4 weeks</option>
                <option>Next month</option>
                <option>Next quarter</option>
                <option>Next year</option>
              </select>
            </div>

            {/* Report name input */}
            <div className="px-6 py-2 border-b bg-card shrink-0">
              <input
                type="text"
                placeholder="Management report name"
                value={createMgmtName}
                onChange={(e) => setCreateMgmtName(e.target.value)}
                className="w-full sm:w-72 px-3 py-2 border rounded-md bg-card text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Main body */}
            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* Left sidebar – page types */}
              <div className="w-24 shrink-0 border-r bg-card overflow-y-auto py-2">
                {([
                  { id: "cover" as const, label: "Cover page", icon: "📄" },
                  { id: "toc" as const, label: "Table of contents", icon: "📋" },
                  { id: "preliminary" as const, label: "Preliminary pages", icon: "📑" },
                  { id: "reports" as const, label: "Reports and charts", icon: "📊" },
                ]).map((page) => (
                  <button
                    key={page.id}
                    onClick={() => setCreateMgmtPage(page.id)}
                    className={`w-full flex flex-col items-center gap-1 px-2 py-3 text-center transition-colors ${
                      createMgmtPage === page.id
                        ? "bg-blue-50 border-l-2 border-blue-600 text-blue-700"
                        : "text-foreground/60 hover:bg-secondary/50"
                    }`}
                  >
                    <div className="w-14 h-16 bg-secondary/60 rounded border flex items-center justify-center text-xl">{page.icon}</div>
                    <span className="text-[10px] leading-tight font-medium">{page.label}</span>
                  </button>
                ))}
              </div>

              {/* Center – form fields */}
              <div className="flex-1 overflow-y-auto p-6">
                {createMgmtPage === "cover" && (
                  <div className="max-w-lg">
                    <h3 className="text-lg font-semibold mb-4">Cover page</h3>

                    <div className="flex gap-8 mb-5">
                      <div>
                        <label className="block text-xs font-medium text-foreground/60 mb-1">Template</label>
                        <div className="w-16 h-20 border-2 border-blue-500 rounded flex items-center justify-center bg-white">
                          <div className="w-8 h-1 bg-gray-300 rounded"></div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-foreground/60 mb-1">Logo</label>
                        <div className="w-16 h-16 border rounded bg-green-50 flex items-center justify-center text-2xl">🏢</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-foreground/60 mb-1">Cover title</label>
                        <input
                          type="text"
                          value={createMgmtCover.title}
                          onChange={(e) => setCreateMgmtCover((p) => ({ ...p, title: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          maxLength={100}
                        />
                        <p className="text-[10px] text-foreground/40 mt-0.5">100 characters max</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-foreground/60 mb-1">Subtitle</label>
                        <input
                          type="text"
                          value={createMgmtCover.subtitle}
                          onChange={(e) => setCreateMgmtCover((p) => ({ ...p, subtitle: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="[Company name]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-foreground/60 mb-1">Report period</label>
                        <input
                          type="text"
                          value={createMgmtCover.reportPeriod}
                          onChange={(e) => setCreateMgmtCover((p) => ({ ...p, reportPeriod: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-foreground/60 mb-1">Prepared on</label>
                          <input
                            type="date"
                            value={createMgmtCover.preparedOn}
                            onChange={(e) => setCreateMgmtCover((p) => ({ ...p, preparedOn: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-foreground/60 mb-1">Prepared by</label>
                          <input
                            type="text"
                            value={createMgmtCover.preparedBy}
                            onChange={(e) => setCreateMgmtCover((p) => ({ ...p, preparedBy: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Name"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-foreground/60 mb-1">Disclaimer</label>
                        <input
                          type="text"
                          value={createMgmtCover.disclaimer}
                          onChange={(e) => setCreateMgmtCover((p) => ({ ...p, disclaimer: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: For management review only"
                          maxLength={90}
                        />
                        <p className="text-[10px] text-foreground/40 mt-0.5">90 characters max</p>
                      </div>
                    </div>
                  </div>
                )}

                {createMgmtPage === "toc" && (
                  <div className="max-w-lg">
                    <h3 className="text-lg font-semibold mb-4">Table of contents</h3>
                    <p className="text-sm text-foreground/60">The table of contents is auto-generated from the pages included in this report.</p>
                    <div className="mt-6 p-6 bg-secondary/30 rounded-lg border text-sm text-foreground/60 text-center">
                      This page is generated automatically when you save or preview the report.
                    </div>
                  </div>
                )}

                {createMgmtPage === "preliminary" && (
                  <div className="max-w-lg">
                    <h3 className="text-lg font-semibold mb-4">Preliminary pages</h3>
                    <p className="text-sm text-foreground/60 mb-4">Add executive summary or introductory text before the financial reports.</p>
                    <textarea
                      className="w-full h-48 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Enter preliminary content here..."
                    />
                  </div>
                )}

                {createMgmtPage === "reports" && (
                  <div className="max-w-lg">
                    <h3 className="text-lg font-semibold mb-4">Reports and charts</h3>
                    <p className="text-sm text-foreground/60 mb-4">Select which reports and charts to include in this management report.</p>
                    <div className="space-y-2">
                      {["Profit and Loss", "Balance Sheet", "Accounts Receivable Aging Summary", "Cash Flow Statement", "Revenue by Customer"].map(
                        (name) => (
                          <label key={name} className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card hover:bg-secondary/30 cursor-pointer transition-colors">
                            <input type="checkbox" defaultChecked={name === "Profit and Loss" || name === "Balance Sheet"} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span className="text-sm text-foreground">{name}</span>
                          </label>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right – live preview */}
              <div className="w-72 shrink-0 border-l bg-secondary/20 overflow-y-auto p-4 hidden lg:block">
                <div className="bg-white rounded-lg shadow border aspect-3/4 p-6 flex flex-col">
                  <div className="bg-green-800 text-white px-4 py-6 rounded mb-4">
                    <h4 className="text-sm font-bold leading-tight">{createMgmtCover.title || "Management Report"}</h4>
                    <p className="text-[10px] mt-1 text-green-100">{createMgmtCover.subtitle || "Company Name"}</p>
                    <p className="text-[10px] text-green-200 mt-0.5">
                      {createMgmtCover.reportPeriod.replace(
                        "[Report end date]",
                        (() => {
                          const { to } = getManagementPeriodRange(createMgmtPeriod);
                          return new Date(to + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
                        })()
                      )}
                    </p>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center text-2xl mb-2">
                      🏢
                    </div>
                    <p className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">{createMgmtCover.subtitle || "Company Name"}</p>
                  </div>

                  <div className="text-right mt-auto pt-4 border-t border-gray-100">
                    {createMgmtCover.preparedBy && (
                      <>
                        <p className="text-[9px] text-gray-400">Prepared by</p>
                        <p className="text-[10px] text-gray-700 font-medium">{createMgmtCover.preparedBy}</p>
                      </>
                    )}
                    {createMgmtCover.preparedOn && (
                      <>
                        <p className="text-[9px] text-gray-400 mt-1">Prepared on</p>
                        <p className="text-[10px] text-gray-700 font-medium">
                          {new Date(createMgmtCover.preparedOn + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="flex items-center justify-between px-6 py-3 border-t bg-card shrink-0">
              <button
                onClick={() => setCreateMgmtOpen(false)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
              >
                Cancel
              </button>
              <div className="flex items-center gap-3">
                <button className="text-foreground/60 hover:text-foreground text-sm font-medium">Preview report</button>
                <button className="text-foreground/60 hover:text-foreground text-sm font-medium">More options</button>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-secondary transition-colors">
                  Save
                </button>
                <button
                  onClick={() => setCreateMgmtOpen(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Save and Close
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={mgmtDialogOpen} onOpenChange={setMgmtDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{mgmtDialogTitle}</DialogTitle>
              <DialogDescription>
                {mgmtDialogPeriodLabel}
                {" · "}
                {mgmtDialogRange.from && mgmtDialogRange.to
                  ? `${formatDate(mgmtDialogRange.from)} – ${formatDate(mgmtDialogRange.to)}`
                  : ""}
              </DialogDescription>
            </DialogHeader>
            {mgmtDialogLoading ? (
              <div className="py-10 text-center text-sm text-foreground/60">Loading…</div>
            ) : (
              <div className="space-y-3 border-t pt-4">
                {mgmtDialogLines.map((line) => (
                  <div key={line.label} className="flex justify-between gap-4 text-sm">
                    <span className="text-foreground/80">{line.label}</span>
                    <span className="font-medium text-foreground tabular-nums">{line.value}</span>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
