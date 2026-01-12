//components\invoice\customer-selector.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import AddCustomerModal from "../add-customer-modal";

export default function CustomerSelector({ value, onChange }: any) {
  const supabase = createClient();
  const [customers, setCustomers] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      // Fetch only first 100 initially for speed
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, email, company_name, currency")
        .order("name")
        .limit(100);

      if (error) {
        console.error("Error loading customers:", error);
      } else {
        setCustomers(data || []);
      }
    } catch (error) {
      console.error("Error loading customers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load more customers when searching
  const searchCustomers = async (query: string) => {
    if (!query.trim()) {
      loadCustomers();
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, email, company_name, currency")
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,company_name.ilike.%${query}%`)
        .order("name")
        .limit(50);

      if (!error && data) {
        setCustomers(data);
      }
    } catch (error) {
      console.error("Error searching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchCustomers(searchQuery);
      } else {
        loadCustomers();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedCustomer = customers.find(c => c.id === value);

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={() => setIsOpen(!isOpen)}
          type="button"
        >
          <span className="truncate">
            {selectedCustomer ? `${selectedCustomer.name} — ${selectedCustomer.currency}` : "Add customer"}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
        </Button>

        {isOpen && (
         <div className="absolute z-50 mt-2 w-[420px] max-w-[90vw] bg-popover border rounded-md shadow-md max-h-[400px] flex flex-col">

            {/* Search Bar */}
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9"
                  autoFocus
                />
              </div>
            </div>

            {/* Add New Customer Button */}
            <div className="p-2 border-b">
              <Button
                variant="ghost"
                className="w-full justify-start h-9"
                onClick={() => {
                  setShowAddModal(true);
                  setIsOpen(false);
                }}
                type="button"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Customer
              </Button>
            </div>

            {/* Customer List */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : customers.length > 0 ? (
                <>
                  <div className="px-2 py-1 text-xs text-muted-foreground sticky top-0 bg-popover">
                    {customers.length} customer{customers.length !== 1 ? 's' : ''}
                  </div>
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-2 py-2 hover:bg-accent hover:text-accent-foreground text-sm cursor-pointer transition-colors"
                      onClick={() => {
                        onChange(c.id);
                        setIsOpen(false);
                        setSearchQuery("");
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{c.name}</span>
                        <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                          {c.currency}
                        </span>
                      </div>
                      {c.email && (
                        <div className="text-xs text-muted-foreground truncate">
                          {c.email}
                        </div>
                      )}
                    </button>
                  ))}
                </>
              ) : (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  {searchQuery ? 'No customers found' : 'No customers yet'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AddCustomerModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onCustomerCreated={(customer: any) => {
          setCustomers((prev) => [customer, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
          onChange(customer.id);
          setShowAddModal(false);
        }}
      />
    </>
  );
}