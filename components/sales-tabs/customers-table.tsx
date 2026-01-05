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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Customer</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <Accordion type="multiple" defaultValue={["name", "address"]} className="w-full">
                  {/* Currency */}
                  <AccordionItem value="currency">
                    <AccordionTrigger className="text-base font-semibold">Currency</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <select id="currency" value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                          className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                          <option value="PHP">PHP - Philippine Peso</option>
                          <option value="USD">USD - United States Dollar</option>
                          <option value="EUR">EUR - Euro</option>
                          <option value="GBP">GBP - British Pound Sterling</option>
                          <option value="JPY">JPY - Japanese Yen</option>
                          <option value="AUD">AUD - Australian Dollar</option>
                          <option value="CAD">CAD - Canadian Dollar</option>
                        </select>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Name and contact */}
                  <AccordionItem value="name">
                    <AccordionTrigger className="text-base font-semibold">Name and contact</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Customer display name *</Label>
                          <Input id="name" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter customer name" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company">Company name</Label>
                          <Input id="company" value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} placeholder="Company name" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone number</Label>
                          <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="0912-345-6789" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="mobile">Mobile number</Label>
                          <Input id="mobile" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} placeholder="0912-345-6789" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fax">Fax</Label>
                          <Input id="fax" value={formData.fax} onChange={(e) => setFormData({ ...formData, fax: e.target.value })} placeholder="Fax number" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input id="website" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://example.com" />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Addresses */}
                  <AccordionItem value="address">
                    <AccordionTrigger className="text-base font-semibold">Addresses</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Billing address</Label>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Street address</Label>
                          <Textarea placeholder="Street address" value={formData.billing_street} onChange={(e) => setFormData({ ...formData, billing_street: e.target.value })} className="min-h-[80px]" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">City</Label>
                            <Input value={formData.billing_city} onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })} placeholder="City" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Province</Label>
                            <Input value={formData.billing_province} onChange={(e) => setFormData({ ...formData, billing_province: e.target.value })} placeholder="Province" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">ZIP code</Label>
                            <Input value={formData.billing_zip_code} onChange={(e) => setFormData({ ...formData, billing_zip_code: e.target.value })} placeholder="ZIP code" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Country</Label>
                            <Input value={formData.billing_country} onChange={(e) => setFormData({ ...formData, billing_country: e.target.value })} placeholder="Country" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3 pt-4">
                        <Label className="text-sm font-semibold">Shipping address</Label>
                        <div className="flex items-center space-x-2 mb-2">
                          <Checkbox id="same" checked={formData.same_as_billing} onCheckedChange={(checked) => setFormData({ ...formData, same_as_billing: checked === true })} />
                          <Label htmlFor="same" className="text-sm font-normal cursor-pointer">Same as billing address</Label>
                        </div>
                        {!formData.same_as_billing && (
                          <>
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Street address</Label>
                              <Textarea placeholder="Street address" value={formData.shipping_street} onChange={(e) => setFormData({ ...formData, shipping_street: e.target.value })} className="min-h-[80px]" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">City</Label>
                                <Input value={formData.shipping_city} onChange={(e) => setFormData({ ...formData, shipping_city: e.target.value })} placeholder="City" />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Province</Label>
                                <Input value={formData.shipping_province} onChange={(e) => setFormData({ ...formData, shipping_province: e.target.value })} placeholder="Province" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">ZIP code</Label>
                                <Input value={formData.shipping_zip_code} onChange={(e) => setFormData({ ...formData, shipping_zip_code: e.target.value })} placeholder="ZIP code" />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Country</Label>
                                <Input value={formData.shipping_country} onChange={(e) => setFormData({ ...formData, shipping_country: e.target.value })} placeholder="Country" />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Payments */}
                  <AccordionItem value="payments">
                    <AccordionTrigger className="text-base font-semibold">Payments</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Primary payment method</Label>
                          <ComboboxInput value={formData.primary_payment_method} onChange={(value) => setFormData({ ...formData, primary_payment_method: value })}
                            options={paymentMethodHistory} placeholder="Select or type payment method" open={paymentMethodOpen} setOpen={setPaymentMethodOpen} />
                        </div>
                        <div className="space-y-2">
                          <Label>Terms</Label>
                          <ComboboxInput value={formData.payment_terms} onChange={(value) => setFormData({ ...formData, payment_terms: value })}
                            options={paymentTermsHistory} placeholder="Select or type terms" open={paymentTermsOpen} setOpen={setPaymentTermsOpen} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Sales form delivery options</Label>
                        <ComboboxInput value={formData.sales_form_delivery_options} onChange={(value) => setFormData({ ...formData, sales_form_delivery_options: value })}
                          options={deliveryOptionsHistory} placeholder="Select or type delivery option" open={deliveryOptionsOpen} setOpen={setDeliveryOptionsOpen} />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Additional info */}
                  <AccordionItem value="additional">
                    <AccordionTrigger className="text-base font-semibold">Additional info</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Taxes</Label>
                        <div className="space-y-2">
                          <Label htmlFor="tax_registration" className="text-xs text-muted-foreground">Sales tax registration</Label>
                          <Input id="tax_registration" value={formData.sales_tax_registration} onChange={(e) => setFormData({ ...formData, sales_tax_registration: e.target.value })} placeholder="Tax registration number" />
                        </div>
                      </div>
                      <div className="space-y-3 pt-4">
                        <Label className="text-sm font-semibold">Opening balance</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="opening_balance" className="text-xs text-muted-foreground">Opening balance</Label>
                            <Input id="opening_balance" type="number" step="0.01" value={formData.opening_balance} onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                setFormData({ ...formData, opening_balance: value });
                              }
                            }} placeholder="0.00" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="opening_balance_date" className="text-xs text-muted-foreground">As of</Label>
                            <Input id="opening_balance_date" type="date" value={formData.opening_balance_date} onChange={(e) => setFormData({ ...formData, opening_balance_date: e.target.value })} />
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Notes and Attachments */}
                  <AccordionItem value="notes">
                    <AccordionTrigger className="text-base font-semibold">Notes and attachments</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="min-h-[100px]" placeholder="Add any additional notes about this customer" />
                      </div>
                      <div className="space-y-2">
                        <Label>Attachments</Label>
                        <div className="border-2 border-dashed rounded-lg p-6 text-center border-border">
                          <input type="file" id="file-upload" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                            <Upload className="h-8 w-8 text-primary mb-2" />
                            <span className="text-primary hover:underline">{uploading ? "Uploading..." : "Add attachment"}</span>
                            <span className="text-xs text-muted-foreground mt-1">Max file size: 20 MB</span>
                          </label>
                        </div>
                        {attachments.length > 0 && (
                          <div className="space-y-2 mt-3">
                            {attachments.map((att, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-card rounded border border-border">
                                <div className="flex items-center gap-2">
                                  <File className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{att.filename}</span>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => removeAttachment(index)} className="h-6 w-6 p-0">
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="button" onClick={handleSubmit} disabled={loading || !formData.name.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {loading ? "Saving..." : "Save"}
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
    </div>
  );
}