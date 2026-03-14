import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { IconArrowLeft } from "@tabler/icons-react";

const LAST_UPDATED = "March 2025";
const CONTACT_EMAIL = "hello@arkiv.app";

export default function Legal() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <Link to="/marketing">
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
            Terms of Service
          </h1>
          <p className="text-muted-foreground mt-2">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Arkiv ("the Service"), you agree to be bound by these Terms of
              Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p>
              Arkiv is a personal library tracker for books and video games. It allows registered
              users to track their reading and gaming progress, organize collections, and discover
              related titles through third-party metadata.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Accounts</h2>
            <p>
              You must create an account to use the Service. You are responsible for maintaining the
              confidentiality of your login credentials and for all activity that occurs under your
              account. Notify us immediately of any unauthorized use.
            </p>
            <p className="mt-3">
              You must provide an accurate email address. Accounts created with false information may
              be terminated.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Scrape or harvest data from the Service without permission</li>
              <li>Upload or transmit malicious code</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Intellectual Property</h2>
            <p>
              The Arkiv name, logo, and all associated design and code are the property of Arkiv
              and its creators. You may not reproduce, distribute, or create derivative works
              without explicit permission.
            </p>
            <p className="mt-3">
              Book and game metadata displayed within the Service is sourced from third-party
              providers (IGDB, Hardcover, Google Books) and remains the property of their respective
              rights holders.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. User Content</h2>
            <p>
              You retain ownership of any content you create within Arkiv (notes, ratings, progress
              data). By using the Service, you grant us a limited license to store and display that
              content solely to operate the Service on your behalf.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Disclaimer of Warranties</h2>
            <p>
              The Service is provided "as is" without warranties of any kind, either express or
              implied. We do not warrant that the Service will be uninterrupted, error-free, or
              free of harmful components.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Arkiv and its operators shall not be liable
              for any indirect, incidental, special, consequential, or punitive damages arising out
              of or related to your use of the Service, even if advised of the possibility of such
              damages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Termination</h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate these Terms.
              You may delete your account at any time from Settings. Upon termination, your data
              will be permanently deleted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of material changes
              by updating the date at the top of this page. Continued use of the Service after
              changes constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contact</h2>
            <p>
              Questions about these Terms can be directed to{" "}
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
          <Link to="/privacy" className="hover:text-foreground underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          <Link to="/contact" className="hover:text-foreground underline-offset-4 hover:underline">
            Contact Us
          </Link>
          <Link to="/marketing" className="hover:text-foreground underline-offset-4 hover:underline">
            arkiv.app
          </Link>
        </div>
      </div>
    </div>
  );
}
