import { cn } from "@/lib/utils"

interface DatePickerProps {
  date?: Date | null
  setDate: (date: Date | undefined) => void
  className?: string
}

export function DatePicker({ date, setDate, className }: DatePickerProps) {
  const value = date ? date.toISOString().slice(0, 16) : ""

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => {
          if (e.target.value) {
            setDate(new Date(e.target.value))
          } else {
            setDate(undefined)
          }
        }}
        className={cn(
          "h-10 w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [color-scheme:light] dark:[color-scheme:dark]",
          className
        )}
        style={{ WebkitAppearance: "none", boxSizing: "border-box", display: "block" }}
      />
    </div>
  )
}
