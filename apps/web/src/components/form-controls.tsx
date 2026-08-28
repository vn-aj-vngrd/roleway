"use client";

import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type SelectOption = { value: string; label: string; disabled?: boolean; icon?: ReactNode; tone?: string };

type SelectFieldProps = {
  id: string;
  name: string;
  options: SelectOption[];
  defaultValue?: string | undefined;
  value?: string | undefined;
  placeholder?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  ariaLabel?: string | undefined;
  onValueChange?: ((value: string) => void) | undefined;
};

export function SelectField({ id, name, options, defaultValue = "", value, placeholder = "Select…", required, disabled, ariaLabel, onValueChange }: SelectFieldProps) {
  const generatedId = useId();
  const menuId = `${id || generatedId}-options`;
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedValue = controlled ? value : internalValue;
  const selected = options.find((option) => option.value === selectedValue);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !open) return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); window.removeEventListener("keydown", escape); };
  }, [open]);

  const choose = (nextValue: string) => {
    if (!controlled) setInternalValue(nextValue);
    onValueChange?.(nextValue);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const move = (direction: 1 | -1) => {
    const available = options.filter((option) => !option.disabled);
    if (!available.length) return;
    const currentIndex = available.findIndex((option) => option.value === selectedValue);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + direction + available.length) % available.length;
    const next = available[nextIndex];
    if (next) choose(next.value);
  };

  return <div className={`custom-select ${open ? "is-open" : ""}`} ref={rootRef}>
    {name ? <input type="hidden" name={name} value={selectedValue ?? ""} /> : null}
    <button ref={triggerRef} className="custom-select-trigger" id={id} type="button" role="combobox" aria-controls={menuId} aria-expanded={open} aria-haspopup="listbox" aria-label={ariaLabel} aria-required={required || undefined} disabled={disabled} onClick={() => setOpen((current) => !current)} onKeyDown={(event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!open) setOpen(true);
        else move(event.key === "ArrowDown" ? 1 : -1);
      }
    }}>{selected?.icon ? <span className="custom-select-value-icon" data-tone={selected.tone || undefined}>{selected.icon}</span> : null}<span className={selected ? "" : "placeholder"}>{selected?.label ?? placeholder}</span><ChevronDown aria-hidden="true" /></button>
    {open ? <div className="custom-select-menu" id={menuId} role="listbox" aria-label={ariaLabel}>
      {options.map((option) => <button className="custom-select-option" type="button" role="option" aria-selected={option.value === selectedValue} disabled={option.disabled} key={option.value} onClick={() => choose(option.value)}><span className="custom-select-option-label">{option.icon ? <span className="select-option-icon" data-tone={option.tone || undefined}>{option.icon}</span> : null}<span>{option.label}</span></span>{option.value === selectedValue ? <Check aria-hidden="true" /> : null}</button>)}
    </div> : null}
  </div>;
}

type DateTimeFieldProps = { id: string; name: string; defaultValue?: string | undefined; required?: boolean | undefined; placeholder?: string | undefined; timeZone?: string | undefined; dateOnly?: boolean | undefined; onValueChange?: ((value: string) => void) | undefined };

const pad = (value: number) => String(value).padStart(2, "0");
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function zonedParts(date: Date, timeZone?: string) {
  if (!timeZone) return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), hour: date.getHours(), minute: date.getMinutes() };
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date).map((part) => [part.type, part.value]));
    return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), hour: Number(parts.hour), minute: Number(parts.minute) };
  } catch { return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), hour: date.getHours(), minute: date.getMinutes() }; }
}

