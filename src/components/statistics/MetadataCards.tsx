import { IconBook, IconDeviceGamepad2, IconTrophy, IconStar } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PosterItem } from "@/components/library/PosterItem"
import type { Statistics } from "@/hooks/useStatistics"
import type { FullItem } from "@/types"

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{label}</span>
      <span className="text-lg font-bold leading-none">{value}</span>
    </div>
  )
}

function FavoritePill({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{label}</span>
      <span className="text-sm font-medium truncate">{value ?? "—"}</span>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {}

function TopThree({ items }: { items: FullItem[] }) {
  const slots = Array.from({ length: 3 }, (_, i) => items[i] ?? null)

  return (
    <div className="grid grid-cols-3 gap-2">
      {slots.map((item, i) =>
        item ? (
          <PosterItem key={item.id} item={item} onEdit={noop} compact />
        ) : (
          <div key={i} className="aspect-[2/3] bg-muted/40 border border-dashed border-muted-foreground/20" />
        ),
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface MetadataCardsProps {
  stats: Statistics
}

export function MetadataCards({ stats }: MetadataCardsProps) {
  const avgDisplay = (score: number | null) =>
    score != null ? `${score} / 10` : "—"

  const pagesDisplay = (n: number) =>
    n > 0 ? n.toLocaleString() : "—"

  const hoursDisplay = (h: number) => {
    if (h === 0) return "—"
    return h % 1 === 0 ? `${h}h` : `${h}h`
  }

  return (
    <div className="space-y-4">
      {/* Global row */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Completed</CardTitle>
            <IconTrophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedCount}</div>
            <p className="text-xs text-muted-foreground">of {stats.statusCounts.total} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <IconStar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDisplay(stats.averageScore)}</div>
            <p className="text-xs text-muted-foreground">Across rated items in this range</p>
          </CardContent>
        </Card>
      </div>

      {/* Books + Games columns */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* Books */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <IconBook className="h-4 w-4 text-amber-500" />
              Books
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="Completed" value={stats.booksCompleted} />
              <MiniStat label="Pages Read" value={pagesDisplay(stats.booksPagesRead)} />
              <MiniStat label="Avg Score" value={avgDisplay(stats.booksAverageScore)} />
            </div>

            {/* Top 3 */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">Top 3</p>
              <TopThree items={stats.topBooks} />
            </div>

            {/* Favorites */}
            <div className="grid grid-cols-2 gap-3">
              <FavoritePill label="Fav Author" value={stats.favoriteBookAuthor} />
              <FavoritePill label="Fav Genre" value={stats.favoriteBookGenre} />
            </div>
          </CardContent>
        </Card>

        {/* Games */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <IconDeviceGamepad2 className="h-4 w-4 text-blue-500" />
              Games
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="Completed" value={stats.gamesCompleted} />
              <MiniStat label="Hours Played" value={hoursDisplay(stats.gamesHoursPlayed)} />
              <MiniStat label="Avg Score" value={avgDisplay(stats.gamesAverageScore)} />
            </div>

            {/* Top 3 */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">Top 3</p>
              <TopThree items={stats.topGames} />
            </div>

            {/* Favorites */}
            <div className="grid grid-cols-2 gap-3">
              <FavoritePill label="Fav Platform" value={stats.favoritePlatform} />
              <FavoritePill label="Fav Genre" value={stats.favoriteGameGenre} />
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
