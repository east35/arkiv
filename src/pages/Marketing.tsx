import { Link } from "react-router-dom"
import {
  IconArrowRight,
  IconMessageCircle,
  IconBrain,
  IconBookmark,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

const features = [
  {
    title: "Track what matters",
    body: "From current page counts to time played, Arkiv makes progress feel lightweight, fast, and worth keeping up with.",
    lightImg: "/marketing/desktop/desktop-11.png",
    darkImg: "/marketing/desktop/desktop-16.png",
    mobileLight: "/marketing/mobile/mobile-1.png",
    mobileDark: "/marketing/mobile/mobile-6.png",
    reverse: false,
  },
  {
    title: "Find anything fast",
    body: "Search books and games without needing the exact title formatting, then add them with rich metadata in seconds.",
    lightImg: "/marketing/desktop/desktop-12.png",
    darkImg: "/marketing/desktop/desktop-17.png",
    mobileLight: "/marketing/mobile/mobile-2.png",
    mobileDark: "/marketing/mobile/mobile-7.png",
    reverse: true,
  },
  {
    title: "A library with memory",
    body: "Browse by list, revisit series and collections, and surface recommendations that connect what you love to what comes next.",
    lightImg: "/marketing/desktop/desktop-13.png",
    darkImg: "/marketing/desktop/desktop-18.png",
    mobileLight: "/marketing/mobile/mobile-3.png",
    mobileDark: "/marketing/mobile/mobile-8.png",
    reverse: false,
  },
  {
    title: "Stats worth checking",
    body: "See streaks, completion patterns, score trends, and activity over time without turning your beautiful library into spreadsheet work.",
    lightImg: "/marketing/desktop/desktop-14.png",
    darkImg: "/marketing/desktop/desktop-19.png",
    mobileLight: "/marketing/mobile/mobile-4.png",
    mobileDark: "/marketing/mobile/mobile-9.png",
    reverse: true,
  },
]

export default function Marketing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Nav */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border/40">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-14 flex items-center justify-between">
          <img src="/logo/arkiv-logo-black.svg" alt="Arkiv" className="h-7 dark:hidden" />
          <img src="/logo/arkiv-logo-white.svg" alt="Arkiv" className="h-7 hidden dark:block" />
          <div className="flex items-center gap-3">
            <Link to="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
            <Link to="/register"><Button size="sm">Get Started</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-background min-h-[85vh] flex items-center">
        <span className="absolute inset-0 flex items-center justify-center text-[20vw] font-bold tracking-tighter select-none pointer-events-none text-foreground/[0.04] whitespace-nowrap">
          arkiv
        </span>
        <div className="relative max-w-7xl mx-auto px-6 md:px-10 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              Your books &amp; games.<br />One sharp, searchable library.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              Capture reading and playthrough info into one clean system. Track status,
              progress, ratings, notes, lists, and stats without fighting clunky metadata
              or messy workflows.
            </p>
            <div className="mt-8 flex gap-3">
              <Link to="/register">
                <Button size="lg">Get Started <IconArrowRight className="h-4 w-4" /></Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline">Sign In</Button>
              </Link>
            </div>
          </div>
          <div>
            <img src="/marketing/desktop/desktop-11.png" alt="Arkiv library view" className="rounded-2xl shadow-2xl dark:hidden" />
            <img src="/marketing/desktop/desktop-16.png" alt="Arkiv library view" className="rounded-2xl shadow-2xl hidden dark:block" />
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      {features.map((feature, i) => (
        <section
          key={feature.title}
          className={`py-20 border-t border-border/40 ${i % 2 === 1 ? "bg-[#F8F8F8] dark:bg-[#111111]" : "bg-background"}`}
        >
          <div className="max-w-7xl mx-auto px-6 md:px-10 grid lg:grid-cols-2 gap-12 items-center">
            <div className={feature.reverse ? "lg:order-2" : ""}>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{feature.title}</h2>
              <p className="mt-4 text-lg text-muted-foreground">{feature.body}</p>
            </div>
            <div className={feature.reverse ? "lg:order-1" : ""}>
              {/* Desktop screenshots */}
              <div className="hidden md:block">
                <img src={feature.lightImg} alt={feature.title} className="rounded-2xl shadow-xl dark:hidden" />
                <img src={feature.darkImg} alt={feature.title} className="rounded-2xl shadow-xl hidden dark:block" />
              </div>
              {/* Mobile screenshots */}
              <div className="block md:hidden mx-auto max-w-xs w-full">
                <img src={feature.mobileLight} alt={feature.title} className="rounded-2xl shadow-xl dark:hidden w-full" />
                <img src={feature.mobileDark} alt={feature.title} className="rounded-2xl shadow-xl hidden dark:block w-full" />
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* AI Section */}
      <section className="bg-primary py-20">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">
              An AI layer for every item in your library.
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/80">
              Ask questions about the book you're reading or the game you're playing,
              dig into deeper themes and topics, follow hints for dense or complex games,
              and keep external sources like articles, essays, wikis, and walkthroughs
              tied to the item itself.
            </p>
          </div>

          <div className="mt-12 flex gap-4 overflow-x-auto pb-4">
            <img src="/marketing/desktop/desktop-15.png" alt="AI feature" className="rounded-2xl h-72 w-auto flex-shrink-0" />
            <img src="/marketing/desktop/desktop-16.png" alt="AI feature" className="rounded-2xl h-72 w-auto flex-shrink-0" />
            <img src="/marketing/desktop/desktop-17.png" alt="AI feature" className="rounded-2xl h-72 w-auto flex-shrink-0" />
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-8">
            {[
              {
                icon: IconMessageCircle,
                title: "Ask smarter questions",
                body: "Get quick answers, recipes, and deeper context without leaving your library.",
              },
              {
                icon: IconBrain,
                title: "Beyond surface-level tracking",
                body: "Explore themes, characters, mechanics, lore. Add ideas while you read or play.",
              },
              {
                icon: IconBookmark,
                title: "Keep your sources organized",
                body: "Save walkthroughs, articles, and reference material alongside your notes instead of scattering them across tabs.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <Icon className="h-6 w-6 text-primary-foreground/70 mb-3" />
                <h3 className="text-lg font-semibold text-primary-foreground">{title}</h3>
                <p className="mt-2 text-sm text-primary-foreground/70 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 bg-background text-center border-t border-border/40">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Stop juggling trackers. Start building a library that thinks with you.
          </h2>
          <div className="mt-8">
            <Link to="/register">
              <Button size="lg">
                Get Started <IconArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Nav */}
      <footer className="border-t border-border/40 py-6">
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <img src="/logo/arkiv-logo-black.svg" alt="Arkiv" className="h-6 dark:hidden" />
          <img src="/logo/arkiv-logo-white.svg" alt="Arkiv" className="h-6 hidden dark:block" />
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="mailto:hello@arkiv.app" className="hover:text-foreground transition-colors">Contact Us</a>
            <Link to="/legal" className="hover:text-foreground transition-colors">Legal Info</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <span>Made in Austin, TX</span>
          </nav>
        </div>
      </footer>
    </div>
  )
}
