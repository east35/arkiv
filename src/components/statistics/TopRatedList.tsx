import { Link } from "react-router-dom"
import { IconStar, IconDeviceGamepad2, IconBook } from "@tabler/icons-react"
import type { TopRatedItem } from "@/hooks/useStatistics"

interface TopRatedListProps {
  items: TopRatedItem[]
}

export function TopRatedList({ items }: TopRatedListProps) {
  if (items.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No rated items yet</div>
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <Link 
          key={item.id} 
          to={`/item/${item.id}`}
          className="flex items-center gap-4 group hover:bg-muted/50 p-2 rounded-lg transition-colors"
        >
          <div className="flex-shrink-0 w-8 text-center font-bold text-muted-foreground">
            {index + 1}
          </div>
          
          <div className="h-12 w-8 flex-shrink-0 overflow-hidden rounded bg-muted">
            <img 
              src={item.cover_url || "/placeholder.png"} 
              alt={item.title} 
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate group-hover:text-primary transition-colors">
              {item.title}
            </h4>
            <div className="flex items-center text-xs text-muted-foreground">
              {item.media_type === "game" ? <IconDeviceGamepad2 className="h-3 w-3 mr-1" /> : <IconBook className="h-3 w-3 mr-1" />}
              <span className="capitalize">{item.media_type}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 font-bold text-lg">
            <span className="font-medium">{item.user_score}</span>
            <IconStar className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          </div>
        </Link>
      ))}
    </div>
  )
}