export function DateTimeField({ id, name, defaultValue = "", required, placeholder = "Choose date and time", timeZone, dateOnly = false, onValueChange }: DateTimeFieldProps) {
  const dateOnlyMatch = dateOnly ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(defaultValue) : null;
  const parsed = defaultValue && !dateOnlyMatch ? new Date(defaultValue) : null;
  const parts = dateOnlyMatch
    ? { year: Number(dateOnlyMatch[1]), month: Number(dateOnlyMatch[2]), day: Number(dateOnlyMatch[3]), hour: 9, minute: 0 }
    : parsed && !Number.isNaN(parsed.getTime()) ? zonedParts(parsed, timeZone) : null;
  const [browserTimeZone, setBrowserTimeZone] = useState("UTC");
  const [selectedDate, setSelectedDate] = useState(parts ? `${parts.year}-${pad(parts.month)}-${pad(parts.day)}` : "");
  const [hour, setHour] = useState(parts ? pad(parts.hour) : "09");
  const [minute, setMinute] = useState(parts ? pad(parts.minute) : "00");
  const [month, setMonth] = useState(() => parts ? new Date(parts.year, parts.month - 1, 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBrowserTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, []);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); window.removeEventListener("keydown", escape); };
  }, []);

  const days = useMemo(() => {
    const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(firstWeekday).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
  }, [month]);
  const value = selectedDate ? dateOnly ? selectedDate : `${selectedDate}T${hour}:${minute}` : "";
  const selectDate = (nextDate: string) => {
    setSelectedDate(nextDate);
    onValueChange?.(nextDate ? dateOnly ? nextDate : `${nextDate}T${hour}:${minute}` : "");
  };
  const selectHour = (nextHour: string) => { setHour(nextHour); if (selectedDate) onValueChange?.(`${selectedDate}T${nextHour}:${minute}`); };
  const selectMinute = (nextMinute: string) => { setMinute(nextMinute); if (selectedDate) onValueChange?.(`${selectedDate}T${hour}:${nextMinute}`); };
  const label = selectedDate ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${selectedDate}T12:00:00`)) : placeholder;
  const hourOptions = Array.from({ length: 24 }, (_, index) => ({ value: pad(index), label: pad(index) }));
  const minuteOptions = ["00", "15", "30", "45"].map((item) => ({ value: item, label: item }));

  return <div className={`date-time-field ${dateOnly ? "date-only-field" : ""} ${open ? "is-open" : ""}`} data-required={required || undefined} ref={rootRef}>
    <input type="hidden" name={name} value={value} />
    {!dateOnly ? <input type="hidden" name={`${name}Timezone`} value={timeZone || browserTimeZone} /> : null}
    <button className="date-time-trigger" id={id} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((current) => !current)}><CalendarDays aria-hidden="true" /><span className={selectedDate ? "" : "placeholder"}>{label}</span>{selectedDate && !dateOnly ? <small>{hour}:{minute}</small> : null}<ChevronDown aria-hidden="true" /></button>
    {open ? <div className="date-time-popover floating-panel" role="dialog" aria-label={dateOnly ? "Choose date" : "Choose date and time"}>
      <header><button type="button" data-tooltip="Previous month" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft /></button><strong>{new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(month)}</strong><button type="button" data-tooltip="Next month" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight /></button></header>
      <div className="calendar-weekdays">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="calendar-grid">{days.map((day, index) => day ? <button type="button" className={selectedDate === dateKey(new Date(month.getFullYear(), month.getMonth(), day)) ? "selected" : ""} key={day} onClick={() => selectDate(dateKey(new Date(month.getFullYear(), month.getMonth(), day)))}>{day}</button> : <span key={`empty-${index}`} />)}</div>
      {dateOnly ? <footer className="date-only-actions"><Button variant="ghost" size="sm" type="button" disabled={!selectedDate} onClick={() => selectDate("")}>Clear</Button><Button size="sm" type="button" disabled={!selectedDate} onClick={() => setOpen(false)}>Done</Button></footer> : <footer><Clock aria-hidden="true" /><span>Time</span><SelectField id={`${id}-hour`} name="" value={hour} options={hourOptions} ariaLabel="Hour" onValueChange={selectHour} /><b>:</b><SelectField id={`${id}-minute`} name="" value={minute} options={minuteOptions} ariaLabel="Minute" onValueChange={selectMinute} /><Button size="sm" type="button" disabled={!selectedDate} onClick={() => setOpen(false)}>Done</Button></footer>}
    </div> : null}
  </div>;
}

export function DateField(props: Omit<DateTimeFieldProps, "dateOnly" | "timeZone">) {
  return <DateTimeField {...props} dateOnly placeholder={props.placeholder ?? "Choose date"} />;
}

export function TimezoneField({ id, name = "timezone", defaultValue = "", className }: { id: string; name?: string; defaultValue?: string; className?: string }) {
  const [value, setValue] = useState(defaultValue);
  useEffect(() => {
    if (!defaultValue) setValue(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, [defaultValue]);
  return <Input className={className} id={id} name={name} required value={value} onChange={(event) => setValue(event.target.value)} placeholder="America/New_York" />;
}
