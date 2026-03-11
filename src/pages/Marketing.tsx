import { Link } from "react-router-dom"
import {
  IconArrowRight,
  IconDeviceGamepad2,
  IconBook,
  IconLayoutGrid,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import marketingBg from "../../marketing/bg1.gif"
import screenshotLight from "../../marketing/akiv-screenshot-light.png"
import screenshotDark from "../../marketing/akiv-screenshot-dark.png"

export default function Marketing() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <img
        src={marketingBg}
        alt=""
        className="fixed inset-0 h-full w-full object-cover"
      />
      <div className="fixed inset-0 bg-black/60" />

      <div className="relative z-10">
        <header className="mx-auto flex w-full max-w-[1700px] items-center justify-between px-6 py-6 md:px-10">
          <Link to="/" className="inline-flex items-center">
            <img src="/logo/arkiv-logo-white.svg" alt="Arkiv" className="h-9" />
          </Link>
          <Link
            to="/login"
            className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign In
          </Link>
        </header>

        <main className="mx-auto max-w-[1700px] px-6 pb-16 md:px-10">
          <section className="grid min-h-[68vh] items-center gap-10 py-10 lg:grid-cols-2 lg:gap-14">
            <div className="text-left">
              <h1 className="max-w-2xl text-5xl font-bold tracking-tight text-white md:text-7xl">
                The home for your games and books.
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-white/70 md:text-2xl">
                Track status, progress, and notes in one clean collection. Arkiv gives you a fast,
                visual way to stay on top of everything you are playing and reading.
              </p>
              <div className="mt-10 flex flex-row gap-3">
                <Link to="/register">
                  <Button size="lg" className="group bg-white text-black hover:bg-white/90">
                    Start Free
                    <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
            <div className="w-full">
              <img
                src={screenshotLight}
                alt="Arkiv interface preview in light mode"
                className="block w-full rounded-3xl dark:hidden"
              />
              <img
                src={screenshotDark}
                alt="Arkiv interface preview in dark mode"
                className="hidden w-full rounded-3xl dark:block"
              />
            </div>
          </section>

          <section className="py-10">
            <h2 className="mb-10 text-center text-3xl font-bold text-white md:text-4xl">
              Built for your everyday flow
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { icon: IconDeviceGamepad2, title: "Track Games", copy: "Keep every title, platform, and status in one place." },
                { icon: IconBook, title: "Track Books", copy: "Follow reading progress with pages, notes, and quick edits." },
                { icon: IconLayoutGrid, title: "Browse Fast", copy: "Switch between clean grid and list views instantly." },
              ].map(({ icon: Icon, title, copy }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{copy}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="py-20 text-center">
            <h2 className="text-3xl font-bold text-white md:text-4xl">Ready to organize everything?</h2>
            <p className="mt-4 text-lg text-white/70">
              Move from scattered trackers to one clean, focused collection.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link to="/register">
                <Button size="lg" className="group bg-white text-black hover:bg-white/90">
                  Create Account
                  <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" className="border-white/20 bg-white/10 text-white hover:bg-white/20">
                  Sign In
                </Button>
              </Link>
            </div>
          </section>

          <footer className="pb-8 text-center text-xs text-white/50">
            © 2026 Arkiv · Built by{" "}
            <a
              href="https://jimjordan.design"
              target="_blank"
              rel="noreferrer"
              className="text-white/70 transition-colors hover:text-white"
            >
              Jim Jordan
            </a>
          </footer>
        </main>
      </div>
    </div>
  )
}
