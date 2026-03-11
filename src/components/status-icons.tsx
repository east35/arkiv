import {
  IconBookmarkFilled,
  IconDeviceFloppyFilled,
  IconFlagFilled,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconTrashXFilled,
} from "@tabler/icons-react"
import type { Status } from "@/types"

export const statusIcons: Record<Status, React.ReactNode> = {
  in_collection: <IconDeviceFloppyFilled className="h-4 w-4" />,
  backlog: <IconBookmarkFilled className="h-4 w-4" />,
  in_progress: <IconPlayerPlayFilled className="h-4 w-4" />,
  completed: <IconFlagFilled className="h-4 w-4" />,
  paused: <IconPlayerPauseFilled className="h-4 w-4" />,
  dropped: <IconTrashXFilled className="h-4 w-4" />,
}

export const statusLabels: Record<string, string> = {
  all: "All Status",
  in_collection: "In Collection",
  backlog: "Backlog",
  in_progress: "In Progress",
  paused: "Paused",
  completed: "Completed",
  dropped: "Dropped",
}

export const mediaTypeColors = {
  game: "#0044FF",
  book: "#FFB700",
} as const

export const statusColors: Record<Status, string> = {
  in_collection: "bg-slate-500 text-white border-slate-600",
  backlog: "bg-purple-600 text-white border-purple-700",
  in_progress: "bg-primary text-primary-foreground border-primary",
  completed: "bg-green-600 text-white border-green-700",
  paused: "bg-yellow-600 text-white border-yellow-700",
  dropped: "bg-red-600 text-white border-red-700",
}
