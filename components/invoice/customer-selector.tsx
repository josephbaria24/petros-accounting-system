//components\invoice\customer-selector.tsx
"use client";

import { useState, useEffect } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase-client";
import AddCustomerModal from "../add-customer-modal";

export default function CustomerSelector({ value, onChange }: any) {
  const supabase = createClient();
  const [customers, setCustomers] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadCustomers = async () => {
    const { data } = await supabase.from("customers").select("*").order("name");
    setCustomers(data || []);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  return (
    <>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Add customer" />
        </SelectTrigger>

        <SelectContent>
          <div className="px-2 py-2 border-b">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Customer
            </Button>
          </div>

          {customers.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name} — {c.currency}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AddCustomerModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onCustomerCreated={(customer: any) => {
          setCustomers((prev) => [customer, ...prev]);
          onChange(customer.id);
          setShowAddModal(false);
        }}
      />
    </>
  );
}
