import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { IconTrash } from "@tabler/icons-react";
import type { Collection } from "@/types";
import { useShelfStore } from "@/store/useShelfStore";
import { useCollections } from "@/hooks/useCollections";
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
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface CollectionTableRowProps {
  collection: Collection;
  stacked?: boolean;
  isFirst?: boolean;
}

export function CollectionTableRow({
  collection,
  stacked = false,
  isFirst = false,
}: CollectionTableRowProps) {
  const { deleteCollection } = useCollections();
  const items = useShelfStore((s) => s.items);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const coverItemId =
    collection.cover_item_id ?? collection.first_item_id ?? null;
  const coverUrl = coverItemId
    ? (items.find((i) => i.id === coverItemId)?.cover_url ?? null)
    : null;
  const itemCount = collection.item_count ?? 0;
  const countLabel = `${itemCount} ${itemCount === 1 ? "item" : "items"}`;
  const subline = collection.description
    ? `${collection.description} | ${countLabel}`
    : countLabel;

  const handleDelete = async () => {
    try {
      await deleteCollection(collection.id);
      toast.success("Collection deleted");
    } catch {
      toast.error("Failed to delete collection");
    }
  };

  return (
    <div
      className={cn(
        "group flex items-stretch bg-card dark:bg-[#0A0A0A] transition-colors hover:bg-accent/50",
        stacked ? "border-b border-border/60" : "border border-border/60",
        stacked && isFirst && "border-t",
      )}
    >
      <Link
        to={`/collections/${collection.id}`}
        className="flex flex-1 min-w-0 items-center gap-4 pr-4"
      >
        {/* Cover thumbnail */}
        <div className="h-16 w-12 shrink-0 overflow-hidden bg-muted">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={collection.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-sm font-bold text-muted-foreground/30">
              {collection.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Name & subline */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium leading-none truncate">
            {collection.name}
          </h3>
          <p
            className="mt-1 truncate text-xs text-muted-foreground"
            title={subline}
          >
            {subline}
          </p>
        </div>

        {/* Date */}
        {collection.created_at && (
          <div className="w-28 text-right text-xs text-muted-foreground shrink-0 hidden sm:block">
            {format(new Date(collection.created_at), "MMM d, yyyy")}
          </div>
        )}
      </Link>

      <button
        type="button"
        aria-label={`Delete ${collection.name}`}
        className="flex w-10 shrink-0 items-center justify-center border-l border-border/60 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDeleteDialogOpen(true);
        }}
      >
        <IconTrash className="h-4 w-4" />
      </button>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{collection.name}". This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
