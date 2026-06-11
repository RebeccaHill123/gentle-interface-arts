import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Use — Tentra" },
      {
        name: "description",
        content:
          "Terms of Use for Tentra — the SQE revision platform. Eligibility, acceptable use, AI-generated content, subscriptions and limitation of liability.",
      },
      { property: "og:title", content: "Terms of Use — Tentra" },
      {
        property: "og:description",
        content: "The terms that govern your use of Tentra.",
      },
      { property: "og:url", content: "https://tentraapp.com/terms" },
    ],
    links: [{ rel: "canonical", href: "https://tentraapp.com/terms" }],
  }),
});

function TermsPage() {
  return (
    <LegalShell title="Terms of Use" updated="Last updated: June 2026">
      <Section n="1" title="Introduction">
        <p>Welcome to Tentra.</p>
        <p>
          These Terms of Use ("Terms") govern your access to and use of the
          Tentra platform, website and related services available through
          tentraapp.com.
        </p>
        <p>By creating an account or using Tentra, you agree to be bound by these Terms.</p>
        <p>If you do not agree to these Terms, you must not use the platform.</p>
      </Section>

      <Section n="2" title="About Tentra">
        <p>
          Tentra is an educational technology platform designed to support users
          preparing for professional legal examinations, including but not limited to:
        </p>
        <ul>
          <li>Solicitors Qualifying Examination (SQE)</li>
          <li>Bar examinations</li>
          <li>Other professional legal qualifications</li>
        </ul>
        <p>
          Tentra provides study planning tools, revision tracking, analytics,
          educational content and AI-powered learning support.
        </p>
      </Section>

      <Section n="3" title="Eligibility">
        <p>You must be at least 18 years old to use Tentra.</p>
        <p>By using the platform, you confirm that:</p>
        <ul>
          <li>You are at least 18 years of age;</li>
          <li>The information you provide is accurate;</li>
          <li>You will use the platform in accordance with these Terms.</li>
        </ul>
      </Section>

      <Section n="4" title="User Accounts">
        <p>You are responsible for:</p>
        <ul>
          <li>Maintaining the confidentiality of your login credentials;</li>
          <li>All activity that occurs under your account;</li>
          <li>Keeping your account information accurate and up to date.</li>
        </ul>
        <p>You must notify us promptly if you believe your account has been compromised.</p>
        <p>We reserve the right to suspend or terminate accounts that violate these Terms.</p>
      </Section>

      <Section n="5" title="Educational Purpose Only">
        <p>Tentra is provided for educational and informational purposes only.</p>
        <p>
          Tentra does not provide legal advice, academic accreditation,
          professional licensing advice or regulated educational services.
        </p>
        <p>
          Any information, recommendations or study plans generated through the
          platform should be used as guidance only.
        </p>
        <p>
          Users remain solely responsible for their own learning, revision strategy
          and examination preparation.
        </p>
      </Section>

      <Section n="6" title="No Guarantee of Results">
        <p>
          While Tentra aims to support effective study and revision, we make no
          guarantees regarding:
        </p>
        <ul>
          <li>Examination results;</li>
          <li>Pass rates;</li>
          <li>Academic performance;</li>
          <li>Professional qualification outcomes;</li>
          <li>Employment opportunities.</li>
        </ul>
        <p>
          Use of Tentra does not guarantee success in any examination or
          professional assessment.
        </p>
      </Section>

      <Section n="7" title="AI-Generated Content">
        <p>
          Certain features may utilise artificial intelligence and machine
          learning technologies.
        </p>
        <p>AI-generated content may:</p>
        <ul>
          <li>Contain inaccuracies;</li>
          <li>Be incomplete;</li>
          <li>Become outdated;</li>
          <li>Require independent verification.</li>
        </ul>
        <p>
          Users should exercise their own judgement and should not rely solely on
          AI-generated content when preparing for examinations.
        </p>
        <p>
          Tentra accepts no responsibility for decisions made based solely on
          AI-generated outputs.
        </p>
      </Section>

      <Section n="8" title="Acceptable Use">
        <p>You agree not to:</p>
        <ul>
          <li>Use Tentra for unlawful purposes;</li>
          <li>Attempt to gain unauthorised access to systems or accounts;</li>
          <li>Reverse engineer, copy or exploit the platform;</li>
          <li>Upload malicious code or harmful content;</li>
          <li>Interfere with the operation of the platform;</li>
          <li>Share your account with others.</li>
        </ul>
        <p>
          We reserve the right to suspend or terminate accounts that breach these
          requirements.
        </p>
      </Section>

      <Section n="9" title="Intellectual Property">
        <p>All intellectual property rights in Tentra, including:</p>
        <ul>
          <li>Software;</li>
          <li>Branding;</li>
          <li>Logos;</li>
          <li>Study plans;</li>
          <li>Platform design;</li>
          <li>Educational content;</li>
          <li>Analytics and visualisations;</li>
        </ul>
        <p>remain the property of Tentra or its licensors.</p>
        <p>
          Users are granted a limited, non-exclusive and non-transferable licence
          to use the platform for personal educational purposes.
        </p>
        <p>
          Nothing in these Terms transfers ownership of intellectual property
          rights to users.
        </p>
      </Section>

      <Section n="10" title="User Content">
        <p>You retain ownership of information you upload to Tentra.</p>
        <p>
          By uploading content, you grant Tentra a limited licence to store,
          process and use that information solely for the purpose of providing
          the platform and its features.
        </p>
      </Section>

      <Section n="11" title="Availability of Service">
        <p>
          We aim to maintain reliable service but do not guarantee that Tentra
          will be available at all times.
        </p>
        <p>We may:</p>
        <ul>
          <li>Modify features;</li>
          <li>Update functionality;</li>
          <li>Suspend services;</li>
          <li>Remove features;</li>
          <li>Perform maintenance;</li>
        </ul>
        <p>with reasonable notice where practicable.</p>
      </Section>

      <Section n="12" title="Subscription Services">
        <p>Certain features may be offered on a paid subscription basis.</p>
        <p>
          Subscription pricing, billing terms and renewal arrangements will be
          displayed before purchase.
        </p>
        <p>Unless stated otherwise:</p>
        <ul>
          <li>Subscriptions renew automatically;</li>
          <li>Users may cancel future renewals at any time;</li>
          <li>
            Fees already paid are generally non-refundable except where required
            by law, including your statutory 14-day cooling-off right under the
            Consumer Contracts Regulations 2013 where applicable.
          </li>
        </ul>
      </Section>

      <Section n="13" title="Limitation of Liability">
        <p>To the fullest extent permitted by law:</p>
        <p>
          Tentra shall not be liable for any indirect, incidental, consequential
          or special losses arising from the use of the platform.
        </p>
        <p>This includes, without limitation:</p>
        <ul>
          <li>Examination failure;</li>
          <li>Academic outcomes;</li>
          <li>Loss of study data;</li>
          <li>Business interruption;</li>
          <li>Loss of opportunity;</li>
          <li>Reliance on AI-generated content.</li>
        </ul>
        <p>
          Nothing in these Terms excludes liability where exclusion is prohibited
          by applicable law.
        </p>
      </Section>

      <Section n="14" title="Indemnity">
        <p>
          You agree to indemnify and hold harmless Tentra from reasonable costs
          and expenses arising from:
        </p>
        <ul>
          <li>Your misuse of the platform;</li>
          <li>Your breach of these Terms;</li>
          <li>Your violation of applicable laws.</li>
        </ul>
      </Section>

      <Section n="15" title="Termination">
        <p>We may suspend or terminate access to Tentra at any time where:</p>
        <ul>
          <li>These Terms are breached;</li>
          <li>Fraudulent activity is suspected;</li>
          <li>Use of the platform presents legal, operational or security risks.</li>
        </ul>
        <p>
          Users may stop using the platform at any time. Where we terminate a paid
          subscription for reasons within our control, we will provide a pro-rata
          refund for any unused portion of the subscription period.
        </p>
      </Section>

      <Section n="16" title="Changes to These Terms">
        <p>We may update these Terms from time to time.</p>
        <p>The most recent version will always be published on tentraapp.com.</p>
        <p>
          Continued use of Tentra following any update constitutes acceptance of
          the revised Terms. Where changes are material, we will provide
          reasonable notice via email or in-platform notification before they
          take effect.
        </p>
      </Section>

      <Section n="17" title="Contact and Complaints">
        <p>
          If you have any questions about these Terms or wish to raise a
          complaint, please contact us at{" "}
          <a href="mailto:support@tentraapp.com" className="text-pink underline-offset-4 hover:underline">
            support@tentraapp.com
          </a>
          . We aim to respond to all enquiries within 5 business days.
        </p>
      </Section>

      <Section n="18" title="Governing Law">
        <p>
          These Terms shall be governed by and interpreted in accordance with the
          laws of England and Wales.
        </p>
        <p>
          Any disputes arising in connection with these Terms shall be subject to
          the exclusive jurisdiction of the courts of England and Wales.
        </p>
      </Section>
    </LegalShell>
  );
}

