import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import type { DateFormat, TimeFormat } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(
  date: Date | string,
  dateFormat: DateFormat = "long",
): string {
  const d = typeof date === "string" ? new Date(date) : date

  const datePart: Record<DateFormat, string> = {
    iso:  "yyyy-MM-dd",
    us:   "MM/dd/yyyy",
    eu:   "dd/MM/yyyy",
    long: "MMM d, yyyy",
  }

  return format(d, datePart[dateFormat])
}

export function formatDateTime(
  date: Date | string,
  dateFormat: DateFormat = "long",
  timeFormat: TimeFormat = "12hr",
): string {
  const d = typeof date === "string" ? new Date(date) : date

  const datePart: Record<DateFormat, string> = {
    iso:  "yyyy-MM-dd",
    us:   "MM/dd/yyyy",
    eu:   "dd/MM/yyyy",
    long: "MMM d, yyyy",
  }

  const timePart = timeFormat === "24hr" ? "HH:mm" : "h:mm a"

  return format(d, `${datePart[dateFormat]}, ${timePart}`)
}
