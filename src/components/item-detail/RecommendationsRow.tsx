import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import type { FullItem } from "@/types"

interface RecommendationsRowProps {
  item: FullItem
}

export function RecommendationsRow({ item }: RecommendationsRowProps) {
  if (item.media_type !== "game" || !item.game.similar_games || item.game.similar_games.length === 0) {
    return null
  }

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">Recommendations</h3>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex w-max gap-4 pb-4">
          {item.game.similar_games.map((rec) => (
            <div key={rec.name} className="w-[110px] shrink-0">
              <div className="aspect-[2/3] rounded-md overflow-hidden bg-muted">
                {rec.cover ? (
                  <img
                    src={`https://images.igdb.com/igdb/image/upload/t_cover_big/${rec.cover}.jpg`}
                    alt={rec.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-secondary/50">
                    <span className="text-[10px] text-muted-foreground p-1 text-center whitespace-normal">
                      {rec.name}
                    </span>
                  </div>
                )}
              </div>
              <h4 className="text-xs font-semibold mt-1.5 whitespace-normal line-clamp-1" title={rec.name}>
                {rec.name}
              </h4>
              <p className="text-[10px] text-muted-foreground leading-tight">Studio Name</p>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
