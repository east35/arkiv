import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { IconArrowLeft } from "@tabler/icons-react";

const LAST_UPDATED = "March 2025";
const CONTACT_EMAIL = "hello@arkiv.app";

export default function Privacy() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
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
            Privacy Policy
          </h1>
          <p className="text-muted-foreground mt-2">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Overview</h2>
            <p>
              Arkiv ("we", "us", or "our") is a personal library tracker for books and video games.
              This Privacy Policy explains what information we collect, how we use it, and your rights
              regarding that information. We take your privacy seriously and collect only what is
              necessary to provide the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
            <h3 className="text-base font-semibold mb-2">Account Information</h3>
            <p>
              When you create an account, we collect your email address and a hashed password.
              We do not collect your name, phone number, or any other personal identifiers.
            </p>
            <h3 className="text-base font-semibold mb-2 mt-4">Library Data</h3>
            <p>
              We store the books and games you add to your library, including status, progress,
              ratings, notes, and dates you provide. This data is stored in your account and is
              not shared with other users.
            </p>
            <h3 className="text-base font-semibold mb-2 mt-4">Usage Data</h3>
            <p>
              We may collect anonymous usage data (such as page views and feature interactions) to
              improve the product. This data is not linked to your identity.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
              <li>Provide and maintain the Arkiv service</li>
              <li>Authenticate your account and keep it secure</li>
              <li>Fetch metadata for books and games you add (via third-party APIs)</li>
              <li>Improve and develop new features</li>
              <li>Respond to support requests you initiate</li>
            </ul>
            <p className="mt-3">
              We do not sell your personal information to third parties, nor do we use it for
              advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Third-Party Services</h2>
            <p>Arkiv uses the following third-party services:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
              <li>
                <strong>Supabase</strong> — database and authentication infrastructure. Your data is
                stored on Supabase servers. See{" "}
                <a
                  href="https://supabase.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  Supabase's Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong>IGDB (Twitch)</strong> — used to search for and enrich game metadata.
              </li>
              <li>
                <strong>Hardcover / Google Books</strong> — used to search for and enrich book
                metadata.
              </li>
            </ul>
            <p className="mt-3">
              When you search for an item, its title and relevant identifiers may be sent to these
              APIs. No personally identifiable information is sent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Retention</h2>
            <p>
              Your data is retained as long as your account is active. You may delete your account
              at any time from the Settings page, which will permanently remove your library data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Security</h2>
            <p>
              We implement industry-standard security practices, including encrypted connections
              (HTTPS) and hashed password storage. However, no system is completely secure, and
              we cannot guarantee absolute security of your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Children's Privacy</h2>
            <p>
              Arkiv is not directed at children under 13. We do not knowingly collect personal
              information from children. If you believe a child has provided us with personal
              information, please contact us and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes by updating the date at the top of this page. Continued use of Arkiv after
              changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Contact</h2>
            <p>
              If you have questions about this Privacy Policy or how your data is handled, please
              reach out at{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="underline underline-offset-4"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border/60 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link to="/legal" className="hover:text-foreground underline-offset-4 hover:underline">
            Terms of Service
          </Link>
          <Link to="/contact" className="hover:text-foreground underline-offset-4 hover:underline">
            Contact Us
          </Link>
          <Link to="/" className="hover:text-foreground underline-offset-4 hover:underline">
            arkiv.app
          </Link>
        </div>
      </div>
    </div>
  );
}
