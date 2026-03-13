import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface NotesPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notes: string | null
  onEditClick: () => void
}

export function NotesPanel({ open, onOpenChange, notes, onEditClick }: NotesPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full">
        <SheetHeader className="mb-6">
          <SheetTitle>adsfafd</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="flex-1 -mr-6 pr-6">
          {notes ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {notes}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 border-2 border-dashed rounded-lg m-1">
              <div className="text-muted-foreground">No notes yet</div>
              <Button variant="outline" onClick={onEditClick}>
                Add a note
              </Button>
            </div>
          )}
        </ScrollArea>
        
        {notes && (
          <div className="pt-6 mt-auto border-t">
            <Button className="w-full" onClick={onEditClick}>
              Edit Notes
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
