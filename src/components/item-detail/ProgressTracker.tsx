import { useState } from "react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { toast } from "sonner";
import type { ItemProgress } from "@/types";

const PROGRESS_TYPES = [
  { value: "chapter", label: "Chapter" },
  { value: "page", label: "Page" },
  { value: "percent", label: "Percent" },
  { value: "act", label: "Act" },
  { value: "quest", label: "Quest" },
  { value: "area", label: "Area" },
  { value: "freeform", label: "Freeform" },
];

interface ProgressTrackerProps {
  progress: ItemProgress | null;
  onSave: (update: {
    type: string;
    value: string;
    confidence?: string;
  }) => Promise<void>;
}

export function ProgressTracker({ progress, onSave }: ProgressTrackerProps) {
  const [type, setType] = useState(progress?.type ?? "chapter");
  const [value, setValue] = useState(progress?.value ?? "");

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed || (trimmed === progress?.value && type === progress?.type))
      return;
    try {
      await onSave({ type, value: trimmed });
    } catch {
      toast.error("Failed to save progress");
    }
  };

  const handleTypeChange = async (newType: string) => {
    setType(newType);
    const trimmed = value.trim();
    if (!trimmed) return;
    try {
      await onSave({ type: newType, value: trimmed });
    } catch {
      toast.error("Failed to save progress");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex">
        <NativeSelect
          value={type}
          onValueChange={handleTypeChange}
          variant="detail"
          wrapperClassName="flex-1"
        >
          {PROGRESS_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </NativeSelect>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="…"
          className="flex-1 text-sm"
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
        />
      </div>
    </div>
  );
}
