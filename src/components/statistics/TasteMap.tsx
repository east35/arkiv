import { IconBook, IconDeviceGamepad2 } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Statistics, GenreBucket } from "@/hooks/useStatistics"

// ---------------------------------------------------------------------------
// Genre proportional bar
// ---------------------------------------------------------------------------

// 5 opacity steps for each accent family, darkest first
const BOOK_COLORS = [
  "bg-amber-500",
  "bg-amber-400",
  "bg-amber-300",
  "bg-amber-200",
  "bg-amber-100 dark:bg-amber-900",
]
const GAME_COLORS = [
  "bg-blue-500",
  "bg-blue-400",
  "bg-blue-300",
  "bg-blue-200",
  "bg-blue-100 dark:bg-blue-900",
]

function GenreBar({ buckets, colors }: { buckets: GenreBucket[]; colors: string[] }) {
  if (buckets.length === 0) {
    return <div className="h-3 rounded-full bg-muted w-full" />
  }

  const otherPct = Math.max(0, 100 - buckets.reduce((s, b) => s + b.percent, 0))

  return (
    <div className="space-y-2">
      {/* Bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {buckets.map((b, i) => (
          <div
            key={b.genre}
            className={colors[i % colors.length]}
            style={{ width: `${b.percent}%` }}
            title={`${b.genre} ${b.percent}%`}
          />
        ))}
        {otherPct > 0 && (
          <div
            className="bg-muted flex-1"
            title={`Other ${otherPct}%`}
          />
        )}
      </div>

      {/* Labels */}
      <p className="text-[11px] text-muted-foreground leading-snug">
        {buckets.map((b, i) => (
          <span key={b.genre}>
            {i > 0 && <span className="mx-1 opacity-40">·</span>}
            <span className={`font-medium text-foreground`}>{b.genre}</span>
            {" "}
            <span>{b.percent}%</span>
          </span>
        ))}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Rating skew gauge
// ---------------------------------------------------------------------------

function RatingSkew({ score }: { score: number | null }) {
  const pct = score != null ? Math.round((score / 10) * 100) : null

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-widest">
        <span>Tough critic</span>
        <span>Easy rater</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-muted">
        {pct != null && (
          <>
            {/* Filled track up to marker */}
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary/30"
              style={{ width: `${pct}%` }}
            />
            {/* Marker dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary ring-2 ring-background"
              style={{ left: `${pct}%` }}
            />
          </>
        )}
      </div>
      {pct != null && (
        <p className="text-center text-[11px] text-muted-foreground">
          avg {score?.toFixed(1)} / 10
        </p>
      )}
      {pct == null && (
        <p className="text-center text-[11px] text-muted-foreground">No ratings yet</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Insight line — deterministic, derived from stats
// ---------------------------------------------------------------------------

function bookInsight(stats: Statistics): string | null {
  const { favoriteBookGenre, favoriteBookAuthor, booksAverageScore, booksCompleted, booksPagesRead } = stats

  if (favoriteBookGenre && booksCompleted >= 3)
    return `You gravitate toward ${favoriteBookGenre} — it shows up most in your library.`

  if (favoriteBookAuthor && booksCompleted >= 2)
    return `${favoriteBookAuthor} is your most-read author.`

  const avgPages = booksCompleted > 0 ? Math.round(booksPagesRead / booksCompleted) : 0
  if (avgPages > 450)
    return `You lean toward longer, denser reads — your average completed book is over ${avgPages} pages.`

  if (booksAverageScore != null && booksAverageScore >= 8)
    return `You rate books generously. You tend to find the good in what you read.`

  if (booksAverageScore != null && booksAverageScore <= 5)
    return `You hold books to a high standard — scores don't come easily.`

  if (booksCompleted > 0)
    return `You've completed ${booksCompleted} book${booksCompleted === 1 ? "" : "s"} so far.`

  return null
}

function gameInsight(stats: Statistics): string | null {
  const { favoriteGameGenre, favoritePlatform, gamesAverageScore, gamesCompleted, gamesHoursPlayed } = stats

  if (favoriteGameGenre && gamesCompleted >= 3)
    return `Your gaming leans toward ${favoriteGameGenre}.`

  if (gamesHoursPlayed >= 100)
    return `You've logged over ${Math.floor(gamesHoursPlayed)} hours of playtime.`

  if (favoritePlatform && gamesCompleted >= 2)
    return `Most of your gaming happens on ${favoritePlatform}.`

  if (gamesAverageScore != null && gamesAverageScore >= 8)
    return `You're an enthusiastic game rater — you tend to enjoy what you play.`

  if (gamesAverageScore != null && gamesAverageScore <= 5)
    return `You're a tough game critic — you don't hand out high scores lightly.`

  if (gamesCompleted > 0)
    return `You've completed ${gamesCompleted} game${gamesCompleted === 1 ? "" : "s"} so far.`

  return null
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

function TastePanel({
  title,
  icon,
  iconColor,
  genreBuckets,
  genreColors,
  avgScore,
  insight,
}: {
  title: string
  icon: React.ReactNode
  iconColor: string
  genreBuckets: GenreBucket[]
  genreColors: string[]
  avgScore: number | null
  insight: string | null
}) {
  const isEmpty = genreBuckets.length === 0 && avgScore == null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className={iconColor}>{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">
            Add and rate more {title.toLowerCase()} to build your taste profile.
          </p>
        ) : (
          <>
            {/* Genre bar */}
            {genreBuckets.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">
                  Top Genres
                </p>
                <GenreBar buckets={genreBuckets} colors={genreColors} />
              </div>
            )}

            {/* Insight */}
            {insight && (
              <p className="text-sm text-muted-foreground italic leading-relaxed border-l-2 border-muted pl-3">
                {insight}
              </p>
            )}

            {/* Rating skew */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">
                Rating Skew
              </p>
              <RatingSkew score={avgScore} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface TasteMapProps {
  stats: Statistics
}

export function TasteMap({ stats }: TasteMapProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
          Taste Profile
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Derived from items with activity in the selected period.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TastePanel
          title="Books"
          icon={<IconBook className="h-4 w-4" />}
          iconColor="text-amber-500"
          genreBuckets={stats.bookGenreDistribution}
          genreColors={BOOK_COLORS}
          avgScore={stats.booksAverageScore}
          insight={bookInsight(stats)}
        />
        <TastePanel
          title="Games"
          icon={<IconDeviceGamepad2 className="h-4 w-4" />}
          iconColor="text-blue-500"
          genreBuckets={stats.gameGenreDistribution}
          genreColors={GAME_COLORS}
          avgScore={stats.gamesAverageScore}
          insight={gameInsight(stats)}
        />
      </div>
    </div>
  )
}
