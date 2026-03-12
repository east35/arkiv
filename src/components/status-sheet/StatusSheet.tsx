import * as React from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { IconTrash, IconDeviceFloppy, IconX } from "@tabler/icons-react";

import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useItems } from "@/hooks/useItems";
import type { FullItem, Status } from "@/types";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Form Schema
// ---------------------------------------------------------------------------

const statusSchema = z.enum([
  "in_collection",
  "backlog",
  "in_progress",
  "paused",
  "completed",
  "dropped",
]);

// We allow string | number | null for form inputs to handle the "empty" state of number inputs
const formSchema = z.object({
  status: statusSchema,
  user_score: z.union([z.string(), z.number(), z.null()]).optional(),
  progress: z.union([z.string(), z.number(), z.null()]).optional(),
  progress_hours: z.union([z.string(), z.number(), z.null()]).optional(),
  progress_minutes: z.union([z.string(), z.number(), z.null()]).optional(),
  started_at: z.date().nullable().optional(),
  completed_at: z.date().nullable().optional(),
  paused_at: z.date().nullable().optional(),
  dropped_at: z.date().nullable().optional(),
  notes: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatusSheetProps {
  item: FullItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatusSheet({ item, open, onOpenChange }: StatusSheetProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { editItem, deleteItem } = useItems();
  const [isDeleting, setIsDeleting] = React.useState(false);

  // -------------------------------------------------------------------------
  // Form Setup
  // -------------------------------------------------------------------------

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "backlog",
      user_score: "",
      progress: "",
      progress_hours: "",
      progress_minutes: "",
      started_at: null,
      completed_at: null,
      paused_at: null,
      dropped_at: null,
      notes: "",
    },
  });

  // Reset form when item changes
  React.useEffect(() => {
    if (item) {
      form.reset({
        status: item.status,
        user_score: item.user_score ?? "",
        progress: item.media_type === "book" ? (item.book.progress ?? "") : "",
        progress_hours:
          item.media_type === "game" ? (item.game.progress_hours ?? "") : "",
        progress_minutes:
          item.media_type === "game" ? (item.game.progress_minutes ?? "") : "",
        started_at: item.started_at ? new Date(item.started_at) : null,
        completed_at: item.completed_at ? new Date(item.completed_at) : null,
        paused_at: item.paused_at ? new Date(item.paused_at) : null,
        dropped_at: item.dropped_at ? new Date(item.dropped_at) : null,
        notes: item.notes || "",
      });
    }
  }, [item, form]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  async function onSubmit(values: FormValues) {
    if (!item) return;

    try {
      // Convert form values (string | number) to clamped numbers or null.
      const cleanNumber = (
        val: string | number | undefined | null,
        min = 0,
        max?: number,
      ) => {
        if (val === "" || val === null || val === undefined) return null;
        const n = Number(val);
        if (isNaN(n)) return null;
        const clamped = Math.max(min, max != null ? Math.min(n, max) : n);
        return clamped;
      };

      const coreUpdates: Partial<FullItem> = {
        status: values.status,
        user_score: cleanNumber(values.user_score, 0, 10),
        notes: values.notes || null,
        started_at: values.started_at?.toISOString() ?? null,
        completed_at: values.completed_at?.toISOString() ?? null,
        paused_at: values.paused_at?.toISOString() ?? null,
        dropped_at: values.dropped_at?.toISOString() ?? null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let extensionUpdates: any = {};

      if (item.media_type === "book") {
        extensionUpdates = {
          progress: cleanNumber(values.progress, 0),
        };
      } else {
        extensionUpdates = {
          progress_hours: cleanNumber(values.progress_hours, 0) || 0,
          progress_minutes: cleanNumber(values.progress_minutes, 0, 59) || 0,
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await editItem(item.id, coreUpdates as any, extensionUpdates);
      toast.success("Item updated");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update item");
    }
  }

  async function handleDelete() {
    if (!item) return;
    try {
      setIsDeleting(true);
      await deleteItem(item.id);
      toast.success("Item deleted");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete item");
    } finally {
      setIsDeleting(false);
    }
  }

  // Handle status change to auto-set dates if empty
  const handleStatusChange = (value: Status) => {
    form.setValue("status", value);
    const now = new Date();

    // Only auto-set if currently null
    if (value === "in_progress" && !form.getValues("started_at")) {
      form.setValue("started_at", now, { shouldDirty: true });
    } else if (value === "completed" && !form.getValues("completed_at")) {
      form.setValue("completed_at", now, { shouldDirty: true });
    } else if (value === "paused" && !form.getValues("paused_at")) {
      form.setValue("paused_at", now, { shouldDirty: true });
    } else if (value === "dropped" && !form.getValues("dropped_at")) {
      form.setValue("dropped_at", now, { shouldDirty: true });
    }
  };

  // -------------------------------------------------------------------------
  // Render Content
  // -------------------------------------------------------------------------

  if (!item) return null;

  const watchedStatus = form.watch("status");

  const Content = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Row 1: Status */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <FormControl>
                <NativeSelect
                  value={field.value}
                  onValueChange={(val) => handleStatusChange(val as Status)}
                  wrapperClassName="w-full"
                >
                  <option value="in_collection">In Collection</option>
                  <option value="backlog">Backlog</option>
                  <option value="in_progress">In Progress</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="dropped">Dropped</option>
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Row 2: Score & Progress */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="user_score"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Score (0-10)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    {...field}
                    value={
                      field.value === null || field.value === undefined
                        ? ""
                        : field.value
                    }
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {item.media_type === "book" ? (
            <FormField
              control={form.control}
              name="progress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Page</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        value={
                          field.value === null || field.value === undefined
                            ? ""
                            : field.value
                        }
                        onChange={field.onChange}
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        / {item.book.page_count ?? "?"}
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="progress_hours"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Hours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        value={
                          field.value === null || field.value === undefined
                            ? ""
                            : field.value
                        }
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="progress_minutes"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Mins</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        {...field}
                        value={
                          field.value === null || field.value === undefined
                            ? ""
                            : field.value
                        }
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        {/* Row 3: Dates — always show Started, plus the status-specific date */}
        <div className="space-y-4 border p-4 bg-muted/20">
          <h4 className="text-sm font-medium leading-none mb-4">Dates</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="started_at"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Started</FormLabel>
                  <DatePicker date={field.value} setDate={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />
            {watchedStatus === "completed" && (
              <FormField
                control={form.control}
                name="completed_at"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Completed</FormLabel>
                    <DatePicker date={field.value} setDate={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {watchedStatus === "paused" && (
              <FormField
                control={form.control}
                name="paused_at"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Paused</FormLabel>
                    <DatePicker date={field.value} setDate={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {watchedStatus === "dropped" && (
              <FormField
                control={form.control}
                name="dropped_at"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Dropped</FormLabel>
                    <DatePicker date={field.value} setDate={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        {/* Row 4: Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add your thoughts..."
                  className="resize-none min-h-[100px]"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Metadata (Read-only) */}
        <div className="text-xs text-muted-foreground pt-4 border-t">
          <p>
            Added:{" "}
            {item.created_at
              ? format(new Date(item.created_at), "PPP")
              : "Unknown"}
          </p>
          <p>Source: {item.source}</p>
          <p>ID: {item.id}</p>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-background border-t flex justify-between items-center pt-4 pb-6 md:relative md:bg-transparent md:border-t-0 md:pb-0">
          <AlertDialog>
            <AlertDialogTrigger
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
              <IconTrash className="h-4 w-4 mr-2" />
              Delete
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{item.title}" and all its
                  history. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-white hover:bg-destructive/90"
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!form.formState.isDirty}>
              <IconDeviceFloppy className="h-4 w-4 mr-2" />
              Update
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );

  // -------------------------------------------------------------------------
  // Responsive Wrapper
  // -------------------------------------------------------------------------

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{item.title}</DialogTitle>
            <DialogDescription>
              {item.media_type === "game" ? "Game" : "Book"} details and
              progress
            </DialogDescription>
          </DialogHeader>
          {Content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="!h-[90vh] flex flex-col px-4 overflow-hidden"
        showCloseButton={false}
      >
        <SheetHeader className="text-left mb-4 flex-shrink-0 px-0 pt-4">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="truncate">{item.title}</SheetTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
            >
              <IconX className="h-4 w-4" />
            </Button>
          </div>
          <SheetDescription>
            {item.media_type === "game" ? "Game" : "Book"} details and progress
          </SheetDescription>
          <Link
            to={`/item/${item.id}`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-full mt-1",
            )}
            onClick={() => onOpenChange(false)}
          >
            View Details
          </Link>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          {Content}
        </div>
      </SheetContent>
    </Sheet>
  );
}
