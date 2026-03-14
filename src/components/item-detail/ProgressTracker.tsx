import { useState } from "react"
import { IconPencil, IconCheck, IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "sonner"
import type { ItemProgress } from "@/types"

const PROGRESS_TYPES = [
  { value: "chapter", label: "Chapter" },
  { value: "page", label: "Page" },
  { value: "percent", label: "Percent" },
  { value: "act", label: "Act" },
  { value: "quest", label: "Quest" },
  { value: "area", label: "Area" },
  { value: "freeform", label: "Freeform" },
]

interface ProgressTrackerProps {
  progress: ItemProgress | null
  onSave: (update: { type: string; value: string; confidence?: string }) => Promise<void>
}

export function ProgressTracker({ progress, onSave }: ProgressTrackerProps) {
  const [editing, setEditing] = useState(false)
  const [type, setType] = useState(progress?.type ?? "chapter")
  const [value, setValue] = useState(progress?.value ?? "")
  const [saving, setSaving] = useState(false)

  const startEdit = () => {
    setType(progress?.type ?? "chapter")
    setValue(progress?.value ?? "")
    setEditing(true)
  }

  const handleSave = async () => {
    const trimmed = value.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      await onSave({ type, value: trimmed })
      setEditing(false)
    } catch {
      toast.error("Failed to save progress")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Progress</h3>

      {editing ? (
        <div className="bg-card border rounded-lg p-3 space-y-3">
          <div className="flex gap-2">
            <NativeSelect
              value={type}
              onValueChange={setType}
              wrapperClassName="flex-1"
            >
              {PROGRESS_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </NativeSelect>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === "chapter" ? "12" : type === "percent" ? "45%" : "…"}
              className="flex-1 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave()
                if (e.key === "Escape") setEditing(false)
              }}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="icon-sm" variant="ghost" onClick={() => setEditing(false)}>
              <IconX className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon-sm" onClick={handleSave} disabled={saving || !value.trim()}>
              <IconCheck className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          className="w-full flex items-center justify-between bg-card border rounded-lg px-3 py-2.5 text-left hover:bg-accent/40 transition-colors"
          onClick={startEdit}
        >
          {progress?.value ? (
            <span className="text-sm">
              <span className="font-medium capitalize">{progress.type ?? "Progress"}</span>
              {" "}
              <span className="text-muted-foreground">{progress.value}</span>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Set progress…</span>
          )}
          <IconPencil className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      )}
    </div>
  )
}
