import { useEffect, useState, useRef } from "react";
import { useTheme } from "@/components/theme-provider";
import { Link, useNavigate } from "react-router-dom";
import {
  IconArrowRight,
  IconBrain,
  IconBookmark,
  IconEye,
  IconMessageCircle,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

const featureSections = [
  {
    title: "Track what matters",
    body: "From current page counts to time played, Arkiv keeps progress feeling light, fast, and worth returning to.",
    lightDesktop: "/marketing/desktop/desktop-11.png",
    darkDesktop: "/marketing/desktop/desktop-16.png",
    lightMobile: "/marketing/mobile/mobile-1.png",
    darkMobile: "/marketing/mobile/mobile-6.png",
    align: "right" as const,
  },
  {
    title: "Find anything fast",
    body: "Search books and games with fuzzy matching and add them with rich metadata in seconds, without wrestling exact title formatting.",
    lightDesktop: "/marketing/desktop/desktop-12.png",
    darkDesktop: "/marketing/desktop/desktop-17.png",
    lightMobile: "/marketing/mobile/mobile-2.png",
    darkMobile: "/marketing/mobile/mobile-7.png",
    align: "left" as const,
  },
  {
    title: "A library with memory",
    body: "Browse series, libraries, and collections with recommendations that connect what you love to what comes next.",
    lightDesktop: "/marketing/desktop/desktop-13.png",
    darkDesktop: "/marketing/desktop/desktop-18.png",
    lightMobile: "/marketing/mobile/mobile-3.png",
    darkMobile: "/marketing/mobile/mobile-8.png",
    align: "right" as const,
  },
  {
    title: "Stats worth checking",
    body: "See streaks, completion patterns, ratings, and activity without turning your personal library into spreadsheet work.",
    lightDesktop: "/marketing/desktop/desktop-14.png",
    darkDesktop: "/marketing/desktop/desktop-19.png",
    lightMobile: "/marketing/mobile/mobile-4.png",
    darkMobile: "/marketing/mobile/mobile-9.png",
    align: "left" as const,
  },
];

const aiCards = [
  {
    icon: IconMessageCircle,
    title: "Ask smarter questions",
    body: "Pull quick context, summaries, and connections from the item you are already tracking.",
    bg: "#1914C5",
  },
  {
    icon: IconBrain,
    title: "Go beyond surface-level tracking",
    body: "Follow themes, mechanics, and story threads while you read or play, without losing your place.",
    bg: "#130F94",
  },
  {
    icon: IconBookmark,
    title: "Keep your sources organized",
    body: "Save walkthroughs, essays, and notes next to the item instead of scattering them across tabs.",
    bg: "#0C0A62",
  },
];

const featureSurfaceStyles = [
  {
    section: "bg-black/[0.03] dark:bg-white/[0.03]",
    media: "bg-black/[0.06] dark:bg-white/[0.06]",
  },
  {
    section: "bg-black/[0.06] dark:bg-white/[0.06]",
    media: "bg-black/[0.12] dark:bg-white/[0.12]",
  },
  {
    section: "bg-black/[0.09] dark:bg-white/[0.09]",
    media: "bg-black/[0.18] dark:bg-white/[0.18]",
  },
  {
    section: "bg-black/[0.12] dark:bg-white/[0.12]",
    media: "bg-black/[0.24] dark:bg-white/[0.24]",
  },
] as const;

const aiShowcase = {
  desktop: "/marketing/ai/desktop-20.png",
  mobile: "/marketing/ai/mobile-10.png",
} as const;

type FeatureSection = (typeof featureSections)[number];

function ThemeImage({
  lightSrc,
  darkSrc,
  alt,
  className,
}: {
  lightSrc: string;
  darkSrc: string;
  alt: string;
  className?: string;
}) {
  return (
    <>
      <img
        src={lightSrc}
        alt={alt}
        className={`dark:hidden ${className ?? ""}`}
      />
      <img
        src={darkSrc}
        alt={alt}
        className={`hidden dark:block ${className ?? ""}`}
      />
    </>
  );
}

function GhostLogo({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
    >
      <img
        src="/logo/arkiv-logo-black.svg"
        alt=""
        className="absolute bottom-[-20px] left-1/2 w-[520px] max-w-none -translate-x-1/2 opacity-[0.045] dark:invert md:w-[1300px]"
      />
    </div>
  );
}

function ScreenshotCard({
  lightSrc,
  darkSrc,
  alt,
  className,
}: {
  lightSrc: string;
  darkSrc: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden ${className ?? ""}`}>
      <ThemeImage
        lightSrc={lightSrc}
        darkSrc={darkSrc}
        alt={alt}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function MarketingFeature({
  title,
  body,
  lightDesktop,
  darkDesktop,
  lightMobile,
  darkMobile,
  align,
  sectionClassName,
  mediaClassName,
}: FeatureSection & {
  sectionClassName: string;
  mediaClassName: string;
}) {
  const textBlock = (
    <div className="flex h-full items-center px-6 py-10 md:px-10 md:py-14">
      <div className="max-w-sm">
        <h2 className="text-[2rem] font-semibold leading-[2.25rem] tracking-tight md:text-[2.5rem] md:leading-[2.75rem]">
          {title}
        </h2>
        <p className="mt-4 max-w-xs text-lg leading-7 text-muted-foreground md:text-lg">
          {body}
        </p>
      </div>
    </div>
  );

  const desktopImage = (
    <div className="flex h-full items-center justify-end border-r py-6 pl-6">
      <ScreenshotCard
        lightSrc={lightDesktop}
        darkSrc={darkDesktop}
        alt={title}
        className="w-full max-w-[640px]"
      />
    </div>
  );

  const mobileImage = (
    <div className="px-6">
      <ScreenshotCard
        lightSrc={lightMobile}
        darkSrc={darkMobile}
        alt={title}
        className="mx-auto"
      />
    </div>
  );

  return (
    <section
      className={`relative border-t border-black/8 dark:border-white/8 ${sectionClassName}`}
    >
      <div className={`mx-auto max-w-[1400px] md:hidden ${mediaClassName}`}>
        <div>{textBlock}</div>
        <div>{mobileImage}</div>
      </div>

      <div className="mx-auto hidden max-w-[1400px] md:grid md:min-h-[340px] md:grid-cols-[0.9fr_1.1fr]">
        {align === "left" ? (
          <>
            <div className="border-r dark:border-white/8">{textBlock}</div>
            <div className={mediaClassName}>{desktopImage}</div>
          </>
        ) : (
          <>
            <div className={`${mediaClassName} md:order-2`}>{desktopImage}</div>
            <div className="border-r dark:border-white/8 md:order-1">
              {textBlock}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default function Marketing() {
  const [showHeader, setShowHeader] = useState(false);
  const navigate = useNavigate();
  const handleViewDemo = () => navigate("/demo");
  const { theme, setTheme } = useTheme();
  const prevTheme = useRef(theme);

  // Force system theme for the entire unauthenticated flow — no restore on exit.
  useEffect(() => {
    if (prevTheme.current !== "system") setTheme("system");
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setShowHeader((prev) => (prev ? y > 16 : y > 80));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-36 text-foreground md:pb-0">
      <header
        className={`hidden md:block sticky top-0 z-50 border-b border-black/8 bg-background/92 backdrop-blur-md transition-all duration-300 dark:border-white/8 ${
          showHeader
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-full opacity-0"
        }`}
      >
        <div className="mx-auto flex h-14 items-stretch justify-between pl-5 md:pl-8">
          <img
            src="/logo/arkiv-logo-black.svg"
            alt="Arkiv"
            className="h-7 self-center dark:hidden"
          />
          <img
            src="/logo/arkiv-logo-white.svg"
            alt="Arkiv"
            className="hidden h-7 self-center dark:block"
          />

          <div className="flex h-full items-stretch gap-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleViewDemo}
              className="h-full rounded-none border-l px-6 font-medium hover:bg-black/[0.03]  dark:hover:bg-white/[0.04]"
            >
              View Demo
            </Button>
            <Link to="/register" className="flex">
              <Button
                size="sm"
                className="h-full rounded-none bg-primary px-6 font-medium text-primary-foreground hover:bg-primary/90"
              >
                Sign Up or Log In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-black/8 bg-background dark:border-white/8 md:h-[720px]">
        <GhostLogo className="hidden md:block" />

        <div className="relative mx-auto max-w-[1100px] px-6 pb-14 pt-16 text-left md:flex md:h-full md:flex-col md:justify-center md:px-8 md:pb-20 md:pt-20 md:text-center">
          <img
            src="/logo/arkiv-logo-black.svg"
            alt="Arkiv"
            className="mb-10 h-14 md:hidden dark:invert"
          />

          <h1 className="max-w-[18ch] text-[2.3rem] font-semibold leading-[2.55rem] tracking-tight md:mx-auto md:max-w-[900px] md:text-[4rem] md:leading-[4.25rem]">
            Your books &amp; games.
            <br />
            One sharp, searchable library.
          </h1>
          <p className="mt-5 max-w-[34ch] text-lg leading-7 text-muted-foreground md:mx-auto md:mt-6 md:max-w-[600px] md:text-lg">
            Track status, progress, scores, notes, and discovery across books
            and games in one place, with a system that feels fast enough to keep
            using.
          </p>

          <div className="mt-7 hidden items-start justify-start gap-5 sm:flex-row md:mt-8 md:flex md:items-center md:justify-center">
            <Link to="/register">
              <Button
                size="lg"
                className="h-[62px] min-w-[270px] rounded-none bg-primary px-8 text-lg font-medium text-primary-foreground shadow-none hover:bg-primary/90"
              >
                Sign Up or Log In
                <IconArrowRight className="ml-auto h-6 w-6" />
              </Button>
            </Link>
            <Button
              type="button"
              size="lg"
              onClick={handleViewDemo}
              className="h-[62px] min-w-[270px] rounded-none border border-black/8 bg-background px-8 text-lg font-medium text-primary shadow-none hover:bg-black/[0.03] dark:border-white/0 dark:bg-white dark:text-primary dark:hover:bg-white/95"
            >
              See How It Works
              <IconEye className="ml-auto h-6 w-6" />
            </Button>
          </div>
        </div>
      </section>

      {featureSections.map((feature, index) => (
        <MarketingFeature
          key={feature.title}
          {...feature}
          sectionClassName={featureSurfaceStyles[index].section}
          mediaClassName={featureSurfaceStyles[index].media}
        />
      ))}

      <section className="overflow-hidden bg-primary text-primary-foreground">
        <div className="mx-auto max-w-[1400px] px-6 pt-14 md:px-8 md:pt-18">
          <div className="mx-auto max-w-[760px] text-center">
            <h2 className="mx-auto max-w-[12ch] text-[2rem] font-semibold leading-[2.25rem] tracking-tight [text-wrap:balance] md:max-w-[16ch] md:text-[3rem] md:leading-[3.25rem]">
              An AI layer for every item in your library.
            </h2>
            <p className="mx-auto mt-4 max-w-[58ch] text-lg leading-7 text-primary-foreground/80 md:text-lg">
              Ask questions about the book you are reading or the game you are
              playing, pull in context from outside sources, and keep everything
              tied to the item instead of losing it across browser tabs.
            </p>
          </div>

          <div className="mt-10 flex justify-center md:mt-14">
            <img
              src={aiShowcase.mobile}
              alt="AI library mobile view"
              className="w-full md:hidden"
            />
            <img
              src={aiShowcase.desktop}
              alt="AI library desktop view"
              className="hidden w-full max-w-[1368px] md:block"
            />
          </div>
        </div>
      </section>
      <div className="grid overflow-hidden md:grid-cols-3">
        {aiCards.map(({ icon: Icon, title, body, bg }) => (
          <div
            key={title}
            className="flex px-12 py-12 text-white md:justify-center"
            style={{ backgroundColor: bg }}
          >
            <div className="max-w-[28ch] md:w-full">
              <Icon className="h-5 w-5 text-white/80" />
              <h3 className="mt-4 text-lg font-semibold leading-6 text-white">
                {title}
              </h3>
              <p className="mt-3 text-lg leading-7 text-white/78">{body}</p>
            </div>
          </div>
        ))}
      </div>
      <section className="border-t border-black/8 bg-background py-16 text-center dark:border-white/8 md:py-20">
        <div className="mx-auto max-w-[760px] px-6 md:px-8">
          <h2 className="text-[2rem] font-semibold leading-[2.25rem] tracking-tight md:text-[3rem] md:leading-[3.25rem]">
            Stop juggling trackers.
            <br />
            Start building a library that thinks with you.
          </h2>

          <div className="mt-8 flex items-center justify-center">
            <Link to="/register">
              <Button
                size="lg"
                className="gap-2 rounded-none bg-primary px-5 font-medium text-primary-foreground shadow-none hover:bg-primary/90"
              >
                Sign Up or Log In
                <IconArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-background pt-6">
        <div className="mx-auto max-w-[1400px] px-6 text-sm text-foreground md:px-8">
          <div className="space-y-6 md:hidden">
            <div className="grid grid-cols-3 gap-x-4 gap-y-8 text-center text-[15px] font-medium">
              <a
                href="mailto:hello@arkiv.app"
                className="transition-colors hover:text-foreground"
              >
                Contact Us
              </a>
              <Link
                to="/legal"
                className="transition-colors hover:text-foreground"
              >
                Legal Info
              </Link>
              <Link
                to="/privacy"
                className="transition-colors hover:text-foreground"
              >
                Privacy Policy
              </Link>
              <button
                type="button"
                onClick={() => window.alert("Coming soon")}
                className="text-center transition-colors hover:text-foreground"
              >
                Cookie Settings
              </button>
              <div className="col-span-2 flex justify-center">
                <a
                  href="https://jimjordan.design"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 whitespace-nowrap transition-colors hover:text-foreground"
                >
                  <span>Made in Austin, TX</span>
                  <img
                    src="/marketing/atx-black.svg"
                    alt=""
                    aria-hidden="true"
                    className="h-6 w-auto dark:hidden"
                  />
                  <img
                    src="/marketing/atx-white.svg"
                    alt=""
                    aria-hidden="true"
                    className="hidden h-6 w-auto dark:block"
                  />
                </a>
              </div>
            </div>

            <div className="flex justify-center">
              <img
                src="/marketing/footer-icon-light.svg"
                alt=""
                aria-hidden="true"
                className="h-14 w-auto dark:hidden"
              />
              <img
                src="/marketing/footer-icon-dark.svg"
                alt=""
                aria-hidden="true"
                className="hidden h-14 w-auto dark:block"
              />
            </div>
          </div>

          <div className="hidden md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-5">
            <nav className="flex flex-wrap items-center justify-start gap-x-5 gap-y-2">
              <a
                href="mailto:hello@arkiv.app"
                className="transition-colors hover:text-foreground"
              >
                Contact
              </a>
              <Link
                to="/legal"
                className="transition-colors hover:text-foreground"
              >
                Legal Info
              </Link>
              <Link
                to="/privacy"
                className="transition-colors hover:text-foreground"
              >
                Privacy Policy
              </Link>
            </nav>

            <div className="flex justify-center">
              <img
                src="/marketing/footer-icon-light.svg"
                alt=""
                aria-hidden="true"
                className="dark:hidden"
              />
              <img
                src="/marketing/footer-icon-dark.svg"
                alt=""
                aria-hidden="true"
                className="hidden dark:block"
              />
            </div>

            <div className="flex justify-end">
              <a
                href="https://jimjordan.design"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
              >
                <span>Made in Austin, TX</span>
                <img
                  src="/marketing/atx-black.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-auto dark:hidden"
                />
                <img
                  src="/marketing/atx-white.svg"
                  alt=""
                  aria-hidden="true"
                  className="hidden h-4 w-auto dark:block"
                />
              </a>
            </div>
          </div>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-50 md:hidden">
        <div className="overflow-hidden bg-background">
          <div className="grid grid-cols-2">
            <Link
              to="/register"
              className="flex h-[62px] items-center justify-between gap-4 bg-primary px-6 text-lg font-semibold text-primary-foreground"
            >
              <span>Get Started</span>
              <IconArrowRight className="h-6 w-6 shrink-0" />
            </Link>
            <button
              type="button"
              onClick={handleViewDemo}
              className="flex h-[62px] items-center justify-between gap-4 bg-background px-6 text-left text-lg font-semibold text-primary dark:bg-white dark:text-primary"
            >
              <span>View Demo</span>
              <IconEye className="h-6 w-6 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
