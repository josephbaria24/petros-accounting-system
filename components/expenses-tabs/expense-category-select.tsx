"use client";

import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { EXPENSE_CATEGORY_CHOICES } from "@/lib/expense-category-choices";

type Props = {
  value: string;
  onValueChange: (label: string) => void;
  /** Defaults to {@link EXPENSE_CATEGORY_CHOICES}. */
  choices?: readonly string[];
  idPrefix?: string;
  disabled?: boolean;
  triggerClassName?: string;
};

export function ExpenseCategorySelect({
  value,
  onValueChange,
  choices = EXPENSE_CATEGORY_CHOICES,
  idPrefix = "exp-cat",
  disabled = false,
  triggerClassName,
}: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...choices];
    return choices.filter((c) => c.toLowerCase().includes(q));
  }, [choices, query]);

  const valueTrim = value.trim();
  const inList = valueTrim ? choices.some((c) => c === valueTrim) : false;

  return (
    <Select
      value={valueTrim ? valueTrim : undefined}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          "h-10 w-full min-w-0 border-border bg-background text-sm shadow-none",
          triggerClassName,
        )}
      >
        <SelectValue placeholder="Select category" />
      </SelectTrigger>
      <SelectContent className="max-h-[min(360px,55vh)] w-[var(--radix-select-trigger-width)] min-w-[260px] p-0">
        <div className="sticky top-0 z-10 border-b bg-popover p-2">
          <Input
            id={`${idPrefix}-search`}
            placeholder="Search categories…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        <div className="max-h-[min(280px,45vh)] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">No matches.</p>
          ) : (
            <>
              {valueTrim && !inList ? (
                <SelectItem
                  key="__current__"
                  value={valueTrim}
                  textValue={valueTrim}
                  className="cursor-pointer pr-2"
                >
                  <span className="flex w-full items-start justify-between gap-3 text-left">
                    <span className="min-w-0 flex-1 truncate font-normal leading-snug">{valueTrim}</span>
                    <span className="shrink-0 text-xs italic text-muted-foreground">Current</span>
                  </span>
                </SelectItem>
              ) : null}
              {filtered.map((c) => (
                <SelectItem
                  key={c}
                  value={c}
                  textValue={`${c} expense`}
                  className="cursor-pointer pr-2"
                >
                  <span className="flex w-full items-start justify-between gap-3 text-left">
                    <span className="min-w-0 flex-1 truncate font-normal leading-snug">{c}</span>
                    <span className="shrink-0 text-xs italic text-muted-foreground">Expense</span>
                  </span>
                </SelectItem>
              ))}
            </>
          )}
        </div>
      </SelectContent>
    </Select>
  );
}
