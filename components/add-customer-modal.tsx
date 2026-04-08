//components\add-customer-modal.tsx

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";


import { Upload, X, File } from "lucide-react";
import ComboboxInput from "./customers/combobox-inputs";

// ────────────────────────────────────────────────
// Reusable Add Customer Modal Component
// ────────────────────────────────────────────────

export default function AddCustomerModal({
  open,
  onOpenChange,
  onCustomerCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated?: (customer: any) => void;
}) {
  const supabase = createClient();

  // You original histories
  const [paymentMethodHistory] = useState([
    "Cash",
    "Check",
    "Bank Transfer",
    "Credit Card",
  ]);
  const [paymentTermsHistory] = useState([
    "Net 15",
    "Net 30",
    "Net 60",
    "Due on receipt",
  ]);
  const [deliveryOptionsHistory] = useState([
    "Email",
    "Mail",
    "Pick up",
  ]);

  // Dropdown state
  const [paymentMethodOpen, setPaymentMethodOpen] = useState(false);
  const [paymentTermsOpen, setPaymentTermsOpen] = useState(false);
  const [deliveryOptionsOpen, setDeliveryOptionsOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  // Attachments
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // Full form state from your component
  const initialForm = {
    name: "",
    email: "",
    phone: "",
    company_name: "",
    mobile: "",
    fax: "",
    website: "",

    currency: "PHP",
    primary_payment_method: "",
    payment_terms: "",
    sales_form_delivery_options: "",
    sales_tax_registration: "",

    opening_balance: "0",
    opening_balance_date: new Date().toISOString().split("T")[0],

    billing_street: "",
    billing_city: "",
    billing_province: "",
    billing_zip_code: "",
    billing_country: "Philippines",

    shipping_street: "",
    shipping_city: "",
    shipping_province: "",
    shipping_zip_code: "",
    shipping_country: "Philippines",
    same_as_billing: true,

    notes: "",
  };

  const [formData, setFormData] = useState(initialForm);

  const resetForm = () => {
    setFormData(initialForm);
    setAttachments([]);
  };

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  // ───────────────────────────────────────────────────────────
  // Attachment Handlers
  // ───────────────────────────────────────────────────────────

  const handleFileUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert("Max 20MB file.");
      return;
    }

    setUploading(true);

    setTimeout(() => {
      setAttachments((prev) => [
        ...prev,
        {
          filename: file.name,
          file_url: URL.createObjectURL(file),
          file_size: file.size,
          file_type: file.type,
        },
      ]);
      setUploading(false);
    }, 1000);
  };

  const removeAttachment = (i: number) => {
    setAttachments((prev) => prev.filter((_, index) => index !== i));
  };



