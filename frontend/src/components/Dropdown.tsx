'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

// A styled replacement for the browser's <select>: a button that opens a list of options.
// It works with the keyboard too (arrows, Home, End, Enter, Escape) and is announced to
// screen readers as a listbox.

export interface DropdownOption<T extends string> {
    value: T;
    label: string;
    dot?: string; // a Tailwind background class, for the small coloured dot before the label
}

export function Dropdown<T extends string>({
    id,
    label,
    value,
    options,
    onChange,
    disabled = false,
    className = '',
}: {
    id?: string;
    label?: string; // accessible name when there is no visible <label>
    value: T;
    options: DropdownOption<T>[];
    onChange: (value: T) => void;
    disabled?: boolean;
    className?: string;
}) {
    const listId = useId();
    const root = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
    const [active, setActive] = useState(selectedIndex);
    const selected = options[selectedIndex];

    // Close when the user clicks or taps anywhere else.
    useEffect(() => {
        if (!open) return;
        function away(event: PointerEvent) {
            if (!root.current?.contains(event.target as Node)) setOpen(false);
        }
        document.addEventListener('pointerdown', away);
        return () => document.removeEventListener('pointerdown', away);
    }, [open]);

    function show() {
        setActive(selectedIndex);
        setOpen(true);
    }

    function choose(index: number) {
        onChange(options[index].value);
        setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        if (disabled) return;
        const last = options.length - 1;
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                if (!open) show();
                else setActive((i) => Math.min(last, i + 1));
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (!open) show();
                else setActive((i) => Math.max(0, i - 1));
                break;
            case 'Home':
                if (open) {
                    event.preventDefault();
                    setActive(0);
                }
                break;
            case 'End':
                if (open) {
                    event.preventDefault();
                    setActive(last);
                }
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                if (open) choose(active);
                else show();
                break;
            case 'Escape':
            case 'Tab':
                setOpen(false);
                break;
        }
    }

    return (
        <div ref={root} className={`relative ${className}`}>
            <button
                id={id}
                type="button"
                role="combobox"
                aria-label={label}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                aria-activedescendant={open ? `${listId}-${active}` : undefined}
                disabled={disabled}
                onClick={() => (open ? setOpen(false) : show())}
                onKeyDown={onKeyDown}
                className={`group flex w-full items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-left text-sm font-medium text-ink-800 shadow-sm ring-1 ring-inset transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400 ${
                    open ? 'ring-2 ring-brand-600' : 'ring-ink-300 hover:ring-brand-400'
                }`}
            >
                {selected.dot && <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${selected.dot}`} />}
                <span className="min-w-0 flex-1 truncate">{selected.label}</span>
                <svg
                    viewBox="0 0 20 20"
                    className={`size-4 shrink-0 text-ink-500 transition-transform duration-200 group-hover:text-brand-700 ${open ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="m5 8 5 5 5-5" />
                </svg>
            </button>

            {open && (
                <ul
                    id={listId}
                    role="listbox"
                    aria-label={label}
                    className="dropdown-pop absolute left-0 right-0 z-40 mt-2 max-h-72 min-w-44 overflow-auto rounded-xl bg-white p-1.5 shadow-[0_18px_40px_-14px_rgba(14,21,18,0.4)] ring-1 ring-ink-200"
                >
                    {options.map((option, index) => {
                        const isSelected = option.value === value;
                        return (
                            <li
                                key={option.value}
                                id={`${listId}-${index}`}
                                role="option"
                                aria-selected={isSelected}
                                onPointerEnter={() => setActive(index)}
                                onClick={() => choose(index)}
                                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                                    isSelected ? 'font-semibold text-brand-900' : 'text-ink-700'
                                } ${active === index ? 'bg-brand-50' : ''}`}
                            >
                                {option.dot ? (
                                    <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${option.dot}`} />
                                ) : (
                                    <span aria-hidden="true" className="size-2.5 shrink-0" />
                                )}
                                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                                {isSelected && (
                                    <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-brand-700" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="m4 10.5 4 4 8-9" />
                                    </svg>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
