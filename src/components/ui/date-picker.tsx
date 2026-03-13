import { cn } from "@/lib/utils"

interface DatePickerProps {
  date?: Date | null
  setDate: (date: Date | undefined) => void
  className?: string
}

function padDatePart(value: number) {
  return value.toString().padStart(2, "0")
}

function formatLocalDateTimeValue(date: Date) {
  const year = date.getFullYear()
  const month = padDatePart(date.getMonth() + 1)
  const day = padDatePart(date.getDate())
  const hours = padDatePart(date.getHours())
  const minutes = padDatePart(date.getMinutes())

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function parseLocalDateTimeValue(value: string) {
  const [datePart, timePart] = value.split("T")
  if (!datePart || !timePart) return undefined

  const [year, month, day] = datePart.split("-").map(Number)
  const [hours, minutes] = timePart.split(":").map(Number)

  if ([year, month, day, hours, minutes].some(Number.isNaN)) {
    return undefined
  }

  return new Date(year, month - 1, day, hours, minutes)
}

export function DatePicker({ date, setDate, className }: DatePickerProps) {
  const value = date ? formatLocalDateTimeValue(date) : ""

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => {
          if (e.target.value) {
            setDate(parseLocalDateTimeValue(e.target.value))
          } else {
            setDate(undefined)
          }
        }}
        className={cn(
          "h-10 w-full border border-input bg-[#FFFFFF] px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [color-scheme:light] dark:bg-[#0A0A0A] dark:[color-scheme:dark]",
          className
        )}
        style={{ WebkitAppearance: "none", boxSizing: "border-box", display: "block" }}
      />
    </div>
  )
}