/* ---------- shared legal page shell ---------- */

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <BackgroundBlobs />

      <div className="relative">
        <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5 md:px-8 md:py-7">
          <BrandMark />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[13px] font-normal text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
        </header>

        <main className="mx-auto max-w-3xl px-5 pb-24 pt-6 md:px-8 md:pb-32 md:pt-12">
          <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
            Legal
          </div>
          <h1 className="mt-4 text-[2rem] font-light leading-[1.08] tracking-[-0.03em] text-foreground md:text-[2.5rem]">
            {title}
          </h1>
          <p className="mt-3 text-[12.5px] tracking-[0.02em] text-muted-foreground/80">
            {updated}
          </p>

          <div className="mt-12 space-y-10">{children}</div>

          <div className="mt-16 border-t border-border/50 pt-8 text-[12.5px] text-muted-foreground">
            Questions? Email{" "}
            <a
              href="mailto:support@tentraapp.com"
              className="text-pink underline-offset-4 hover:underline"
            >
              support@tentraapp.com
            </a>
            .
          </div>
        </main>
      </div>
    </div>
  );
}

export function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur md:p-8">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-[11px] font-medium tracking-[0.18em] text-muted-foreground/70">
          {n.padStart(2, "0")}
        </span>
        <h2 className="text-[16px] font-medium tracking-[-0.01em] text-foreground md:text-[18px]">
          {title}
        </h2>
      </div>
      <div className="mt-4 space-y-3 text-[14.5px] leading-[1.7] text-muted-foreground [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:marker:text-pink/60">
        {children}
      </div>
    </section>
  );
}
