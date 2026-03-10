import {
  IconClock,
  IconPlayerPlay,
  IconCircleCheck,
  IconPlayerPause,
  IconCircleX,
} from "@tabler/icons-react"
import type { Status } from "@/types"

export const statusIcons: Record<Status, React.ReactNode> = {
  backlog: <IconClock className="h-4 w-4" />,
  in_progress: <IconPlayerPlay className="h-4 w-4" />,
  completed: <IconCircleCheck className="h-4 w-4" />,
  paused: <IconPlayerPause className="h-4 w-4" />,
  dropped: <IconCircleX className="h-4 w-4" />,
}

export const statusLabels: Record<string, string> = {
  all: "All Status",
  backlog: "Backlog",
  in_progress: "In Progress",
  paused: "Paused",
  completed: "Completed",
  dropped: "Dropped",
}

export const statusColors: Record<Status, string> = {
  backlog: "bg-slate-500 text-white border-slate-600",
  in_progress: "bg-blue-600 text-white border-blue-700",
  completed: "bg-green-600 text-white border-green-700",
  paused: "bg-yellow-600 text-white border-yellow-700",
  dropped: "bg-red-600 text-white border-red-700",
}
