//components\sales-tabs\customers-table.tsx
"use client"

import { useState } from 'react';
import { Plus, Search, ChevronDown, Upload, X, File, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MessageSquare, Settings, Trash2Icon, Paperclip, Link as LinkIcon, ChevronUp, Eye } from "lucide-react";
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ComboboxInput from '../customers/combobox-inputs';

// Type definition
type Customer = {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string;
  currency: string;
  opening_balance: number;
};

export default function CustomersTable() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Sales Receipt State
  const [showSalesReceiptDialog, setShowSalesReceiptDialog] = useState(false);
  const [selectedCustomerForReceipt, setSelectedCustomerForReceipt] = useState<string>('');
  const [salesReceiptData, setSalesReceiptData] = useState({
    email: "",
    send_later: false,
    billing_address: "",
    receipt_date: new Date().toISOString().split('T')[0],
    receipt_no: "",
    location: "Head Office - Puerto Princesa City",
    tags: "",
    payment_method: "",
    reference_no: "",
    deposit_to: "Cash on hand",
    items: [{ serviceDate: "", productService: "", sku: "", description: "", qty: 1, rate: 0, amount: 0, class: "" }],
    message_receipt: "Thank you for making business with us!",
    message_statement: "",
    discount_percent: 0,
    amount_received: 0,
  });

  const generateReceiptNumber = () => {
    return Math.floor(10000 + Math.random() * 90000).toString(); // simple random 5 digit number
  };

  // Estimate State
  const [showEstimateDialog, setShowEstimateDialog] = useState(false);
  const [selectedCustomerForEstimate, setSelectedCustomerForEstimate] = useState<string>('');
  const [estimateData, setEstimateData] = useState({
    email: "",
    status: "Pending", // Pending, Accepted, Closed, Rejected
    billing_address: "",
    estimate_no: "",
    estimate_date: new Date().toISOString().split('T')[0],
    expiration_date: "",
    accepted_by: "",
    accepted_date: "",
    location: "Head Office - Puerto Princesa City",
    tags: "",
    items: [{ serviceDate: "", productService: "", sku: "", description: "", qty: 1, rate: 0, amount: 0, class: "" }],
    note_to_customer: "Thank you for your business.",
    memo_on_statement: "This memo will not show up on your estimate, but will appear on the statement.",
    discount_percent: 0,
    shipping_fee: 0,
    show_discount: true,
    show_shipping: false
  });

  const generateEstimateNumber = () => {
    return Math.floor(1000 + Math.random() * 9000).toString(); // simple 4 digit number like 1012
  };

  // Delayed Charge State
  const [showDelayedChargeDialog, setShowDelayedChargeDialog] = useState(false);
  const [selectedCustomerForCharge, setSelectedCustomerForCharge] = useState<string>('');
  const [delayedChargeData, setDelayedChargeData] = useState({
    charge_date: new Date().toISOString().split('T')[0],
    charge_no: "",
    location: "Head Office - Puerto Princesa City",
    tags: "",
    items: [{ serviceDate: "", productService: "", sku: "", description: "", qty: 1, rate: 0, amount: 0, class: "" },
    { serviceDate: "", productService: "", sku: "", description: "", qty: 1, rate: 0, amount: 0, class: "" }],
    memo: "",
  });

  const generateChargeNumber = () => {
    return Math.floor(10 + Math.random() * 90).toString();
  };

  // Time Activity State
  const [showTimeActivityDialog, setShowTimeActivityDialog] = useState(false);
  const [selectedCustomerForTimeActivity, setSelectedCustomerForTimeActivity] = useState<string>('');
  const [timeActivityData, setTimeActivityData] = useState({
    name: "",
    billable: false,
    class: "",
    location: "",
    set_start_end_time: false,
    start_date: new Date().toISOString().split('T')[0],
    duration: "",
    start_time: "",
    end_time: "",
    notes: "",
  });

  // Statement State
  const [showStatementDialog, setShowStatementDialog] = useState(false);
  const [statementData, setStatementData] = useState({
    statement_type: "Balance Forward",
    statement_date: new Date().toISOString().split('T')[0],
    start_date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    total_balance: 0,
    recipients: [] as { id: string, name: string, email: string, balance: number, selected: boolean }[]
  });

  // Task State
  const [showTaskSheet, setShowTaskSheet] = useState(false);
  const [selectedCustomerForTask, setSelectedCustomerForTask] = useState<any>(null);
  const [taskData, setTaskData] = useState({
    name: "",
    description: "",
    assign_to: "",
    due_date: new Date().toISOString().split('T')[0],
    priority: "-",
  });
  const [isTaskRecordsOpen, setIsTaskRecordsOpen] = useState(true);
  const [isTaskDocumentsOpen, setIsTaskDocumentsOpen] = useState(false);

  // Request Feedback State
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [selectedCustomerForFeedback, setSelectedCustomerForFeedback] = useState<Customer | null>(null);
  const [feedbackData, setFeedbackData] = useState({
    activeTab: "compose" as "compose" | "email-preview",
    askWorkRequest: true,
    askReview: true,
    askReferral: true,
    sendMethod: "petrobook" as "petrobook" | "email-client",
    recipient: "",
    subject: "Your Feedback Is Important To Us",
    emailBody: "",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingPage, setIsLoadingPage] = useState(false);

  const router = useRouter();
  type Attachment = {
    filename: string;
    file_url: string;
    file_size: number;
    file_type: string;
  };
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [paymentMethodHistory] = useState(['Cash', 'Check', 'Bank Transfer', 'Credit Card']);
  const [paymentTermsHistory] = useState(['Net 15', 'Net 30', 'Net 60', 'Due on receipt']);
  const [deliveryOptionsHistory] = useState(['Email', 'Mail', 'Pick up']);

  const [paymentMethodOpen, setPaymentMethodOpen] = useState(false);
  const [paymentTermsOpen, setPaymentTermsOpen] = useState(false);
  const [deliveryOptionsOpen, setDeliveryOptionsOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", company_name: "", mobile: "", fax: "", website: "",
    currency: "PHP", primary_payment_method: "", payment_terms: "", sales_form_delivery_options: "",
    sales_tax_registration: "", opening_balance: "0", opening_balance_date: new Date().toISOString().split('T')[0],
    billing_address: "", billing_street: "", billing_city: "", billing_province: "", billing_zip_code: "", billing_country: "Philippines",
    shipping_address: "", shipping_street: "", shipping_city: "", shipping_province: "", shipping_zip_code: "", shipping_country: "Philippines",
    same_as_billing: true, notes: ""
  });

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const toggleSelectAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map(c => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedCustomers(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, itemsPerPage, searchQuery]);

  const fetchCustomers = async () => {
    setIsLoadingPage(true);
    const supabase = createClient();

    // Calculate range for pagination
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let query = supabase
      .from("customers")
      .select("*", { count: 'exact' })
      .order("created_at", { ascending: false });

    // Add search filter if search query exists
    if (searchQuery.trim()) {
      query = query.or(`name.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
    }

    // Add pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error loading customers:", error);
      setIsLoadingPage(false);
      return;
    }

    setCustomers(data as Customer[]);
    setTotalCount(count || 0);
    setIsLoadingPage(false);
  };

  const handleBatchAction = (action: string) => {
    console.log(`${action} for customers:`, selectedCustomers);
  };

  const handleRowAction = (action: string, customerId: string) => {
    console.log(`${action} for customer:`, customerId);
    if (action === 'create-sales-receipt') {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setSelectedCustomerForReceipt(customer.id);
        setSalesReceiptData({
          ...salesReceiptData,
          email: customer.email || "",
          billing_address: customer.name + (customer.company_name ? `\n${customer.company_name}` : ''),
          receipt_no: generateReceiptNumber(),
          receipt_date: new Date().toISOString().split('T')[0],
        });
        setShowSalesReceiptDialog(true);
      }
    } else if (action === 'create-estimate') {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setSelectedCustomerForEstimate(customer.id);
        setEstimateData({
          ...estimateData,
          email: customer.email || "",
          billing_address: customer.name + (customer.company_name ? `\n${customer.company_name}` : ''),
          estimate_no: generateEstimateNumber(),
          estimate_date: new Date().toISOString().split('T')[0],
        });
        setShowEstimateDialog(true);
      }
    } else if (action === 'create-charge') {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setSelectedCustomerForCharge(customer.id);
        setDelayedChargeData({
          ...delayedChargeData,
          charge_date: new Date().toISOString().split('T')[0],
          charge_no: generateChargeNumber(),
        });
        setShowDelayedChargeDialog(true);
      }
    } else if (action === 'create-time-activity') {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setSelectedCustomerForTimeActivity(customer.id);
        setTimeActivityData({
          ...timeActivityData,
          start_date: new Date().toISOString().split('T')[0],
        });
        setShowTimeActivityDialog(true);
      }
    } else if (action === 'create-statement') {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setStatementData({
          ...statementData,
          statement_date: new Date().toISOString().split('T')[0],
          start_date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          total_balance: customer.opening_balance || 0,
          recipients: [{
            id: customer.id,
            name: customer.name + (customer.company_name ? ` (${customer.company_name})` : ''),
            email: customer.email || "",
            balance: customer.opening_balance || 0,
            selected: true
          }]
        });
        setShowStatementDialog(true);
      }
    } else if (action === 'create-task') {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setSelectedCustomerForTask(customer);
        setTaskData({
          ...taskData,
          name: "",
          description: "",
          assign_to: "Select one",
          due_date: new Date().toISOString().split('T')[0],
          priority: "-",
        });
        setShowTaskSheet(true);
      }
    } else if (action === 'request-feedback') {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setSelectedCustomerForFeedback(customer);
        setFeedbackData({
          activeTab: "compose",
          askWorkRequest: true,
          askReview: true,
          askReferral: true,
          sendMethod: "petrobook",
          recipient: customer.name,
          subject: "Your Feedback Is Important To Us",
          emailBody: `Dear ${customer.name},\n\nWe enjoyed working with you. We hope our services met your expectations.\n\nPlease fill out this brief survey to tell us how we did and how we might be helpful in the future.\n\nSincerely,\nPetrosphere Inc.`,
        });
        setShowFeedbackDialog(true);
      }
    }
  };

  const handleSalesReceiptItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...salesReceiptData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Auto-calculate amount if qty or rate changes
    if (field === 'qty' || field === 'rate') {
      const qty = field === 'qty' ? value : updatedItems[index].qty;
      const rate = field === 'rate' ? value : updatedItems[index].rate;
      updatedItems[index].amount = qty * rate;
    }

    setSalesReceiptData({ ...salesReceiptData, items: updatedItems });
  };

  const handleAddSalesReceiptItem = () => {
    setSalesReceiptData({
      ...salesReceiptData,
      items: [...salesReceiptData.items, { serviceDate: "", productService: "", sku: "", description: "", qty: 1, rate: 0, amount: 0, class: "" }],
    });
  };

  const handleRemoveSalesReceiptItem = (index: number) => {
    setSalesReceiptData({
      ...salesReceiptData,
      items: salesReceiptData.items.filter((_, i) => i !== index),
    });
  };

  const calculateSalesReceiptSubtotal = () => {
    return salesReceiptData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const calculateSalesReceiptTotal = () => {
    const subtotal = calculateSalesReceiptSubtotal();
    const discount = subtotal * (salesReceiptData.discount_percent / 100);
    return subtotal - discount;
  };

  const handleEstimateItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...estimateData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Auto-calculate amount if qty or rate changes
    if (field === 'qty' || field === 'rate') {
      const qty = field === 'qty' ? value : updatedItems[index].qty;
      const rate = field === 'rate' ? value : updatedItems[index].rate;
      updatedItems[index].amount = qty * rate;
    }

    setEstimateData({ ...estimateData, items: updatedItems });
  };

  const handleAddEstimateItem = () => {
    setEstimateData({
      ...estimateData,
      items: [...estimateData.items, { serviceDate: "", productService: "", sku: "", description: "", qty: 1, rate: 0, amount: 0, class: "" }],
    });
  };

  const handleRemoveEstimateItem = (index: number) => {
    setEstimateData({
      ...estimateData,
      items: estimateData.items.filter((_, i) => i !== index),
    });
  };

  const calculateEstimateSubtotal = () => {
    return estimateData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const calculateEstimateTotal = () => {
    const subtotal = calculateEstimateSubtotal();
    const discount = estimateData.show_discount ? subtotal * (estimateData.discount_percent / 100) : 0;
    const shipping = estimateData.show_shipping ? (estimateData.shipping_fee || 0) : 0;
    return subtotal - discount + shipping;
  };

  const handleDelayedChargeItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...delayedChargeData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    if (field === 'qty' || field === 'rate') {
      const qty = field === 'qty' ? value : updatedItems[index].qty;
      const rate = field === 'rate' ? value : updatedItems[index].rate;
      updatedItems[index].amount = qty * rate;
    }
    setDelayedChargeData({ ...delayedChargeData, items: updatedItems });
  };

  const handleAddDelayedChargeItem = () => {
    setDelayedChargeData({
      ...delayedChargeData,
      items: [...delayedChargeData.items, { serviceDate: "", productService: "", sku: "", description: "", qty: 1, rate: 0, amount: 0, class: "" }],
    });
  };

  const handleRemoveDelayedChargeItem = (index: number) => {
    setDelayedChargeData({
      ...delayedChargeData,
      items: delayedChargeData.items.filter((_, i) => i !== index),
    });
  };

  const calculateDelayedChargeTotal = () => {
    return delayedChargeData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      alert("File too large. Maximum file size is 20MB");
      return;
    }
    setUploading(true);
    setTimeout(() => {
      setAttachments([...attachments, {
        filename: file.name,
        file_url: URL.createObjectURL(file),
        file_size: file.size,
        file_type: file.type,
      }]);
      setUploading(false);
      e.target.value = "";
    }, 1000);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Replace your current handleSubmit function (around line 168) with this:

  const handleSubmit = async () => {
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("customers")
      .insert([
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company_name: formData.company_name,
          mobile: formData.mobile,
          fax: formData.fax,
          website: formData.website,

          currency: formData.currency,
          primary_payment_method: formData.primary_payment_method,
          payment_terms: formData.payment_terms,
          sales_form_delivery_options: formData.sales_form_delivery_options,
          sales_tax_registration: formData.sales_tax_registration,

          opening_balance: parseFloat(formData.opening_balance) || 0,
          opening_balance_date: formData.opening_balance_date,

          billing_street: formData.billing_street,
          billing_city: formData.billing_city,
          billing_province: formData.billing_province,
          billing_zip_code: formData.billing_zip_code,
          billing_country: formData.billing_country,

          shipping_street: formData.shipping_street,
          shipping_city: formData.shipping_city,
          shipping_province: formData.shipping_province,
          shipping_zip_code: formData.shipping_zip_code,
          shipping_country: formData.shipping_country,
          shipping_same_as_billing: formData.same_as_billing,

          notes: formData.notes,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error saving customer:", error);
      setLoading(false);
      return;
    }

    // Upload attachments
    for (const att of attachments) {
      await supabase.from("customer_attachments").insert([
        {
          customer_id: data.id,
          filename: att.filename,
          file_url: att.file_url,
          file_size: att.file_size,
          file_type: att.file_type,
        },
      ]);
    }

    // Reset to first page and refresh
    setCurrentPage(1);
    await fetchCustomers();

    setOpen(false);
    setFormData({
      name: "", email: "", phone: "", company_name: "", mobile: "", fax: "", website: "",
      currency: "PHP", primary_payment_method: "", payment_terms: "", sales_form_delivery_options: "",
      sales_tax_registration: "", opening_balance: "0", opening_balance_date: new Date().toISOString().split('T')[0],
      billing_address: "", billing_street: "", billing_city: "", billing_province: "", billing_zip_code: "", billing_country: "Philippines",
      shipping_address: "", shipping_street: "", shipping_city: "", shipping_province: "", shipping_zip_code: "", shipping_country: "Philippines",
      same_as_billing: true, notes: ""
    });

    setAttachments([]);
    setLoading(false);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setSelectedCustomers([]); // Clear selections when changing pages
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // Reset to first page
    setSelectedCustomers([]); // Clear selections
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header with Search and New Customer Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
              className="pl-10 bg-card"
            />
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                New customer
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent
              showCloseButton={false}
              className="max-w-3xl p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* ── Header ── */}
              <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-base shrink-0 select-none">
                    {formData.name ? formData.name.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div>
                    <DialogTitle className="text-base font-semibold leading-tight">
                      {formData.name.trim() || "New Customer"}
                    </DialogTitle>
                    {formData.company_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">{formData.company_name}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* ── Tabs ── */}
              <Tabs defaultValue="contact" className="flex-1 flex flex-col overflow-hidden">
                <div className="border-b shrink-0 px-2">
                  <TabsList className="h-auto bg-transparent p-0 gap-0">
                    {[
                      { value: "contact", label: "Contact" },
                      { value: "address", label: "Address" },
                      { value: "payment", label: "Payment" },
                      { value: "additional", label: "Additional" },
                    ].map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="relative px-5 py-3 text-sm font-medium rounded-none bg-transparent shadow-none
                                   text-muted-foreground hover:text-foreground transition-colors
                                   data-[state=active]:text-green-700
                                   data-[state=active]:after:absolute data-[state=active]:after:bottom-0
                                   data-[state=active]:after:left-0 data-[state=active]:after:right-0
                                   data-[state=active]:after:h-0.5 data-[state=active]:after:bg-green-600
                                   data-[state=active]:after:content-[''] data-[state=active]:after:rounded-t"
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {/* Scrollable content area */}
                <div className="flex-1 overflow-y-auto">

                  {/* ── Contact tab ── */}
                  <TabsContent value="contact" className="p-6 space-y-5 mt-0 focus-visible:ring-0 focus-visible:outline-none">
                    {/* Currency row */}
                    <div className="flex items-center gap-4 px-4 py-3 bg-muted/40 rounded-lg border">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground w-20 shrink-0">Currency</span>
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="PHP">PHP — Philippine Peso</option>
                        <option value="USD">USD — United States Dollar</option>
                        <option value="EUR">EUR — Euro</option>
                        <option value="GBP">GBP — British Pound Sterling</option>
                        <option value="JPY">JPY — Japanese Yen</option>
                        <option value="AUD">AUD — Australian Dollar</option>
                        <option value="CAD">CAD — Canadian Dollar</option>
                      </select>
                    </div>

                    {/* Name + Company */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Customer display name <span className="text-red-500 normal-case">*</span>
                        </Label>
                        <Input
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Full name"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company name</Label>
                        <Input
                          value={formData.company_name}
                          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                          placeholder="Company name"
                          className="h-10"
                        />
                      </div>
                    </div>

                    {/* Email + Phone */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</Label>
                        <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" className="h-10" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone number</Label>
                        <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="0912-345-6789" className="h-10" />
                      </div>
                    </div>

                    {/* Mobile + Fax */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mobile number</Label>
                        <Input value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} placeholder="0912-345-6789" className="h-10" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fax</Label>
                        <Input value={formData.fax} onChange={(e) => setFormData({ ...formData, fax: e.target.value })} placeholder="Fax number" className="h-10" />
                      </div>
                    </div>

                    {/* Website */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Website</Label>
                      <Input value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://example.com" className="h-10" />
                    </div>
                  </TabsContent>

                  {/* ── Address tab ── */}
                  <TabsContent value="address" className="p-6 space-y-6 mt-0 focus-visible:ring-0 focus-visible:outline-none">
                    {/* Billing */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                        <h3 className="text-sm font-semibold">Billing address</h3>
                      </div>
                      <Textarea
                        placeholder="Street address"
                        value={formData.billing_street}
                        onChange={(e) => setFormData({ ...formData, billing_street: e.target.value })}
                        className="min-h-[80px] resize-none"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">City</Label>
                          <Input value={formData.billing_city} onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })} placeholder="City" className="h-10" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Province</Label>
                          <Input value={formData.billing_province} onChange={(e) => setFormData({ ...formData, billing_province: e.target.value })} placeholder="Province" className="h-10" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ZIP code</Label>
                          <Input value={formData.billing_zip_code} onChange={(e) => setFormData({ ...formData, billing_zip_code: e.target.value })} placeholder="ZIP code" className="h-10" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Country</Label>
                          <Input value={formData.billing_country} onChange={(e) => setFormData({ ...formData, billing_country: e.target.value })} placeholder="Philippines" className="h-10" />
                        </div>
                      </div>
                    </div>

                    <div className="border-t" />

                    {/* Shipping */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                          <h3 className="text-sm font-semibold">Shipping address</h3>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <Checkbox
                            checked={formData.same_as_billing}
                            onCheckedChange={(checked) => setFormData({ ...formData, same_as_billing: checked === true })}
                          />
                          <span className="text-xs text-muted-foreground">Same as billing</span>
                        </label>
                      </div>
                      {formData.same_as_billing ? (
                        <div className="px-4 py-3 bg-muted/40 rounded-lg text-sm text-muted-foreground border border-dashed">
                          Using billing address for shipping.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Textarea
                            placeholder="Street address"
                            value={formData.shipping_street}
                            onChange={(e) => setFormData({ ...formData, shipping_street: e.target.value })}
                            className="min-h-[80px] resize-none"
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">City</Label>
                              <Input value={formData.shipping_city} onChange={(e) => setFormData({ ...formData, shipping_city: e.target.value })} placeholder="City" className="h-10" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Province</Label>
                              <Input value={formData.shipping_province} onChange={(e) => setFormData({ ...formData, shipping_province: e.target.value })} placeholder="Province" className="h-10" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ZIP code</Label>
                              <Input value={formData.shipping_zip_code} onChange={(e) => setFormData({ ...formData, shipping_zip_code: e.target.value })} placeholder="ZIP code" className="h-10" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Country</Label>
                              <Input value={formData.shipping_country} onChange={(e) => setFormData({ ...formData, shipping_country: e.target.value })} placeholder="Philippines" className="h-10" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* ── Payment tab ── */}
                  <TabsContent value="payment" className="p-6 space-y-5 mt-0 focus-visible:ring-0 focus-visible:outline-none">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Primary payment method</Label>
                        <ComboboxInput
                          value={formData.primary_payment_method}
                          onChange={(value) => setFormData({ ...formData, primary_payment_method: value })}
                          options={paymentMethodHistory}
                          placeholder="Select or type..."
                          open={paymentMethodOpen}
                          setOpen={setPaymentMethodOpen}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Terms</Label>
                        <ComboboxInput
                          value={formData.payment_terms}
                          onChange={(value) => setFormData({ ...formData, payment_terms: value })}
                          options={paymentTermsHistory}
                          placeholder="Select or type..."
                          open={paymentTermsOpen}
                          setOpen={setPaymentTermsOpen}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sales form delivery</Label>
                      <ComboboxInput
                        value={formData.sales_form_delivery_options}
                        onChange={(value) => setFormData({ ...formData, sales_form_delivery_options: value })}
                        options={deliveryOptionsHistory}
                        placeholder="Select or type..."
                        open={deliveryOptionsOpen}
                        setOpen={setDeliveryOptionsOpen}
                      />
                    </div>
                  </TabsContent>

                  {/* ── Additional tab ── */}
                  <TabsContent value="additional" className="p-6 space-y-6 mt-0 focus-visible:ring-0 focus-visible:outline-none">
                    {/* Taxes */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                        <h3 className="text-sm font-semibold">Taxes</h3>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sales tax registration</Label>
                        <Input
                          value={formData.sales_tax_registration}
                          onChange={(e) => setFormData({ ...formData, sales_tax_registration: e.target.value })}
                          placeholder="Tax registration number"
                          className="h-10"
                        />
                      </div>
                    </div>

                    <div className="border-t" />

                    {/* Opening balance */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                        <h3 className="text-sm font-semibold">Opening balance</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.opening_balance}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                setFormData({ ...formData, opening_balance: value });
                              }
                            }}
                            placeholder="0.00"
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">As of date</Label>
                          <Input
                            type="date"
                            value={formData.opening_balance_date}
                            onChange={(e) => setFormData({ ...formData, opening_balance_date: e.target.value })}
                            className="h-10"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t" />

                    {/* Notes & Attachments */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                        <h3 className="text-sm font-semibold">Notes & attachments</h3>
                      </div>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="min-h-[100px] resize-none"
                        placeholder="Add any notes about this customer..."
                      />
                      <div className="border-2 border-dashed rounded-lg p-4 text-center">
                        <input type="file" id="file-upload" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-1">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <span className="text-sm text-primary hover:underline">{uploading ? "Uploading..." : "Add attachment"}</span>
                          <span className="text-xs text-muted-foreground">Max file size: 20 MB</span>
                        </label>
                      </div>
                      {attachments.length > 0 && (
                        <div className="space-y-2">
                          {attachments.map((att, index) => (
                            <div key={index} className="flex items-center justify-between px-3 py-2 bg-muted/40 rounded-md border">
                              <div className="flex items-center gap-2">
                                <File className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{att.filename}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAttachment(index)}
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                </div>
              </Tabs>

              {/* ── Footer ── */}
              <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20 shrink-0">
                <span className="text-xs text-muted-foreground">
                  <span className="text-red-500">*</span> Required fields
                </span>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || !formData.name.trim()}
                    className="bg-green-600 hover:bg-green-700 text-white min-w-[130px]"
                  >
                    {loading ? "Saving..." : "Save customer"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Batch Actions Bar */}
        {selectedCustomers.length > 0 && (
          <div className="bg-[#3f3f46] text-white px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
            <span className="font-medium">{selectedCustomers.length} customer{selectedCustomers.length > 1 ? 's' : ''} selected</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm">
                  Batch actions
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleBatchAction('create-statements')}>Create statements</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBatchAction('email')}>Email</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBatchAction('make-inactive')}>Make inactive</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Table */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedCustomers.length === customers.length && customers.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="font-semibold">NAME ↑</TableHead>
                <TableHead className="font-semibold">COMPANY NAME</TableHead>
                <TableHead className="font-semibold">PHONE</TableHead>
                <TableHead className="font-semibold">CURRENCY</TableHead>
                <TableHead className="font-semibold text-right">OPEN BALANCE</TableHead>
                <TableHead className="font-semibold text-center">ACTION</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoadingPage ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No customers found matching your search.' : 'No customers yet. Click "New customer" to add one.'}
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className={`cursor-pointer hover:bg-muted/40 ${selectedCustomers.includes(customer.id) ? 'bg-muted/30' : ''}`}
                    onClick={() => router.push(`/customers/${customer.id}`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selectedCustomers.includes(customer.id)} onCheckedChange={() => toggleSelect(customer.id)} />
                    </TableCell>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.company_name || 'None'}</TableCell>
                    <TableCell>{customer.phone || 'NONE'}</TableCell>
                    <TableCell>{customer.currency}</TableCell>
                    <TableCell className="text-right">{customer.currency}{customer.opening_balance.toFixed(2)}</TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="link" className="text-primary p-0 h-auto font-normal">
                            Create invoice
                            <ChevronDown className="ml-1 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRowAction('create-invoice', customer.id)}>Create invoice</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRowAction('create-sales-receipt', customer.id)}>Create sales receipt</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRowAction('create-estimate', customer.id)}>Create estimate</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRowAction('create-charge', customer.id)}>Create charge</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRowAction('create-time-activity', customer.id)}>Create time activity</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRowAction('create-statement', customer.id)}>Create statement</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRowAction('create-task', customer.id)}>Create task</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleRowAction('make-inactive', customer.id)}>Make inactive</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRowAction('request-feedback', customer.id)}>Request feedback</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRowAction('create-contract', customer.id)}>
                            Create contract <span className="ml-1 text-pink-500">●</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalCount > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-[80px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground ml-4">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} customers
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isLoadingPage}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {getPageNumbers().map((page, index) => (
                  page === '...' ? (
                    <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">...</span>
                  ) : (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page as number)}
                      disabled={isLoadingPage}
                      className="w-9 h-9"
                    >
                      {page}
                    </Button>
                  )
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isLoadingPage}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Sales Receipt Creation Dialog — full-screen QuickBooks style */}
      <Dialog open={showSalesReceiptDialog} onOpenChange={setShowSalesReceiptDialog}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100vw-2rem)] max-w-[1400px] h-[90vh] p-0 overflow-hidden flex flex-col"
        >
          <div className="flex flex-col h-full bg-[#f4f5f8]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-[#f4f5f8] shrink-0 border-b-2">
              <div className="flex items-center gap-4">
                <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
                  <span className="text-muted-foreground mr-1">🕒</span>
                  Sales Receipt #{salesReceiptData.receipt_no}
                </DialogTitle>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" className="text-muted-foreground hidden lg:flex">
                  <MessageSquare className="h-4 w-4 mr-2" /> Feedback
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setShowSalesReceiptDialog(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-auto bg-white">
              <div className="p-8 max-w-[1200px] mx-auto">
                <div className="space-y-8">
                  {/* Top Section */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative">

                    {/* Amount Header Output */}
                    <div className="absolute top-0 right-0 text-right">
                      <div className="text-sm font-semibold text-muted-foreground mb-1">AMOUNT</div>
                      <div className="text-4xl font-bold">
                        PHP{calculateSalesReceiptTotal().toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Left Column (Customer & Email) */}
                    <div className="col-span-12 md:col-span-5 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Customer</Label>
                          <Select
                            value={selectedCustomerForReceipt}
                            onValueChange={(val) => {
                              setSelectedCustomerForReceipt(val);
                              const cust = customers.find(c => c.id === val);
                              if (cust) {
                                setSalesReceiptData({
                                  ...salesReceiptData,
                                  email: cust.email || "",
                                  billing_address: cust.name + (cust.company_name ? `\n${cust.company_name}` : '')
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="w-full border-gray-300">
                              <SelectValue placeholder="Choose a customer" />
                            </SelectTrigger>
                            <SelectContent>
                              {customers.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5 relative">
                          <Label className="text-sm font-medium flex justify-between">Email <span className="text-xs text-muted-foreground font-normal mt-0.5">Cc/Bcc</span></Label>
                          <Input
                            value={salesReceiptData.email}
                            onChange={(e) => setSalesReceiptData({ ...salesReceiptData, email: e.target.value })}
                            className="border-gray-300"
                          />
                          <div className="flex items-center gap-2 mt-2">
                            <Checkbox
                              id="send-later"
                              checked={salesReceiptData.send_later}
                              onCheckedChange={(c) => setSalesReceiptData({ ...salesReceiptData, send_later: c === true })}
                              className="border-gray-300"
                            />
                            <Label htmlFor="send-later" className="text-sm font-normal cursor-pointer text-muted-foreground">Send later</Label>
                          </div>
                        </div>
                      </div>
                    </div>


                    {/* Address & Date Row */}
                    <div className="col-span-12 grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
                      <div className="col-span-12 md:col-span-3 space-y-1.5">
                        <Label className="text-sm font-medium">Billing Address</Label>
                        <Textarea
                          value={salesReceiptData.billing_address}
                          onChange={(e) => setSalesReceiptData({ ...salesReceiptData, billing_address: e.target.value })}
                          className="min-h-[100px] border-green-500 bg-white resize-none"
                        />
                      </div>

                      <div className="col-span-12 md:col-span-2 space-y-1.5">
                        <Label className="text-sm font-medium">Sales Receipt Date</Label>
                        <Input
                          type="date"
                          value={salesReceiptData.receipt_date}
                          onChange={(e) => setSalesReceiptData({ ...salesReceiptData, receipt_date: e.target.value })}
                          className="border-gray-300"
                        />
                      </div>

                      <div className="col-span-12 md:col-span-7 flex justify-end gap-4 mt-8">
                        <div className="space-y-1.5 w-32">
                          <Label className="text-sm font-medium">Sales Receipt no.</Label>
                          <Input
                            value={salesReceiptData.receipt_no}
                            onChange={(e) => setSalesReceiptData({ ...salesReceiptData, receipt_no: e.target.value })}
                            className="border-gray-300 text-right"
                          />
                        </div>
                        <div className="space-y-1.5 w-48">
                          <Label className="text-sm font-medium">Location</Label>
                          <Select
                            value={salesReceiptData.location}
                            onValueChange={(val) => setSalesReceiptData({ ...salesReceiptData, location: val })}
                          >
                            <SelectTrigger className="w-full border-gray-300">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Head Office - Puerto Princesa City">Head Office - Puerto P...</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Tags & Payment Details */}
                    <div className="col-span-12 border-t border-gray-200 mt-2 mb-2"></div>

                    <div className="col-span-12 md:col-span-6 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm font-medium">Tags <span className="text-muted-foreground font-normal">(?)</span></Label>
                        <span className="text-xs text-blue-600 cursor-pointer font-medium">Manage tags</span>
                      </div>
                      <Input
                        placeholder="Start typing to add a tag"
                        className="border-gray-300"
                        value={salesReceiptData.tags}
                        onChange={(e) => setSalesReceiptData({ ...salesReceiptData, tags: e.target.value })}
                      />
                    </div>

                    <div className="col-span-12 grid grid-cols-1 md:grid-cols-12 gap-6 pb-4">
                      <div className="col-span-12 md:col-span-3 space-y-1.5">
                        <Label className="text-sm font-medium">Payment method</Label>
                        <Select
                          value={salesReceiptData.payment_method}
                          onValueChange={(val) => setSalesReceiptData({ ...salesReceiptData, payment_method: val })}
                        >
                          <SelectTrigger className="w-full border-gray-300">
                            <SelectValue placeholder="Choose payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentMethodHistory.map(pm => (
                              <SelectItem key={pm} value={pm}>{pm}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-12 md:col-span-2 space-y-1.5">
                        <Label className="text-sm font-medium">Reference no.</Label>
                        <Input
                          className="border-gray-300"
                          value={salesReceiptData.reference_no}
                          onChange={(e) => setSalesReceiptData({ ...salesReceiptData, reference_no: e.target.value })}
                        />
                      </div>
                      <div className="col-span-12 md:col-span-3 space-y-1.5">
                        <Label className="text-sm font-medium">Deposit To</Label>
                        <Select
                          value={salesReceiptData.deposit_to}
                          onValueChange={(val) => setSalesReceiptData({ ...salesReceiptData, deposit_to: val })}
                        >
                          <SelectTrigger className="w-full border-gray-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cash on hand">Cash on hand</SelectItem>
                            <SelectItem value="Bank Account">Bank Account</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="mt-8">
                    <div className="flex justify-end items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Amounts are</span>
                        <Select defaultValue="Out of Scope of Tax">
                          <SelectTrigger className="w-48 border-gray-300 h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Out of Scope of Tax">Out of Scope of Tax</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="border border-[#e5e7eb] rounded-t-lg overflow-hidden border-b-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-[#f4f5f8] border-b border-[#e5e7eb]">
                            <tr>
                              <th className="text-left py-3 px-2 font-semibold text-xs text-muted-foreground w-12 border-r border-[#e5e7eb]"></th>
                              <th className="text-left py-3 px-3 font-semibold text-xs text-muted-foreground w-12 border-r border-[#e5e7eb]">#</th>
                              <th className="text-left p-3 font-semibold text-xs text-muted-foreground min-w-[120px] border-r border-[#e5e7eb]">SERVICE DATE</th>
                              <th className="text-left p-3 font-semibold text-xs text-muted-foreground min-w-[180px] border-r border-[#e5e7eb]">PRODUCT/SERVICE</th>
                              <th className="text-left p-3 font-semibold text-xs text-muted-foreground min-w-[80px] border-r border-[#e5e7eb]">SKU</th>
                              <th className="text-left p-3 font-semibold text-xs text-muted-foreground min-w-[200px] border-r border-[#e5e7eb]">DESCRIPTION</th>
                              <th className="text-right p-3 font-semibold text-xs text-muted-foreground min-w-[80px] border-r border-[#e5e7eb]">QTY</th>
                              <th className="text-right p-3 font-semibold text-xs text-muted-foreground min-w-[100px] border-r border-[#e5e7eb]">RATE</th>
                              <th className="text-right p-3 font-semibold text-xs text-muted-foreground min-w-[120px] border-r border-[#e5e7eb]">AMOUNT</th>
                              <th className="text-left p-3 font-semibold text-xs text-muted-foreground min-w-[120px] border-r border-[#e5e7eb]">CLASS</th>
                              <th className="w-12"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {salesReceiptData.items.map((item, index) => (
                              <tr key={index} className="border-b border-[#e5e7eb] hover:bg-gray-50 bg-white">
                                <td className="py-2 px-2 text-muted-foreground/30 text-center cursor-move border-r border-[#e5e7eb]">⋮⋮</td>
                                <td className="p-2 border-r border-[#e5e7eb] text-center text-muted-foreground font-medium">{index + 1}</td>
                                <td className="p-0 border-r border-[#e5e7eb] hover:bg-gray-100 transition-colors">
                                  <input
                                    type="date"
                                    value={item.serviceDate}
                                    onChange={(e) => handleSalesReceiptItemChange(index, "serviceDate", e.target.value)}
                                    className="w-full h-full p-3 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary text-sm"
                                  />
                                </td>
                                <td className="p-0 border-r border-[#e5e7eb] hover:bg-gray-100 transition-colors">
                                  <input
                                    type="text"
                                    value={item.productService}
                                    onChange={(e) => handleSalesReceiptItemChange(index, "productService", e.target.value)}
                                    className="w-full h-full p-3 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary text-sm font-semibold"
                                  />
                                </td>
                                <td className="p-0 border-r border-[#e5e7eb] hover:bg-gray-100 transition-colors">
                                  <input
                                    type="text"
                                    value={item.sku}
                                    onChange={(e) => handleSalesReceiptItemChange(index, "sku", e.target.value)}
                                    className="w-full h-full p-3 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary text-sm"
                                  />
                                </td>
                                <td className="p-0 border-r border-[#e5e7eb] hover:bg-gray-100 transition-colors">
                                  <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) => handleSalesReceiptItemChange(index, "description", e.target.value)}
                                    className="w-full h-full p-3 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary text-sm"
                                  />
                                </td>
                                <td className="p-0 border-r border-[#e5e7eb] hover:bg-gray-100 transition-colors">
                                  <input
                                    type="number"
                                    value={item.qty === 0 ? "" : item.qty}
                                    onChange={(e) => handleSalesReceiptItemChange(index, "qty", parseFloat(e.target.value) || 0)}
                                    className="w-full h-full p-3 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary text-sm text-right"
                                  />
                                </td>
                                <td className="p-0 border-r border-[#e5e7eb] hover:bg-gray-100 transition-colors">
                                  <input
                                    type="number"
                                    value={item.rate === 0 ? "" : item.rate}
                                    onChange={(e) => handleSalesReceiptItemChange(index, "rate", parseFloat(e.target.value) || 0)}
                                    className="w-full h-full p-3 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary text-sm text-right"
                                  />
                                </td>
                                <td className="p-3 border-r border-[#e5e7eb] text-right font-semibold bg-[#f9fafb]">
                                  {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-0 border-r border-[#e5e7eb] hover:bg-gray-100 transition-colors">
                                  <input
                                    type="text"
                                    value={item.class}
                                    onChange={(e) => handleSalesReceiptItemChange(index, "class", e.target.value)}
                                    className="w-full h-full p-3 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary text-sm"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <Button variant="ghost" size="icon" onClick={() => handleRemoveSalesReceiptItem(index)} className="h-8 w-8 hover:bg-gray-200">
                                    <Trash2Icon className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex gap-2 p-3 border border-t-0 border-[#e5e7eb] rounded-b-lg bg-white">
                      <Button variant="outline" size="sm" onClick={handleAddSalesReceiptItem} className="h-8 text-xs font-semibold px-4 border-gray-300">
                        Add lines
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSalesReceiptData({ ...salesReceiptData, items: [{ serviceDate: "", productService: "", sku: "", description: "", qty: 1, rate: 0, amount: 0, class: "" }] })}
                        className="h-8 text-xs font-semibold px-4 border-gray-300"
                      >
                        Clear all lines
                      </Button>
                    </div>
                  </div>

                  {/* Bottom Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-8 pt-4">
                    {/* Messaging & Attachments */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Message displayed on sales receipt</Label>
                        <Textarea
                          className="min-h-[80px] border-gray-300 resize-none text-sm"
                          value={salesReceiptData.message_receipt}
                          onChange={(e) => setSalesReceiptData({ ...salesReceiptData, message_receipt: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Message displayed on statement</Label>
                        <Textarea
                          className="min-h-[80px] border-gray-300 resize-none text-sm"
                          value={salesReceiptData.message_statement}
                          onChange={(e) => setSalesReceiptData({ ...salesReceiptData, message_statement: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Attachments</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50/50">
                          <label htmlFor="receipt-file-upload" className="cursor-pointer flex flex-col items-center group">
                            <span className="text-blue-600 group-hover:underline font-medium text-sm">Add attachment</span>
                            <span className="text-xs text-muted-foreground mt-1">Max file size: 20 MB</span>
                          </label>
                          <div className="mt-2">
                            <span className="text-sm text-blue-600 hover:underline cursor-pointer">Show existing</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Totals Calculation */}
                    <div className="pl-0 md:pl-16 space-y-6">
                      <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                        <span className="font-medium text-sm">Subtotal</span>
                        <span className="font-semibold">
                          PHP{calculateSalesReceiptSubtotal().toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <Select defaultValue="Discount Percent">
                            <SelectTrigger className="w-36 h-8 text-sm border-gray-300 bg-gray-50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Discount Percent">Discount Percent</SelectItem>
                              <SelectItem value="Discount Value">Discount Value</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            className="w-20 h-8 text-right border-gray-300"
                            value={salesReceiptData.discount_percent}
                            onChange={(e) => setSalesReceiptData({ ...salesReceiptData, discount_percent: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <span className="font-semibold">
                          PHP{(calculateSalesReceiptSubtotal() * (salesReceiptData.discount_percent / 100)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <span className="font-semibold text-lg">Total</span>
                        <span className="font-bold text-lg">
                          PHP{calculateSalesReceiptTotal().toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-8 border-t border-gray-200">
                        <span className="font-medium text-sm text-muted-foreground mr-4">Amount received</span>
                        <div className="flex-1 flex justify-end">
                          <span className="font-semibold text-muted-foreground">
                            PHP{(calculateSalesReceiptTotal()).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4">
                        <span className="font-bold">Balance due</span>
                        <span className="font-bold text-xl">
                          PHP0.00
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Privacy bottom text */}
                  <div className="flex justify-center pt-8 pb-4">
                    <span className="text-sm text-blue-600 hover:underline cursor-pointer">Privacy</span>
                  </div>

                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-white border-t border-gray-200 shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] rounded-b-xl">
              <div className="flex items-center justify-between max-w-[1200px] mx-auto">
                <div className="flex items-center gap-6">
                  <Button variant="ghost" className="font-semibold px-6 rounded-full hover:bg-gray-100 border border-transparent" onClick={() => setShowSalesReceiptDialog(false)}>
                    Cancel
                  </Button>
                  <Button variant="ghost" className="font-semibold text-green-700 hover:text-green-800 hover:bg-green-50 px-4" onClick={() => {
                    setSalesReceiptData({
                      email: "", send_later: false, billing_address: "", receipt_date: new Date().toISOString().split('T')[0],
                      receipt_no: generateReceiptNumber(), location: "Head Office - Puerto Princesa City", tags: "", payment_method: "",
                      reference_no: "", deposit_to: "Cash on hand", items: [{ serviceDate: "", productService: "", sku: "", description: "", qty: 1, rate: 0, amount: 0, class: "" }],
                      message_receipt: "Thank you for making business with us!", message_statement: "", discount_percent: 0, amount_received: 0,
                    });
                  }}>
                    Clear
                  </Button>
                </div>

                <div className="flex items-center">
                  <Button variant="ghost" className="font-semibold text-green-700 hover:text-green-800 hover:bg-green-50 px-4 border-r border-gray-300 rounded-none h-8">
                    Print or Preview
                  </Button>
                  <Button variant="ghost" className="font-semibold text-green-700 hover:text-green-800 hover:bg-green-50 px-4 border-r border-gray-300 rounded-none h-8">
                    Make recurring
                  </Button>
                  <Button variant="ghost" className="font-semibold text-green-700 hover:text-green-800 hover:bg-green-50 px-4 h-8">
                    Customise
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" className="font-semibold text-green-700 border-green-700 hover:bg-green-50 rounded-full px-6">
                    Save
                  </Button>
                  <div className="flex group">
                    <Button className="bg-green-700 hover:bg-green-800 text-white font-semibold rounded-l-full rounded-r-none px-6 shadow-sm group-hover:bg-green-800 border-r border-green-800/30">
                      Save and close
                    </Button>
                    <Button className="bg-green-700 hover:bg-green-800 text-white rounded-r-full rounded-l-none px-2 shadow-sm group-hover:bg-green-800">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* Estimate Creation Dialog — full-screen QuickBooks style with right sidebar */}
      <Dialog open={showEstimateDialog} onOpenChange={setShowEstimateDialog}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100vw-2rem)] max-w-[1400px] h-[90vh] p-0 overflow-hidden flex flex-col bg-[#f4f5f8]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-[#f4f5f8] shrink-0 border-b-2">
            <div className="flex items-center gap-4">
              <DialogTitle className="text-2xl font-semibold flex items-center gap-2 text-gray-700">
                <span className="text-muted-foreground mr-1">🕒</span>
                Estimate {estimateData.estimate_no}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="text-muted-foreground hidden lg:flex">
                <Settings className="h-4 w-4 mr-2" /> Manage
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hidden lg:flex">
                <MessageSquare className="h-4 w-4 mr-2" /> Take tour
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hidden lg:flex">
                <MessageSquare className="h-4 w-4 mr-2" /> Feedback
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hidden lg:flex">
                <File className="h-4 w-4 mr-2" /> Old layout
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowEstimateDialog(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Main Content - Left Side */}
            <div className="flex-1 overflow-auto bg-[#f4f5f8] p-6 lg:p-8">
              <div className="max-w-[1000px] mx-auto bg-white border border-gray-200 shadow-sm min-h-full flex flex-col">

                {/* Form Header */}
                <div className="p-8 flex justify-between items-start">
                  <h2 className="text-blue-700 font-bold tracking-widest text-lg">ESTIMATE</h2>
                  <div className="text-sm font-semibold text-right text-gray-800">
                    Amount (hidden): PHP{calculateEstimateTotal().toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="px-8 pb-8 space-y-8 flex-1">
                  {/* Top Section */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

                    {/* Left Column (Customer & Email) */}
                    <div className="col-span-12 md:col-span-5 space-y-4">
                      <div className="space-y-2">
                        <Select
                          value={selectedCustomerForEstimate}
                          onValueChange={(val) => {
                            setSelectedCustomerForEstimate(val);
                            const cust = customers.find(c => c.id === val);
                            if (cust) {
                              setEstimateData({
                                ...estimateData,
                                email: cust.email || "",
                                billing_address: cust.name + (cust.company_name ? `\n${cust.company_name}` : '')
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="w-full border-gray-300">
                            <SelectValue placeholder="Choose a customer" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Input
                          value={estimateData.email}
                          onChange={(e) => setEstimateData({ ...estimateData, email: e.target.value })}
                          className="border-gray-300"
                        />
                        <span className="text-blue-600 text-sm font-medium cursor-pointer hover:underline">1 Cc/Bcc</span>
                      </div>

                      <div className="space-y-1 pt-2">
                        <Label className="text-sm text-gray-700 font-medium">Bill to</Label>
                        <Textarea
                          value={estimateData.billing_address}
                          onChange={(e) => setEstimateData({ ...estimateData, billing_address: e.target.value })}
                          className="min-h-[100px] border-gray-300 bg-white resize-none"
                        />
                        <div className="pt-1">
                          <span className="text-blue-600 text-sm font-medium cursor-pointer hover:underline">Edit Customer</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column (Dates & Ref) */}
                    <div className="col-span-12 md:col-span-7 grid grid-cols-2 gap-x-6 gap-y-4 pt-10">
                      <div className="space-y-1.5 flex flex-col md:flex-row md:items-center justify-between">
                        <Label className="text-sm text-gray-700 font-medium whitespace-nowrap md:mr-4">Estimate no.</Label>
                        <Input
                          value={estimateData.estimate_no}
                          onChange={(e) => setEstimateData({ ...estimateData, estimate_no: e.target.value })}
                          className="border-gray-300 w-full md:w-40 text-left"
                        />
                      </div>
                      <div className="space-y-1.5 flex flex-col md:flex-row md:items-center justify-between">
                        <Label className="text-sm text-gray-700 font-medium whitespace-nowrap md:mr-4">Accepted by</Label>
                        <Input
                          value={estimateData.accepted_by}
                          onChange={(e) => setEstimateData({ ...estimateData, accepted_by: e.target.value })}
                          className="border-gray-300 w-full md:w-36 text-left"
                        />
                      </div>

                      <div className="space-y-1.5 flex flex-col md:flex-row md:items-center justify-between">
                        <Label className="text-sm text-gray-700 font-medium whitespace-nowrap md:mr-4">Estimate date</Label>
                        <Input
                          type="date"
                          value={estimateData.estimate_date}
                          onChange={(e) => setEstimateData({ ...estimateData, estimate_date: e.target.value })}
                          className="border-gray-300 w-full md:w-40 text-left text-sm"
                        />
                      </div>
                      <div className="space-y-1.5 flex flex-col md:flex-row md:items-center justify-between">
                        <Label className="text-sm text-gray-700 font-medium whitespace-nowrap md:mr-4">Accepted date</Label>
                        <Input
                          type="date"
                          value={estimateData.accepted_date}
                          onChange={(e) => setEstimateData({ ...estimateData, accepted_date: e.target.value })}
                          className="border-gray-300 w-full md:w-36 text-left text-sm"
                        />
                      </div>

                      <div className="space-y-1.5 flex flex-col md:flex-row md:items-center justify-between">
                        <Label className="text-sm text-gray-700 font-medium whitespace-nowrap md:mr-4">Expiration date</Label>
                        <Input
                          type="date"
                          value={estimateData.expiration_date}
                          onChange={(e) => setEstimateData({ ...estimateData, expiration_date: e.target.value })}
                          className="border-gray-300 w-full md:w-40 text-left text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tags & Location */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm text-gray-500 font-normal">Tags (hidden):</Label>
                        <span className="text-xs text-blue-600 cursor-pointer font-medium">Manage tags</span>
                      </div>
                      <Input
                        placeholder="Start typing to add a tag"
                        className="border-gray-300"
                        value={estimateData.tags}
                        onChange={(e) => setEstimateData({ ...estimateData, tags: e.target.value })}
                      />
                      <div className="pt-4 space-y-1.5">
                        <Label className="text-sm text-gray-500 font-normal">Invoice amounts are (hidden):</Label>
                        <Select defaultValue="Out of Scope of Tax">
                          <SelectTrigger className="w-48 border-gray-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Out of Scope of Tax">Out of Scope of Tax</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-gray-500 font-normal">Location (hidden):</Label>
                      <Select
                        value={estimateData.location}
                        onValueChange={(val) => setEstimateData({ ...estimateData, location: val })}
                      >
                        <SelectTrigger className="w-full border-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Head Office - Puerto Princesa City">Head Office - Puerto Princesa City</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Product or service Title */}
                  <div className="pt-4">
                    <h3 className="font-bold text-gray-800 text-lg">Product or service</h3>
                  </div>

                  {/* Items Table */}
                  <div className="mt-2">
                    <div className="border border-[#e5e7eb] rounded-t-lg overflow-hidden border-b-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-[#f4f5f8] border-b border-[#e5e7eb]">
                            <tr>
                              <th className="text-left py-3 px-2 font-semibold text-xs text-muted-foreground w-12 border-r border-[#e5e7eb]"></th>
                              <th className="text-left py-3 px-3 font-semibold text-xs text-gray-700 w-12 border-r border-[#e5e7eb]">#</th>
                              <th className="text-left p-3 font-semibold text-xs text-gray-700 min-w-[120px] border-r border-[#e5e7eb]">Service Date</th>
                              <th className="text-left p-3 font-semibold text-xs text-gray-700 min-w-[180px] border-r border-[#e5e7eb]">Product/service</th>
                              <th className="text-left p-3 font-semibold text-xs text-gray-700 min-w-[80px] border-r border-[#e5e7eb]">SKU</th>
                              <th className="text-left p-3 font-semibold text-xs text-gray-700 min-w-[200px] border-r border-[#e5e7eb]">Description</th>
                              <th className="text-right p-3 font-semibold text-xs text-gray-700 min-w-[80px] border-r border-[#e5e7eb]">Qty</th>
                              <th className="text-right p-3 font-semibold text-xs text-gray-700 min-w-[100px] border-r border-[#e5e7eb]">Rate</th>
                              <th className="text-right p-3 font-semibold text-xs text-gray-700 min-w-[120px] border-r border-[#e5e7eb]">Amount</th>
                              <th className="text-left p-3 font-semibold text-xs text-gray-700 min-w-[120px] border-r border-[#e5e7eb]">Class (hidden)</th>
                              <th className="w-12 bg-[#f4f5f8]"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {estimateData.items.map((item, index) => (
                              <tr key={index} className="border-b border-[#e5e7eb] hover:bg-gray-50 bg-white">
                                <td className="py-2 px-2 text-muted-foreground/30 text-center cursor-move border-r border-[#e5e7eb]">⋮⋮</td>
                                <td className="p-2 border-r border-[#e5e7eb] text-center text-gray-600 font-medium">{index + 1}</td>
                                <td className="p-0 border-r border-[#e5e7eb] hover:bg-gray-100 transition-colors">
                                  <input
                                    type="date"
                                    value={item.serviceDate}
                                    onChange={(e) => handleEstimateItemChange(index, "serviceDate", e.target.value)}
                                    className="w-full h-full p-3 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary text-sm"
                                  />
                                </td>
                                <td className="p-0 border-r border-[#e5e7eb] hover:bg-gray-100 transition-colors">
                                  <input
                                    type="text"
                                    value={item.productService}
                                    onChange={(e) => handleEstimateItemChange(index, "productService", e.target.value)}
                                    className="w-full h-full p-3 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary text-sm font-semibold"
                                  />
                                </td>
                                <td className="p-0 border-r border-[#e5e7eb] hover:bg-gray-100 transition-colors">
                                  <input
                                    type="text"
                                    value={item.sku}
                                    onChange={(e) => handleEstimateItemChange(index, "sku", e.target.value)}
                                    className="w-full h-full p-3 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary text-sm"
                                  />
                                </td>
                                <td className="p-0 border-r border-[#e5e7eb] hover:bg-gray-100 transition-colors">
                                  <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) => handleEstimateItemChange(index, "description", e.target.value)}
                                    className="w-full h-full p-3 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary text-sm"
                                  />
                                </td>
                                <td className="p-0 border-r border-[#e5e7eb] hover:bg-gray-100 transition-colors">
                                  <input
                                    type="number"
                                    value={item.qty === 0 ? "" : item.qty}
                                    onChange={(e) => handleEstimateItemChange(index, "qty", parseFloat(e.target.value) || 0)}
                                    className="w-full h-full p-3 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary text-sm text-right"
                                  />
                                </td>
                                <td className="p-0 border-r border-[#e5e7eb] hover:bg-gray-100 transition-colors">
                                  <input
                                    type="number"
                                    value={item.rate === 0 ? "" : item.rate}
                                    onChange={(e) => handleEstimateItemChange(index, "rate", parseFloat(e.target.value) || 0)}
                                    className="w-full h-full p-3 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary text-sm text-right"
                                  />
                                </td>
                                <td className="p-3 border-r border-[#e5e7eb] text-right font-semibold bg-[#f9fafb]">
                                  {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-0 border-r border-[#e5e7eb] hover:bg-gray-100 transition-colors">
                                  <input
                                    type="text"
                                    value={item.class}
                                    onChange={(e) => handleEstimateItemChange(index, "class", e.target.value)}
                                    className="w-full h-full p-3 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary text-sm"
                                  />
                                </td>
                                <td className="p-2 text-center bg-white border-l border-white shadow-[-5px_0px_5px_-5px_transparent]">
                                  <Button variant="ghost" size="icon" onClick={() => handleRemoveEstimateItem(index)} className="h-8 w-8 hover:bg-gray-200">
                                    <Trash2Icon className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex gap-2 p-3 pb-8 border border-t-0 border-[#e5e7eb] rounded-b-lg bg-white">
                      <div className="flex">
                        <Button variant="outline" size="sm" onClick={handleAddEstimateItem} className="h-8 text-xs font-semibold px-4 border-gray-300 rounded-r-none bg-gray-50 hover:bg-gray-100 text-gray-800">
                          Add product or service
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-gray-300 rounded-l-none border-l-0 bg-gray-50 hover:bg-gray-100 text-gray-800">
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEstimateData({ ...estimateData, items: [{ serviceDate: "", productService: "", sku: "", description: "", qty: 1, rate: 0, amount: 0, class: "" }] })}
                        className="h-8 text-xs font-semibold px-4 text-gray-800 bg-gray-100 hover:bg-gray-200"
                      >
                        Clear all lines
                      </Button>
                    </div>
                  </div>

                  {/* Bottom Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-8 pt-4">
                    {/* Messaging & Attachments */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-gray-800">Note to customer</Label>
                        <Textarea
                          className="min-h-[80px] border-gray-300 resize-none text-sm"
                          value={estimateData.note_to_customer}
                          onChange={(e) => setEstimateData({ ...estimateData, note_to_customer: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-gray-800">Memo on statement (hidden)</Label>
                        <Textarea
                          className="min-h-[80px] border-gray-300 resize-none text-sm"
                          value={estimateData.memo_on_statement}
                          onChange={(e) => setEstimateData({ ...estimateData, memo_on_statement: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-gray-800">Attachments</Label>
                        <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center bg-white cursor-pointer hover:bg-gray-50">
                          <span className="text-blue-600 hover:underline font-medium text-sm">Add attachment</span>
                          <div className="mt-1">
                            <span className="text-xs text-muted-foreground">Max file size: 20 MB</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Totals Calculation */}
                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-4">
                      {estimateData.show_discount && (
                        <>
                          <div className="flex items-center gap-4 text-sm font-medium text-gray-700 whitespace-nowrap">
                            Discount
                            <Input
                              type="number"
                              className="w-16 h-8 text-right border-gray-300 inline-block"
                              value={estimateData.discount_percent}
                              onChange={(e) => setEstimateData({ ...estimateData, discount_percent: parseFloat(e.target.value) || 0 })}
                            />
                            <div className="inline-flex rounded-full border border-gray-300 overflow-hidden text-xs bg-gray-100 ml-2">
                              <button className="px-3 py-1 bg-white border-r border-gray-300 font-semibold text-gray-800 shadow-sm">%</button>
                              <button className="px-3 py-1 font-semibold text-gray-500 hover:bg-gray-200">$</button>
                            </div>
                          </div>
                          <div className="text-right font-medium text-gray-800 flex items-center justify-end">
                            PHP{(calculateEstimateSubtotal() * (estimateData.discount_percent / 100)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </>
                      )}

                      <div className="col-span-2 pt-2 pb-2"></div>

                      <div className="text-lg font-bold text-gray-900">
                        Estimate total
                      </div>
                      <div className="text-right text-lg font-bold text-gray-900">
                        PHP{calculateEstimateTotal().toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>

                      <div className="col-span-2 text-right pt-2">
                        <span className="text-blue-600 font-medium text-sm hover:underline cursor-pointer">Edit totals</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Right Sidebar - Settings */}
            <div className="w-80 bg-[#f4f5f8] shrink-0 border-l border-gray-200 overflow-y-auto flex flex-col pt-6 px-4">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Estimate {estimateData.estimate_no}</h3>
                  <span className="text-blue-600 text-sm font-medium hover:underline cursor-pointer">Edit default settings</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowEstimateDialog(false)} className="h-6 w-6 rounded-none text-gray-500 hover:bg-gray-200">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mb-6">
                <Select value={estimateData.status} onValueChange={(val) => setEstimateData({ ...estimateData, status: val })}>
                  <SelectTrigger className="w-32 bg-white border-gray-300 h-8 rounded-full text-xs font-semibold px-4 shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Accepted">Accepted</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Accordion type="single" collapsible className="w-full space-y-4">
                <AccordionItem value="customisation" className="border border-gray-200 bg-white rounded-lg px-4 shadow-sm">
                  <AccordionTrigger className="hover:no-underline font-semibold text-gray-800 py-4 text-sm">Customisation</AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-600 pb-4">
                    Manage template customisations here.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="discounts" className="border border-gray-200 bg-white rounded-lg px-4 shadow-sm" defaultValue="discounts">
                  <AccordionTrigger className="hover:no-underline font-semibold text-gray-800 py-4 text-sm text-left leading-tight">Discounts and Fees</AccordionTrigger>
                  <AccordionContent className="pb-4 pt-2">
                    <div className="space-y-4">
                      <div className="font-semibold text-gray-800 text-sm mb-2">More options</div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-700">Discount</Label>
                        <Checkbox
                          checked={estimateData.show_discount}
                          onCheckedChange={(c) => setEstimateData({ ...estimateData, show_discount: c === true })}
                          className="h-5 w-10 md:w-10 rounded-full data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300 transition-colors border-none shadow-inner"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-700">Shipping fee</Label>
                        <Checkbox
                          checked={estimateData.show_shipping}
                          onCheckedChange={(c) => setEstimateData({ ...estimateData, show_shipping: c === true })}
                          className="h-5 w-10 md:w-10 rounded-full data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300 transition-colors border-none shadow-inner"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="design" className="border border-gray-200 bg-white rounded-lg px-4 shadow-sm">
                  <AccordionTrigger className="hover:no-underline font-semibold text-gray-800 py-4 text-sm">Design</AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-600 pb-4">
                    Edit colours, fonts, and layout.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="scheduling" className="border border-gray-200 bg-white rounded-lg px-4 shadow-sm">
                  <AccordionTrigger className="hover:no-underline font-semibold text-gray-800 py-4 text-sm">Scheduling</AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-600 pb-4">
                    Set up recurring schedules here.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-white border-t border-gray-200 shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] rounded-b-xl z-20">
            <div className="flex items-center justify-between mx-auto px-4">
              <div className="flex items-center gap-6">
                <Button variant="ghost" className="font-semibold text-gray-700 hover:bg-gray-100" onClick={() => setShowEstimateDialog(false)}>
                  Cancel
                </Button>
                <Button variant="ghost" className="font-semibold text-green-700 hover:text-green-800 hover:bg-green-50" onClick={() => {
                  setEstimateData({
                    email: "", status: "Pending", billing_address: "", estimate_no: generateEstimateNumber(),
                    estimate_date: new Date().toISOString().split('T')[0], expiration_date: "", accepted_by: "", accepted_date: "",
                    location: "Head Office - Puerto Princesa City", tags: "", items: [{ serviceDate: "", productService: "", sku: "", description: "", qty: 1, rate: 0, amount: 0, class: "" }],
                    note_to_customer: "Thank you for your business.", memo_on_statement: "This memo will not show up on your estimate, but will appear on the statement.",
                    discount_percent: 0, shipping_fee: 0, show_discount: true, show_shipping: false
                  });
                }}>
                  Clear
                </Button>
              </div>

              <div className="flex items-center justify-center absolute left-1/2 transform -translate-x-1/2">
                <span className="font-bold text-green-700 hover:text-green-800 hover:underline cursor-pointer">Print or download</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex group">
                  <Button variant="outline" className="font-bold text-green-700 border border-green-700 hover:bg-green-50 rounded-l-full rounded-r-none px-6 shadow-sm">
                    Save
                  </Button>
                  <Button variant="outline" className="text-green-700 border border-green-700 border-l-0 rounded-r-full rounded-l-none px-2 shadow-sm hover:bg-green-50">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex group ml-2">
                  <Button className="bg-[#107c3e] hover:bg-[#0c5d2e] text-white font-bold rounded-l-full rounded-r-none px-6 shadow-sm border-r border-green-800/30">
                    Review and send
                  </Button>
                  <Button className="bg-[#107c3e] hover:bg-[#0c5d2e] text-white rounded-r-full rounded-l-none px-2 shadow-sm">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

        </DialogContent>
      </Dialog>

      {/* Delayed Charge Creation Dialog — full-screen QuickBooks style, no right sidebar */}
      <Dialog open={showDelayedChargeDialog} onOpenChange={setShowDelayedChargeDialog}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100vw-2rem)] max-w-[1100px] h-[90vh] p-0 overflow-hidden flex flex-col bg-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 bg-white shrink-0 border-b border-gray-200">
            <DialogTitle className="text-2xl font-semibold flex items-center gap-2 text-gray-800">
              <span className="text-muted-foreground mr-1">🕒</span>
              Delayed Charge # {delayedChargeData.charge_no}
            </DialogTitle>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="text-muted-foreground hidden lg:flex">
                <MessageSquare className="h-4 w-4 mr-2" /> Feedback
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowDelayedChargeDialog(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto p-8">
            <div className="max-w-[1000px] mx-auto space-y-8">

              {/* Top Section — Customer & Amount */}
              <div className="flex justify-between items-start">
                <div className="space-y-6 flex-1 max-w-[600px]">
                  {/* Customer */}
                  <div className="space-y-1.5">
                    <Label className="text-sm text-gray-600 font-normal">Customer</Label>
                    <Select
                      value={selectedCustomerForCharge}
                      onValueChange={(val) => setSelectedCustomerForCharge(val)}
                    >
                      <SelectTrigger className="w-56 border-gray-300">
                        <SelectValue placeholder="Choose a customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Delayed Charge Date */}
                  <div className="space-y-1.5">
                    <Label className="text-sm text-gray-600 font-normal">Delayed Charge Date</Label>
                    <Input
                      type="date"
                      value={delayedChargeData.charge_date}
                      onChange={(e) => setDelayedChargeData({ ...delayedChargeData, charge_date: e.target.value })}
                      className="border-gray-300 w-44"
                    />
                  </div>

                  {/* Delayed Charge no. */}
                  <div className="space-y-1.5">
                    <Label className="text-sm text-gray-600 font-normal">Delayed Charge no.</Label>
                    <Input
                      value={delayedChargeData.charge_no}
                      onChange={(e) => setDelayedChargeData({ ...delayedChargeData, charge_no: e.target.value })}
                      className="border-gray-300 w-28"
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-1.5">
                    <Label className="text-sm text-gray-600 font-normal">Location</Label>
                    <Select
                      value={delayedChargeData.location}
                      onValueChange={(val) => setDelayedChargeData({ ...delayedChargeData, location: val })}
                    >
                      <SelectTrigger className="w-56 border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Head Office - Puerto Princesa City">Head Office - Puerto Princesa City</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tags */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-4">
                      <Label className="text-sm text-gray-600 font-normal">Tags (2)</Label>
                      <span className="text-sm text-blue-600 cursor-pointer font-medium hover:underline">Manage tags</span>
                    </div>
                    <Input
                      placeholder="Start typing to add a tag"
                      value={delayedChargeData.tags}
                      onChange={(e) => setDelayedChargeData({ ...delayedChargeData, tags: e.target.value })}
                      className="border-gray-300 w-full max-w-md"
                    />
                  </div>
                </div>

                {/* Amount Display */}
                <div className="text-right pt-6">
                  <span className="text-xs uppercase tracking-widest text-gray-500 font-semibold">AMOUNT</span>
                  <div className="text-4xl font-bold text-gray-900 mt-1">
                    PHP{calculateDelayedChargeTotal().toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Amounts are selector */}
              <div className="flex justify-end items-center gap-3 pt-2">
                <span className="text-sm text-gray-600">Amounts are</span>
                <Select defaultValue="Out of Scope of Tax">
                  <SelectTrigger className="w-52 border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Out of Scope of Tax">Out of Scope of Tax</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Items Table */}
              <div>
                <div className="border border-[#e5e7eb] rounded-t-lg overflow-hidden border-b-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-white border-b border-[#e5e7eb]">
                        <tr>
                          <th className="text-left py-3 px-2 font-semibold text-xs text-muted-foreground w-10"></th>
                          <th className="text-left py-3 px-3 font-bold text-xs text-gray-800 uppercase tracking-wider w-10 border-r border-dotted border-gray-300">#</th>
                          <th className="text-left p-3 font-bold text-xs text-gray-800 uppercase tracking-wider min-w-[120px] border-r border-dotted border-gray-300">SERVICE DATE</th>
                          <th className="text-left p-3 font-bold text-xs text-gray-800 uppercase tracking-wider min-w-[180px] border-r border-dotted border-gray-300">PRODUCT/SERVICE</th>
                          <th className="text-left p-3 font-bold text-xs text-gray-800 uppercase tracking-wider min-w-[80px] border-r border-dotted border-gray-300">SKU</th>
                          <th className="text-left p-3 font-bold text-xs text-gray-800 uppercase tracking-wider min-w-[200px] border-r border-dotted border-gray-300">DESCRIPTION</th>
                          <th className="text-right p-3 font-bold text-xs text-gray-800 uppercase tracking-wider min-w-[80px] border-r border-dotted border-gray-300">QTY</th>
                          <th className="text-right p-3 font-bold text-xs text-gray-800 uppercase tracking-wider min-w-[100px] border-r border-dotted border-gray-300">RATE</th>
                          <th className="text-right p-3 font-bold text-xs text-gray-800 uppercase tracking-wider min-w-[100px] border-r border-dotted border-gray-300">AMOUNT</th>
                          <th className="text-left p-3 font-bold text-xs text-gray-800 uppercase tracking-wider min-w-[100px]">CLASS</th>
                          <th className="w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {delayedChargeData.items.map((item, index) => (
                          <tr key={index} className="border-b border-[#e5e7eb] hover:bg-gray-50 bg-white">
                            <td className="py-2 px-2 text-muted-foreground/30 text-center cursor-move">⋮⋮</td>
                            <td className="p-2 border-r border-dotted border-gray-300 text-center text-gray-600 font-medium">{index + 1}</td>
                            <td className="p-0 border-r border-dotted border-gray-300 hover:bg-gray-100 transition-colors">
                              <input
                                type="date"
                                value={item.serviceDate}
                                onChange={(e) => handleDelayedChargeItemChange(index, "serviceDate", e.target.value)}
                                className="w-full h-full p-3 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary text-sm"
                              />
                            </td>
                            <td className="p-0 border-r border-dotted border-gray-300 hover:bg-gray-100 transition-colors">
                              <input
                                type="text"
                                value={item.productService}
                                onChange={(e) => handleDelayedChargeItemChange(index, "productService", e.target.value)}
                                className="w-full h-full p-3 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary text-sm"
                              />
                            </td>
                            <td className="p-0 border-r border-dotted border-gray-300 hover:bg-gray-100 transition-colors">
                              <input
                                type="text"
                                value={item.sku}
                                onChange={(e) => handleDelayedChargeItemChange(index, "sku", e.target.value)}
                                className="w-full h-full p-3 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary text-sm"
                              />
                            </td>
                            <td className="p-0 border-r border-dotted border-gray-300 hover:bg-gray-100 transition-colors">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => handleDelayedChargeItemChange(index, "description", e.target.value)}
                                className="w-full h-full p-3 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary text-sm"
                              />
                            </td>
                            <td className="p-0 border-r border-dotted border-gray-300 hover:bg-gray-100 transition-colors">
                              <input
                                type="number"
                                value={item.qty === 0 ? "" : item.qty}
                                onChange={(e) => handleDelayedChargeItemChange(index, "qty", parseFloat(e.target.value) || 0)}
                                className="w-full h-full p-3 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary text-sm text-right"
                              />
                            </td>
                            <td className="p-0 border-r border-dotted border-gray-300 hover:bg-gray-100 transition-colors">
                              <input
                                type="number"
                                value={item.rate === 0 ? "" : item.rate}
                                onChange={(e) => handleDelayedChargeItemChange(index, "rate", parseFloat(e.target.value) || 0)}
                                className="w-full h-full p-3 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary text-sm text-right"
                              />
                            </td>
                            <td className="p-3 border-r border-dotted border-gray-300 text-right font-semibold">
                              {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-0 hover:bg-gray-100 transition-colors">
                              <input
                                type="text"
                                value={item.class}
                                onChange={(e) => handleDelayedChargeItemChange(index, "class", e.target.value)}
                                className="w-full h-full p-3 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary text-sm"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveDelayedChargeItem(index)} className="h-8 w-8 hover:bg-gray-200">
                                <Trash2Icon className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-2 p-3 border border-t-0 border-[#e5e7eb] rounded-b-lg bg-white">
                  <Button variant="outline" size="sm" onClick={handleAddDelayedChargeItem} className="h-8 text-xs font-semibold px-4 border-gray-300 bg-white hover:bg-gray-100 text-gray-800">
                    Add lines
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDelayedChargeData({ ...delayedChargeData, items: [{ serviceDate: "", productService: "", sku: "", description: "", qty: 1, rate: 0, amount: 0, class: "" }] })}
                    className="h-8 text-xs font-semibold px-4 border-gray-300 bg-white hover:bg-gray-100 text-gray-800"
                  >
                    Clear all lines
                  </Button>
                </div>
              </div>

              {/* Bottom Section: Memo, Total, Attachments */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-8 pt-4">
                <div className="space-y-6">
                  {/* Memo */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Memo</Label>
                    <Textarea
                      className="min-h-[100px] border-gray-300 resize-none text-sm"
                      value={delayedChargeData.memo}
                      onChange={(e) => setDelayedChargeData({ ...delayedChargeData, memo: e.target.value })}
                    />
                  </div>

                  {/* Attachments */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-800">Attachments</Label>
                    <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center bg-white cursor-pointer hover:bg-gray-50">
                      <span className="text-blue-600 hover:underline font-medium text-sm">Add attachment</span>
                      <div className="mt-1">
                        <span className="text-xs text-muted-foreground">Max file size: 20 MB</span>
                      </div>
                      <div className="mt-2">
                        <span className="text-blue-600 hover:underline font-medium text-sm">Show existing</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-end items-start">
                  <div className="flex items-center gap-12">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-lg font-bold text-gray-900">
                      PHP{calculateDelayedChargeTotal().toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Privacy link */}
              <div className="text-center pt-4">
                <span className="text-blue-600 hover:underline font-medium text-sm cursor-pointer">Privacy</span>
              </div>

            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-white border-t border-gray-200 shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-20">
            <div className="flex items-center justify-between mx-auto px-4">
              <div className="flex items-center gap-6">
                <span className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer" onClick={() => setShowDelayedChargeDialog(false)}>
                  Cancel
                </span>
                <span className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer" onClick={() => {
                  setDelayedChargeData({
                    charge_date: new Date().toISOString().split('T')[0], charge_no: generateChargeNumber(),
                    location: "Head Office - Puerto Princesa City", tags: "",
                    items: [{ serviceDate: "", productService: "", sku: "", description: "", qty: 1, rate: 0, amount: 0, class: "" },
                    { serviceDate: "", productService: "", sku: "", description: "", qty: 1, rate: 0, amount: 0, class: "" }],
                    memo: "",
                  });
                }}>
                  Clear
                </span>
              </div>

              <div className="flex items-center justify-center">
                <span className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">Make recurring</span>
              </div>

              <div className="flex items-center gap-0">
                <div className="flex group">
                  <Button className="bg-[#107c3e] hover:bg-[#0c5d2e] text-white font-bold rounded-l-md rounded-r-none px-6 shadow-sm border-r border-green-800/30">
                    Save and new
                  </Button>
                  <Button className="bg-[#107c3e] hover:bg-[#0c5d2e] text-white rounded-r-md rounded-l-none px-2 shadow-sm">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

        </DialogContent>
      </Dialog>

      {/* Time Activity (Single day entry) Dialog */}
      <Dialog open={showTimeActivityDialog} onOpenChange={setShowTimeActivityDialog}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100vw-2rem)] max-w-[1100px] h-[90vh] p-0 overflow-hidden flex flex-col bg-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 bg-white shrink-0 border-b border-gray-200">
            <DialogTitle className="text-2xl font-semibold flex items-center gap-2 text-gray-800">
              <span className="text-muted-foreground mr-1">🕒</span>
              Single day entry
            </DialogTitle>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="text-muted-foreground hidden lg:flex">
                <File className="h-4 w-4 mr-2" /> See what&apos;s new
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hidden lg:flex">
                <MessageSquare className="h-4 w-4 mr-2" /> Give feedback
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowTimeActivityDialog(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Main Content — Two Column Layout */}
          <div className="flex-1 overflow-auto p-8">
            <div className="max-w-[1000px] mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8">

                {/* Left Column */}
                <div className="space-y-6">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <Label className="text-sm text-gray-600 font-normal">Name</Label>
                    <Select
                      value={timeActivityData.name}
                      onValueChange={(val) => setTimeActivityData({ ...timeActivityData, name: val })}
                    >
                      <SelectTrigger className="w-full border-gray-300">
                        <SelectValue placeholder="Select name" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee-1">Employee 1</SelectItem>
                        <SelectItem value="employee-2">Employee 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Customers */}
                  <div className="space-y-1.5">
                    <Label className="text-sm text-gray-600 font-normal">Customers</Label>
                    <Select
                      value={selectedCustomerForTimeActivity}
                      onValueChange={(val) => setSelectedCustomerForTimeActivity(val)}
                    >
                      <SelectTrigger className="w-full border-gray-300">
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Billable */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={timeActivityData.billable}
                      onCheckedChange={(c) => setTimeActivityData({ ...timeActivityData, billable: c === true })}
                      className="h-5 w-5 rounded border-gray-400"
                    />
                    <Label className="text-sm text-gray-700 font-normal flex items-center gap-1">
                      Billable (per hour)
                      <span className="text-muted-foreground cursor-help">ⓘ</span>
                    </Label>
                  </div>

                  {/* Class */}
                  <div className="space-y-1.5">
                    <Label className="text-sm text-gray-600 font-normal">Class</Label>
                    <Select
                      value={timeActivityData.class}
                      onValueChange={(val) => setTimeActivityData({ ...timeActivityData, class: val })}
                    >
                      <SelectTrigger className="w-full border-gray-300">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="class-1">Class 1</SelectItem>
                        <SelectItem value="class-2">Class 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Location */}
                  <div className="space-y-1.5">
                    <Label className="text-sm text-gray-600 font-normal">Location</Label>
                    <Select
                      value={timeActivityData.location}
                      onValueChange={(val) => setTimeActivityData({ ...timeActivityData, location: val })}
                    >
                      <SelectTrigger className="w-full border-gray-300">
                        <SelectValue placeholder="Select Location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Head Office - Puerto Princesa City">Head Office - Puerto Princesa City</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Set start and end time toggle */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={timeActivityData.set_start_end_time}
                      onCheckedChange={(c) => setTimeActivityData({ ...timeActivityData, set_start_end_time: c === true })}
                      className="h-5 w-10 rounded-full data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300 transition-colors border-none shadow-inner"
                    />
                    <Label className="text-sm text-gray-700 font-medium">Set start and end time</Label>
                  </div>

                  {/* Date & Duration / Start-End Time */}
                  {!timeActivityData.set_start_end_time ? (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <Label className="text-sm text-gray-600 font-normal">Start date</Label>
                        <Input
                          type="date"
                          value={timeActivityData.start_date}
                          onChange={(e) => setTimeActivityData({ ...timeActivityData, start_date: e.target.value })}
                          className="border-gray-300"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm text-gray-600 font-normal">Duration (hh:mm)</Label>
                        <Input
                          placeholder="hh:mm"
                          value={timeActivityData.duration}
                          onChange={(e) => setTimeActivityData({ ...timeActivityData, duration: e.target.value })}
                          className="border-gray-300"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm text-gray-600 font-normal">Start date</Label>
                        <Input
                          type="date"
                          value={timeActivityData.start_date}
                          onChange={(e) => setTimeActivityData({ ...timeActivityData, start_date: e.target.value })}
                          className="border-gray-300"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm text-gray-600 font-normal">Start time</Label>
                        <Input
                          type="time"
                          value={timeActivityData.start_time}
                          onChange={(e) => setTimeActivityData({ ...timeActivityData, start_time: e.target.value })}
                          className="border-gray-300"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm text-gray-600 font-normal">End time</Label>
                        <Input
                          type="time"
                          value={timeActivityData.end_time}
                          onChange={(e) => setTimeActivityData({ ...timeActivityData, end_time: e.target.value })}
                          className="border-gray-300"
                        />
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label className="text-sm text-gray-600 font-normal">Notes</Label>
                    <Textarea
                      className="min-h-[200px] border-gray-300 resize-none text-sm"
                      value={timeActivityData.notes}
                      onChange={(e) => setTimeActivityData({ ...timeActivityData, notes: e.target.value })}
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-white border-t border-gray-200 shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-20">
            <div className="flex items-center justify-between mx-auto px-4">
              <span
                className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                onClick={() => setShowTimeActivityDialog(false)}
              >
                Cancel
              </span>

              <div className="flex items-center gap-3">
                <Button variant="outline" className="font-bold text-green-700 border border-green-700 hover:bg-green-50 rounded-md px-6 shadow-sm">
                  Save
                </Button>
                <div className="flex group">
                  <Button className="bg-[#107c3e] hover:bg-[#0c5d2e] text-white font-bold rounded-l-md rounded-r-none px-6 shadow-sm border-r border-green-800/30">
                    Save and new
                  </Button>
                  <Button className="bg-[#107c3e] hover:bg-[#0c5d2e] text-white rounded-r-md rounded-l-none px-2 shadow-sm">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

        </DialogContent>
      </Dialog>

      {/* Create Statement Dialog */}
      <Dialog open={showStatementDialog} onOpenChange={setShowStatementDialog}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100vw-2rem)] max-w-[1100px] h-[90vh] p-0 overflow-hidden flex flex-col bg-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 bg-white shrink-0 border-b border-gray-200">
            <DialogTitle className="text-2xl font-semibold flex items-center gap-2 text-gray-800">
              Create Statements
            </DialogTitle>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="text-muted-foreground hidden lg:flex">
                <MessageSquare className="h-4 w-4 mr-2" /> Give feedback
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <span className="w-5 h-5 flex items-center justify-center rounded-full border border-gray-400 text-xs font-bold text-gray-500">?</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowStatementDialog(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto p-8">
            <div className="max-w-[1000px] mx-auto space-y-8">

              {/* Top Configuration & Balance */}
              <div className="flex justify-between items-start">
                <div className="flex gap-x-12 gap-y-6 flex-wrap">
                  {/* First column */}
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <Label className="text-sm text-gray-600 font-normal">Statement date</Label>
                      <Input
                        type="date"
                        value={statementData.statement_date}
                        onChange={(e) => setStatementData({ ...statementData, statement_date: e.target.value })}
                        className="border-gray-300 w-56"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-gray-600 font-normal">Start date</Label>
                      <Input
                        type="date"
                        value={statementData.start_date}
                        onChange={(e) => setStatementData({ ...statementData, start_date: e.target.value })}
                        className="border-gray-300 w-56"
                      />
                    </div>
                  </div>

                  {/* Second column */}
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <Label className="text-sm text-gray-600 font-normal">Statement type</Label>
                      <Select
                        value={statementData.statement_type}
                        onValueChange={(val) => setStatementData({ ...statementData, statement_type: val })}
                      >
                        <SelectTrigger className="w-56 border-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Balance Forward">Balance Forward</SelectItem>
                          <SelectItem value="Open Item">Open Item</SelectItem>
                          <SelectItem value="Transaction Statement">Transaction Statement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-gray-600 font-normal">End date</Label>
                      <Input
                        type="date"
                        value={statementData.end_date}
                        onChange={(e) => setStatementData({ ...statementData, end_date: e.target.value })}
                        className="border-gray-300 w-56"
                      />
                    </div>
                  </div>
                </div>

                {/* Total Balance */}
                <div className="text-right pt-2">
                  <span className="text-sm text-gray-500">
                    Total balance from {statementData.recipients.filter(r => r.selected).length} customers
                  </span>
                  <div className="text-4xl font-bold text-gray-900 mt-1">
                    PHP{statementData.recipients
                      .filter(r => r.selected)
                      .reduce((sum, r) => sum + r.balance, 0)
                      .toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Recipients Table */}
              <div className="pt-4 border-t border-gray-200 mt-8">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-green-600">
                      <th className="text-center py-3 px-4 w-12 pb-4">
                        <Checkbox
                          checked={statementData.recipients.length > 0 && statementData.recipients.every(r => r.selected)}
                          onCheckedChange={(c) => {
                            const isChecked = c === true;
                            setStatementData({
                              ...statementData,
                              recipients: statementData.recipients.map(r => ({ ...r, selected: isChecked }))
                            });
                          }}
                          className="h-5 w-5 rounded data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                      </th>
                      <th className="text-left font-bold text-gray-900 pb-4">Recipients</th>
                      <th className="text-left font-bold text-gray-900 pb-4">Email Address</th>
                      <th className="text-left font-bold text-gray-900 pb-4">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statementData.recipients.map((recipient, index) => (
                      <tr key={recipient.id} className="border-b border-[#e5e7eb] hover:bg-gray-50/50">
                        <td className="text-center py-4 px-4">
                          <Checkbox
                            checked={recipient.selected}
                            onCheckedChange={(c) => {
                              const newRecipients = [...statementData.recipients];
                              newRecipients[index].selected = c === true;
                              setStatementData({ ...statementData, recipients: newRecipients });
                            }}
                            className="h-5 w-5 rounded data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 border-gray-300"
                          />
                        </td>
                        <td className="py-4 text-blue-600 font-medium">
                          {recipient.name}
                        </td>
                        <td className="py-4 pr-12">
                          <Input
                            type="email"
                            value={recipient.email}
                            onChange={(e) => {
                              const newRecipients = [...statementData.recipients];
                              newRecipients[index].email = e.target.value;
                              setStatementData({ ...statementData, recipients: newRecipients });
                            }}
                            className="border-gray-300 w-full"
                          />
                        </td>
                        <td className="py-4 font-medium">
                          PHP{recipient.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    {statementData.recipients.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500">
                          No outstanding balances to create statements for in this date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-white border-t border-gray-200 shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-20">
            <div className="flex items-center justify-between mx-auto px-4">
              <span className="font-bold text-green-800 hover:text-green-900 hover:underline cursor-pointer" onClick={() => setShowStatementDialog(false)}>
                Cancel
              </span>

              <div className="flex items-center justify-center">
                <span className="font-bold text-green-800 hover:text-green-900 hover:underline cursor-pointer">Print or Preview</span>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" className="font-bold text-green-700 border border-green-700 hover:bg-green-50 rounded-md px-6 shadow-sm">
                  Save
                </Button>
                <div className="flex group">
                  <Button className="bg-[#107c3e] hover:bg-[#0c5d2e] text-white font-bold rounded-l-md rounded-r-none px-6 shadow-sm border-r border-green-800/30">
                    Save and send
                  </Button>
                  <Button className="bg-[#107c3e] hover:bg-[#0c5d2e] text-white rounded-r-md rounded-l-none px-2 shadow-sm">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

        </DialogContent>
      </Dialog>

      {/* Create Task Side Sheet */}
      <Sheet open={showTaskSheet} onOpenChange={setShowTaskSheet}>
        <SheetContent side="right" className="w-[450px] p-0 flex flex-col bg-slate-50 border-l border-gray-200 shadow-2xl sm:max-w-[450px]">
          {/* Header */}
          <div className="flex items-center justify-between p-5 bg-white shrink-0 border-b border-gray-200">
            <div className="flex items-center justify-center flex-1">
              <SheetTitle className="text-xl font-semibold text-gray-800">Add task</SheetTitle>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto bg-slate-50 p-6 space-y-6">

            {/* Task Name */}
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-600 font-normal">Task name</Label>
              <Input
                value={taskData.name}
                onChange={(e) => setTaskData({ ...taskData, name: e.target.value })}
                className="border-gray-300 bg-white"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-600 font-normal">Description</Label>
              <Textarea
                value={taskData.description}
                onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
                className="min-h-[120px] resize-none border-gray-300 bg-white"
              />
            </div>

            {/* Assign To */}
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-600 font-normal">Assign to</Label>
              <Select
                value={taskData.assign_to}
                onValueChange={(val) => setTaskData({ ...taskData, assign_to: val })}
              >
                <SelectTrigger className="w-full border-gray-300 bg-white">
                  <SelectValue placeholder="Select one" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Select one">Select one</SelectItem>
                  <SelectItem value="john">John Doe</SelectItem>
                  <SelectItem value="jane">Jane Smith</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Due date & Priority */}
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-600 font-normal">Due date</Label>
              <Input
                type="date"
                value={taskData.due_date}
                onChange={(e) => setTaskData({ ...taskData, due_date: e.target.value })}
                className="border-gray-300 w-full bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-gray-600 font-normal">Priority</Label>
              <Select
                value={taskData.priority}
                onValueChange={(val) => setTaskData({ ...taskData, priority: val })}
              >
                <SelectTrigger className="w-full border-gray-300 bg-white">
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">-</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <hr className="border-gray-200" />

            {/* Records Accordion Section */}
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Records</p>
              <div className="bg-gray-100 rounded-md border border-gray-200 overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => setIsTaskRecordsOpen(!isTaskRecordsOpen)}
                >
                  <div className="flex items-center gap-2 text-gray-600 font-medium">
                    <LinkIcon className="h-4 w-4" /> Linked records
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-gray-500 text-white text-xs px-2 py-0.5 rounded-sm font-semibold">1</span>
                    {isTaskRecordsOpen ? <ChevronUp className="h-4 w-4 text-gray-600" /> : <ChevronDown className="h-4 w-4 text-gray-600" />}
                  </div>
                </div>
                {isTaskRecordsOpen && selectedCustomerForTask && (
                  <div className="p-4 bg-gray-50 border-t border-gray-200">
                    <p className="text-sm text-gray-700">Customer</p>
                    <p className="text-sm font-medium text-blue-600 hover:underline cursor-pointer">
                      Customer: {selectedCustomerForTask.name} {selectedCustomerForTask.company_name ? `(${selectedCustomerForTask.company_name})` : ''}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Documents Accordion Section */}
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Documents</p>
              <div className="bg-gray-100 rounded-md border border-gray-200 overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => setIsTaskDocumentsOpen(!isTaskDocumentsOpen)}
                >
                  <div className="flex items-center gap-2 text-gray-600 font-medium">
                    <Paperclip className="h-4 w-4" /> Attached documents
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-gray-500 text-white text-xs px-2 py-0.5 rounded-sm font-semibold">0</span>
                    {isTaskDocumentsOpen ? <ChevronUp className="h-4 w-4 text-gray-600" /> : <ChevronDown className="h-4 w-4 text-gray-600" />}
                  </div>
                </div>
                {isTaskDocumentsOpen && (
                  <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-center">
                    <p className="text-sm text-gray-500">No documents attached.</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-green-700 font-bold text-sm cursor-pointer hover:underline mt-2">
                <Paperclip className="h-4 w-4" /> Add a document
              </div>
            </div>

          </div>

          {/* Footer Action */}
          <div className="p-4 bg-gray-100 border-t border-gray-200 shrink-0 flex justify-end">
            <Button className="bg-[#107c3e] hover:bg-[#0c5d2e] text-white font-bold px-6 shadow-sm rounded-md">
              Save
            </Button>
          </div>

        </SheetContent>
      </Sheet>

      {/* Request Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100vw-2rem)] max-w-[900px] h-[85vh] p-0 overflow-hidden flex flex-col"
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-8 pt-6 pb-0 shrink-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-2xl font-semibold text-foreground">Request Feedback</DialogTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowFeedbackDialog(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs
              value={feedbackData.activeTab}
              onValueChange={(val) => setFeedbackData({ ...feedbackData, activeTab: val as "compose" | "email-preview" })}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="px-8 border-b border-border">
                <TabsList className="bg-transparent p-0 h-auto gap-6">
                  <TabsTrigger
                    value="compose"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 pt-3 text-sm font-medium"
                  >
                    Compose
                  </TabsTrigger>
                  <TabsTrigger
                    value="email-preview"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 pt-3 text-sm font-medium"
                  >
                    Email Preview
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Compose Tab */}
              <TabsContent value="compose" className="flex-1 overflow-auto mt-0">
                <div className="p-8 space-y-8">
                  {/* Review Survey Options */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">Review Survey Options</h3>
                    <p className="text-sm text-muted-foreground mb-4">Start by selecting questions to be included in the feedback request.</p>

                    <div className="border border-border rounded-lg p-6 space-y-5">
                      {/* Ask for a work request */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={feedbackData.askWorkRequest}
                            onCheckedChange={(checked) => setFeedbackData({ ...feedbackData, askWorkRequest: checked })}
                            className="data-[state=checked]:bg-[#107c3e]"
                          />
                          <span className="text-sm text-foreground">Ask for a work request</span>
                        </div>
                        <button className="flex items-center gap-1.5 text-sm text-[#107c3e] hover:underline font-medium">
                          <Eye className="h-4 w-4" /> Preview survey question
                        </button>
                      </div>

                      {/* Ask for review */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={feedbackData.askReview}
                            onCheckedChange={(checked) => setFeedbackData({ ...feedbackData, askReview: checked })}
                            className="data-[state=checked]:bg-[#107c3e]"
                          />
                          <span className="text-sm text-foreground">Ask for review, feedback, or testimonial</span>
                        </div>
                        <button className="flex items-center gap-1.5 text-sm text-[#107c3e] hover:underline font-medium">
                          <Eye className="h-4 w-4" /> Preview survey question
                        </button>
                      </div>

                      {/* Ask for referral */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={feedbackData.askReferral}
                            onCheckedChange={(checked) => setFeedbackData({ ...feedbackData, askReferral: checked })}
                            className="data-[state=checked]:bg-[#107c3e]"
                          />
                          <span className="text-sm text-foreground">Ask for a referral</span>
                        </div>
                        <button className="flex items-center gap-1.5 text-sm text-[#107c3e] hover:underline font-medium">
                          <Eye className="h-4 w-4" /> Preview survey question
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Configure and Edit Email */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">Configure and Edit Email</h3>
                    <p className="text-sm text-muted-foreground">
                      After you make your selection and edit the email, you can preview the email by navigating to Email Preview tab at the top of this page.
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Email Preview Tab */}
              <TabsContent value="email-preview" className="flex-1 overflow-auto mt-0">
                <div className="p-8 space-y-6">
                  {/* Send Method */}
                  <div className="border border-border rounded-lg p-5">
                    <RadioGroup
                      value={feedbackData.sendMethod}
                      onValueChange={(val) => setFeedbackData({ ...feedbackData, sendMethod: val as "petrobook" | "email-client" })}
                      className="space-y-4"
                    >
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value="petrobook" id="send-petrobook" className="mt-0.5 border-[#107c3e] text-[#107c3e]" />
                        <div>
                          <Label htmlFor="send-petrobook" className="text-sm font-semibold cursor-pointer">Send via PetroBook Online</Label>
                          <p className="text-xs text-muted-foreground mt-0.5">Message will be sent from the following e-mail address noreply@petrobook.com.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value="email-client" id="send-email-client" className="mt-0.5" />
                        <div>
                          <Label htmlFor="send-email-client" className="text-sm font-semibold cursor-pointer">Send from your email client</Label>
                          <p className="text-xs text-muted-foreground mt-0.5">Message will be sent from your own email provider. (Currently supports Gmail or Outlook). A new window will open to complete this action.</p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Recipient */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Recipient</Label>
                    <Input
                      value={feedbackData.recipient}
                      onChange={(e) => setFeedbackData({ ...feedbackData, recipient: e.target.value })}
                      className="border-gray-300"
                    />
                  </div>

                  {/* Subject */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Subject</Label>
                    <Input
                      value={feedbackData.subject}
                      onChange={(e) => setFeedbackData({ ...feedbackData, subject: e.target.value })}
                      className="border-gray-300"
                    />
                  </div>

                  {/* Email Body */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Email body</Label>
                    <Textarea
                      value={feedbackData.emailBody}
                      onChange={(e) => setFeedbackData({ ...feedbackData, emailBody: e.target.value })}
                      className="min-h-[200px] border-gray-300 resize-y"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-border shrink-0 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>
                Cancel
              </Button>
              <Button
                className="bg-[#107c3e] hover:bg-[#0c5d2e] text-white font-semibold px-6"
                onClick={() => {
                  console.log('Sending feedback request:', feedbackData);
                  setShowFeedbackDialog(false);
                }}
              >
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}