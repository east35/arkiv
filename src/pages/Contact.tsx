import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconBrandGithub, IconMail } from "@tabler/icons-react";

const CONTACT_EMAIL = "hello@arkiv.app";
const GITHUB_URL = "https://github.com/arkiv-app/arkiv";

export default function Contact() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-10">
          <Link to="/">
            <Button variant="ghost" size="sm" className="-ml-2 mb-6">
              <IconArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <img
              src="/logo/arkiv-logo-black.svg"
              alt="Arkiv"
              className="h-7 dark:hidden"
            />
            <img
              src="/logo/arkiv-logo-white.svg"
              alt="Arkiv"
              className="h-7 hidden dark:block"
            />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mt-6">
            Get in Touch
          </h1>
          <p className="text-muted-foreground mt-3 text-base">
            Have a question, found a bug, or want to share feedback? We'd love to hear from you.
          </p>
        </div>

        <div className="space-y-4">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="flex items-center gap-4 p-5 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-colors group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              <IconMail className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm">Email</p>
              <p className="text-muted-foreground text-sm truncate">{CONTACT_EMAIL}</p>
            </div>
          </a>

          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-5 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-colors group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground group-hover:bg-muted/80 transition-colors">
              <IconBrandGithub className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm">GitHub</p>
              <p className="text-muted-foreground text-sm">Report bugs or request features</p>
            </div>
          </a>
        </div>

        <div className="mt-12 pt-8 border-t border-border/60 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          <Link to="/legal" className="hover:text-foreground underline-offset-4 hover:underline">
            Terms of Service
          </Link>
          <Link to="/" className="hover:text-foreground underline-offset-4 hover:underline">
            arkiv.app
          </Link>
        </div>
      </div>
    </div>
  );
}
