import { useState } from "react";
import { Link } from "react-router-dom";
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

interface CollectionCardProps {
  collection: Collection;
}

export function CollectionCard({ collection }: CollectionCardProps) {
  const { deleteCollection } = useCollections();
  const items = useShelfStore((s) => s.items);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const itemCount = collection.item_count ?? 0;
  const countLabel = `${itemCount} ${itemCount === 1 ? "item" : "items"}`;
  const subline = collection.description
    ? `${collection.description} | ${countLabel}`
    : countLabel;

  // Resolve up to 4 cover URLs for the preview grid.
  // Fallback order: preview_item_ids -> cover_item_id -> first_item_id
  const previewIds = collection.preview_item_ids?.length
    ? collection.preview_item_ids
    : [collection.cover_item_id, collection.first_item_id].filter(
        (id): id is string => Boolean(id),
      );
  const covers = previewIds
    .map((id) => items.find((i) => i.id === id)?.cover_url ?? null)
    .filter(Boolean) as string[];

  const handleDelete = async () => {
    try {
      await deleteCollection(collection.id);
      toast.success("Collection deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete collection");
    }
  };

  return (
    <div className="group relative flex flex-col overflow-hidden bg-card dark:bg-[#0A0A0A] text-card-foreground transition-colors">
      <Link to={`/collections/${collection.id}`} className="block h-full">
        {/* Cover — 2x2 grid or single or empty */}
        <div className="aspect-rectangle w-full bg-muted overflow-hidden">
          {covers.length >= 2 ? (
            <div className="grid grid-cols-2 grid-rows-2 h-full w-full">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="overflow-hidden bg-muted">
                  {covers[i] ? (
                    <img
                      src={covers[i]}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full bg-muted" />
                  )}
                </div>
              ))}
            </div>
          ) : covers.length === 1 ? (
            <img
              src={covers[0]}
              alt={collection.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <span className="text-4xl font-bold text-muted-foreground/20">
                {collection.name.charAt(0)}
              </span>
            </div>
          )}
        </div>

        <div className="p-3">
          <h3
            className="font-semibold leading-tight truncate"
            title={collection.name}
          >
            {collection.name}
          </h3>
          <p className="mt-1 truncate text-xs text-muted-foreground" title={subline}>
            {subline}
          </p>
        </div>
      </Link>

      <button
        type="button"
        aria-label={`Delete ${collection.name}`}
        className={cn(
          "absolute top-2 right-2 flex h-8 w-8 items-center justify-center bg-background/90 text-muted-foreground shadow-sm transition-all",
          "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-destructive",
        )}
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
              This will permanently delete "{collection.name}". This action cannot be
              undone.
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
