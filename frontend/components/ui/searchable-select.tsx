"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { LuChevronDown, LuSearch, LuCheck } from "react-icons/lu";

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  searchPlaceholder?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  className,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(lowerSearchTerm)
    );
  }, [options, searchTerm]);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div
        className="flex h-full w-full cursor-pointer items-center justify-between"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearchTerm("");
        }}
      >
        <span className="truncate pr-2">
          {selectedOption ? selectedOption.label : <span className="text-gray-400">{placeholder}</span>}
        </span>
        <LuChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full min-w-full overflow-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg ltr:left-0 rtl:right-0">
          <div className="sticky top-0 mb-1 flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5">
            <LuSearch className="mr-2 h-4 w-4 shrink-0 text-gray-500" />
            <input
              autoFocus
              className="flex w-full bg-transparent text-sm outline-none placeholder:text-gray-400 text-gray-900"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500">No results found.</div>
          ) : (
            filteredOptions.map((opt) => (
              <div
                key={opt.value}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-sm py-2 pl-3 pr-9 text-sm text-gray-900 hover:bg-gray-100 hover:text-gray-900",
                  value === opt.value ? "bg-gray-50 font-bold" : ""
                )}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                <span className="truncate">{opt.label}</span>
                {value === opt.value && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-teal-600">
                    <LuCheck className="h-4 w-4" />
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
