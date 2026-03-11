import { useState } from "react";
import { Link } from "react-router-dom";
import { IconDots, IconTrash } from "@tabler/icons-react";

import type { List } from "@/types";
import { useShelfStore } from "@/store/useShelfStore";
import { useLists } from "@/hooks/useLists";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { iconActionButtonClassName } from "@/lib/icon-action-button";

interface ListCardProps {
  list: List;
}

export function ListCard({ list }: ListCardProps) {
  const { deleteList } = useLists();
  const items = useShelfStore((s) => s.items);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const itemCount = list.item_count ?? 0;
  const countLabel = `${itemCount} ${itemCount === 1 ? "item" : "items"}`;

  // Resolve up to 4 cover URLs for the preview grid.
  // Fallback order: preview_item_ids -> cover_item_id -> first_item_id
  const previewIds = list.preview_item_ids?.length
    ? list.preview_item_ids
    : [list.cover_item_id, list.first_item_id].filter(
        (id): id is string => Boolean(id),
      );
  const covers = previewIds
    .map((id) => items.find((i) => i.id === id)?.cover_url ?? null)
    .filter(Boolean) as string[];

  const handleDelete = async () => {
    try {
      await deleteList(list.id);
      toast.success("List deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete list");
    }
  };

  return (
    <div className="group relative flex flex-col overflow-hidden bg-card dark:bg-[#0A0A0A] text-card-foreground transition-colors">
      <Link to={`/lists/${list.id}`} className="block h-full">
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
              alt={list.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <span className="text-4xl font-bold text-muted-foreground/20">
                {list.name.charAt(0)}
              </span>
            </div>
          )}
        </div>

        <div className="p-3">
          <h3
            className="font-semibold leading-tight truncate"
            title={list.name}
          >
            {list.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{countLabel}</p>
        </div>
      </Link>

      <div
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            className={iconActionButtonClassName({ tone: "subtle" })}
          >
            <IconDots className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-destructive"
            >
              <IconTrash className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete list?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{list.name}". This action cannot be
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
