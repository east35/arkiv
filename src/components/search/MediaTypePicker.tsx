import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IconDeviceGamepad2, IconBook } from "@tabler/icons-react"
import type { MediaType } from "@/types"

interface MediaTypePickerProps {
  value: MediaType
  onChange: (value: MediaType) => void
}

export function MediaTypePicker({ value, onChange }: MediaTypePickerProps) {
  return (
    <Tabs value={value} onValueChange={(val) => onChange(val as MediaType)} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="game" className="flex items-center gap-2">
          <IconDeviceGamepad2 className="h-4 w-4" />
          Games
        </TabsTrigger>
        <TabsTrigger value="book" className="flex items-center gap-2">
          <IconBook className="h-4 w-4" />
          Books
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