const handleSubmit = async () => {
  if (!formData.name.trim()) return;

  setLoading(true);

  // Destructure to separate same_as_billing from the rest
  const { same_as_billing, ...restFormData } = formData;

  const { data, error } = await supabase
    .from("customers")
    .insert([
      {
        ...restFormData,
        opening_balance: parseFloat(formData.opening_balance) || 0,
        shipping_same_as_billing: same_as_billing, // Map to correct column name
      },
    ])
    .select()
    .single();

  if (error) {
    console.error(error);
    setLoading(false);
    return;
  }

  // Insert attachments
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

  setLoading(false);

  // Call callback for Invoice page or Customer Table
  onCustomerCreated?.(data);

  // Close modal
  onOpenChange(false);
};

  // ───────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customer</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Accordion type="multiple" defaultValue={["name", "address"]}>
            {/* CURRENCY */}
            <AccordionItem value="currency">
              <AccordionTrigger className="text-base font-semibold">
                Currency
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <select
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({ ...formData, currency: e.target.value })
                    }
                    className="w-full h-10 px-3 border rounded-md"
                  >
                    <option value="PHP">PHP - Philippine Peso</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="JPY">JPY - Yen</option>
                  </select>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* NAME & CONTACT */}
            <AccordionItem value="name">
              <AccordionTrigger className="text-base font-semibold">
                Name and Contact
              </AccordionTrigger>

              <AccordionContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Customer Display Name *</Label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label>Company Name</Label>
                    <Input
                      value={formData.company_name}
                      onChange={(e) =>
                        setFormData({ ...formData, company_name: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Mobile</Label>
                    <Input
                      value={formData.mobile}
                      onChange={(e) =>
                        setFormData({ ...formData, mobile: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label>Fax</Label>
                    <Input
                      value={formData.fax}
                      onChange={(e) =>
                        setFormData({ ...formData, fax: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Website</Label>
                  <Input
                    value={formData.website}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ADDRESSES */}
            <AccordionItem value="address">
              <AccordionTrigger className="text-base font-semibold">
                Addresses
              </AccordionTrigger>

              <AccordionContent className="pt-4 space-y-6">
                {/* BILLING */}
                <div className="space-y-3">
                  <Label className="font-semibold">Billing Address</Label>

                  <Label className="text-xs">Street</Label>
                  <Textarea
                    value={formData.billing_street}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billing_street: e.target.value,
                      })
                    }
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">City</Label>
                      <Input
                        value={formData.billing_city}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            billing_city: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Province</Label>
                      <Input
                        value={formData.billing_province}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            billing_province: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">ZIP Code</Label>
                      <Input
                        value={formData.billing_zip_code}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            billing_zip_code: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Country</Label>
                      <Input
                        value={formData.billing_country}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            billing_country: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* SHIPPING */}
                <div className="space-y-3">
                  <Label className="font-semibold">Shipping Address</Label>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.same_as_billing}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          same_as_billing: checked === true,
                        })
                      }
                    />
                    <Label className="cursor-pointer">
                      Same as billing address
                    </Label>
                  </div>

                  {!formData.same_as_billing && (
                    <>
                      <Label className="text-xs">Street</Label>
                      <Textarea
                        value={formData.shipping_street}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            shipping_street: e.target.value,
                          })
                        }
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">City</Label>
                          <Input
                            value={formData.shipping_city}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                shipping_city: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Province</Label>
                          <Input
                            value={formData.shipping_province}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                shipping_province: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">ZIP Code</Label>
                          <Input
                            value={formData.shipping_zip_code}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                shipping_zip_code: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Country</Label>
                          <Input
                            value={formData.shipping_country}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                shipping_country: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* PAYMENTS */}
            <AccordionItem value="payments">
              <AccordionTrigger className="text-base font-semibold">
                Payments
              </AccordionTrigger>

              <AccordionContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Payment Method</Label>
                    <ComboboxInput
                      value={formData.primary_payment_method}
                      onChange={(val) =>
                        setFormData({
                          ...formData,
                          primary_payment_method: val,
                        })
                      }
                      options={paymentMethodHistory}
                      placeholder="Select or type"
                      open={paymentMethodOpen}
                      setOpen={setPaymentMethodOpen}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Terms</Label>
                    <ComboboxInput
                      value={formData.payment_terms}
                      onChange={(val) =>
                        setFormData({ ...formData, payment_terms: val })
                      }
                      options={paymentTermsHistory}
                      placeholder="Select or type"
                      open={paymentTermsOpen}
                      setOpen={setPaymentTermsOpen}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Delivery Options</Label>
                  <ComboboxInput
                    value={formData.sales_form_delivery_options}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        sales_form_delivery_options: val,
                      })
                    }
                    options={deliveryOptionsHistory}
                    placeholder="Select or type"
                    open={deliveryOptionsOpen}
                    setOpen={setDeliveryOptionsOpen}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ADDITIONAL INFO */}
            <AccordionItem value="additional">
              <AccordionTrigger className="text-base font-semibold">
                Additional Info
              </AccordionTrigger>

              <AccordionContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label className="font-semibold">Taxes</Label>
                  <Label className="text-xs">Sales Tax Registration</Label>
                  <Input
                    value={formData.sales_tax_registration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sales_tax_registration: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Opening Balance</Label>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Amount</Label>
                      <Input
                        type="number"
                        value={formData.opening_balance}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            opening_balance: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label className="text-xs">As of</Label>
                      <Input
                        type="date"
                        value={formData.opening_balance_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            opening_balance_date: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* NOTES & ATTACHMENTS */}
            <AccordionItem value="notes">
              <AccordionTrigger className="text-base font-semibold">
                Notes & Attachments
              </AccordionTrigger>

              <AccordionContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="min-h-[100px]"
                  />
                </div>

                <div>
                  <Label>Attachments</Label>

                  <div className="border-2 border-dashed p-6 rounded-lg text-center">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />

                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="h-8 w-8 text-primary mb-2" />
                      <span className="text-primary">
                        {uploading ? "Uploading..." : "Add attachment"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Max file size: 20 MB
                      </span>
                    </label>
                  </div>

                  {attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {attachments.map((att, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center bg-card p-2 border rounded"
                        >
                          <div className="flex items-center gap-2">
                            <File className="h-4 w-4" />
                            <span>{att.filename}</span>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(i)}
                          >
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

          {/* ACTION BUTTONS */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={loading || !formData.name.trim()}
              className="bg-primary text-primary-foreground"
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
