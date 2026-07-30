'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

export type SearchableOption = {
  value: string;
  label: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  /** Extra classes on the trigger input shell */
  triggerClassName?: string;
  id?: string;
  emptyMessage?: string;
};

/**
 * Combobox: search icon + type-to-filter input (same UX for country, state, city).
 */
export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  disabled = false,
  required = false,
  className = '',
  triggerClassName = '',
  id,
  emptyMessage = 'No matches',
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
        inputRef.current?.blur();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const displayValue = open ? query : selected?.label || '';

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {/* Native required hook — off-screen (no `sr-only` in this project) */}
      <input
        type="text"
        value={value}
        required={required}
        readOnly
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
        style={{ clip: 'rect(0 0 0 0)' }}
      />

      <div
        className={`w-full px-3 py-2.5 sm:py-3 bg-white border border-[#E2D5C7] rounded-2xl flex items-center gap-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${triggerClassName}`}
      >
        <Icon icon="lucide:search" className="w-3.5 h-3.5 text-muted shrink-0" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={displayValue}
          placeholder={open ? searchPlaceholder : selected ? selected.label : placeholder}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            setQuery('');
          }}
          onClick={() => {
            if (disabled) return;
            setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          className="min-w-0 flex-1 bg-transparent border-0 outline-none text-xs sm:text-sm text-[#2A170F] placeholder:text-gray-400"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label={open ? 'Close options' : 'Open options'}
          onClick={() => {
            if (disabled) return;
            if (open) {
              setOpen(false);
              setQuery('');
            } else {
              setOpen(true);
              setQuery('');
              inputRef.current?.focus();
            }
          }}
          className="shrink-0 p-0.5 text-muted cursor-pointer"
        >
          <Icon
            icon="lucide:chevron-down"
            className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {open && !disabled ? (
        <div className="absolute z-40 mt-1.5 w-full rounded-2xl border border-[#E2D5C7] bg-white shadow-lg overflow-hidden">
          <ul id={listId} role="listbox" className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-xs text-muted">{emptyMessage}</li>
            ) : (
              filtered.map((opt) => {
                const active = opt.value === value;
                return (
                  <li key={opt.value} role="option" aria-selected={active}>
                    <button
                      type="button"
                      className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#F5ECE8] text-[#4E291B] font-semibold'
                          : 'text-[#2A170F] hover:bg-[#FAF6F2]'
                      }`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(opt.value)}
                    >
                      {opt.label}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
