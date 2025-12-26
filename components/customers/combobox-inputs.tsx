"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"

type Props = {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder: string
  open: boolean
  setOpen: (open: boolean) => void
}

export default function ComboboxInput({
  value,
  onChange,
  options,
  placeholder,
  open,
  setOpen,
}: Props) {
  const [search, setSearch] = useState("")
  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || placeholder}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or type new..."
            value={search}
            onValueChange={setSearch}
          />

          <CommandEmpty>
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  if (search.trim()) {
                    onChange(search.trim())
                    setOpen(false)
                    setSearch("")
                  }
                }}
              >
                Add "{search}"
              </Button>
            </div>
          </CommandEmpty>

          <CommandGroup className="max-h-[200px] overflow-auto">
            {filteredOptions.map((option) => (
              <CommandItem
                key={option}
                value={option}
                onSelect={() => {
                  onChange(option)
                  setOpen(false)
                  setSearch("")
                }}
              >
                {option}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
