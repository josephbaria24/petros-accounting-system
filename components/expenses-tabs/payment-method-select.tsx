"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/payment-methods";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  onValueChange: (method: string) => void;
  idPrefix?: string;
  disabled?: boolean;
};

export function PaymentMethodSelect({
  value,
  onValueChange,
  idPrefix = "pay-method",
  disabled = false,
}: Props) {
  const [query, setQuery] = useState("");

  const known = (PAYMENT_METHOD_OPTIONS as readonly string[]).includes(value);
  const selectValue = known ? value : undefined;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...PAYMENT_METHOD_OPTIONS];
    return PAYMENT_METHOD_OPTIONS.filter((m) => m.toLowerCase().includes(q));
  }, [query]);

  return (
    <Select value={selectValue} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="h-10 w-full min-w-0 border-green-600/40 bg-white">
        <SelectValue placeholder="Select payment method" />
      </SelectTrigger>
      <SelectContent className="max-h-[min(320px,50vh)] w-[var(--radix-select-trigger-width)] min-w-[220px] p-0">
        <div className="sticky top-0 z-10 border-b bg-popover p-2 space-y-2">
          <Input
            id={`${idPrefix}-search`}
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9"
            onKeyDown={(e) => e.stopPropagation()}
          />
          <Link
            href="/settings"
            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline px-1"
          >
            <Plus className="h-4 w-4 shrink-0" />
            Add new
          </Link>
        </div>
        <div className="max-h-[min(260px,42vh)] overflow-y-auto py-1">
          {!known && value.trim() !== "" ? (
            <p className="px-3 py-2 text-xs text-amber-800 bg-amber-50 border-b border-amber-100">
              Saved value &quot;{value}&quot; is not in the list — pick a method to update.
            </p>
          ) : null}
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">No matches.</p>
          ) : (
            filtered.map((m) => (
              <SelectItem key={m} value={m} textValue={m} className="cursor-pointer">
                {m}
              </SelectItem>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  );
}
