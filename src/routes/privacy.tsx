import { createFileRoute } from "@tanstack/react-router";
import { LegalShell, Section } from "./terms";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — Tentra" },
      {
        name: "description",
        content:
          "How Tentra collects, uses and protects your personal information under UK GDPR. Data we hold, your rights, and how to contact us.",
      },
      { property: "og:title", content: "Privacy Policy — Tentra" },
      {
        property: "og:description",
        content: "How Tentra handles your personal information.",
      },
      { property: "og:url", content: "https://tentraapp.com/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://tentraapp.com/privacy" }],
  }),
});

function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="Last updated: June 2026">
      <Section n="1" title="Introduction">
        <p>Welcome to Tentra ("Tentra", "we", "our", or "us").</p>
        <p>
          Tentra is an educational technology platform designed to help users
          prepare for professional legal examinations through personalised study
          planning, revision tracking, analytics and AI-powered learning tools.
        </p>
        <p>
          This Privacy Policy explains how we collect, use, store and protect
          your personal information when you use our website and services
          available through tentraapp.com.
        </p>
        <p>By using Tentra, you agree to the practices described in this Privacy Policy.</p>
      </Section>

      <Section n="2" title="Who We Are">
        <p>Tentra is currently operated by a sole trader based in the United Kingdom.</p>
        <p>
          For privacy-related enquiries, please contact:{" "}
          <a href="mailto:support@tentraapp.com" className="text-pink underline-offset-4 hover:underline">
            support@tentraapp.com
          </a>
        </p>
      </Section>

      <Section n="3" title="Information We Collect">
        <p className="font-medium text-foreground">Account Information</p>
        <p>When you create an account, we may collect:</p>
        <ul>
          <li>Name</li>
          <li>Email address</li>
          <li>Account preferences</li>
        </ul>

        <p className="font-medium text-foreground">Study and Performance Data</p>
        <p>When using Tentra, we may collect:</p>
        <ul>
          <li>Exam dates</li>
          <li>Study schedules</li>
          <li>Study session history</li>
          <li>Subject and topic selections</li>
          <li>Progress metrics</li>
          <li>Mock assessment results</li>
          <li>Performance analytics</li>
          <li>Revision activity</li>
        </ul>

        <p className="font-medium text-foreground">Technical Information</p>
        <p>We may automatically collect:</p>
        <ul>
          <li>Device information</li>
          <li>Browser type</li>
          <li>IP address</li>
          <li>Operating system</li>
          <li>Pages visited</li>
          <li>Usage statistics</li>
          <li>Analytics data</li>
        </ul>

        <p className="font-medium text-foreground">Communications</p>
        <p>
          We may collect information you provide when contacting support or
          communicating with us.
        </p>
      </Section>

      <Section n="4" title="How We Use Your Information">
        <p>We use your information to:</p>
        <ul>
          <li>Provide and maintain the Tentra platform</li>
          <li>Create personalised study plans</li>
          <li>Deliver AI-powered coaching and recommendations</li>
          <li>Track progress and performance</li>
          <li>Improve user experience</li>
          <li>Monitor platform usage and reliability</li>
          <li>Respond to support requests</li>
          <li>Prevent fraud, misuse or security issues</li>
          <li>Comply with legal obligations</li>
        </ul>
      </Section>

      <Section n="5" title="AI Features">
        <p>
          Tentra may use artificial intelligence services provided by third-party
          providers to generate personalised study recommendations, coaching
          content and educational insights.
        </p>
        <p>
          Information submitted through AI-powered features may be processed by
          these providers solely for the purpose of delivering the requested
          functionality.
        </p>
        <p>We do not use your study data to sell information to third parties.</p>
      </Section>

      <Section n="6" title="Analytics">
        <p>
          We use analytics tools to understand how users interact with Tentra and
          to improve our services.
        </p>
        <p>Analytics information may include:</p>
        <ul>
          <li>Page views</li>
          <li>Feature usage</li>
          <li>Session duration</li>
          <li>Device information</li>
          <li>General location information derived from IP addresses</li>
        </ul>
        <p>Analytics data is used in aggregate form wherever possible.</p>
      </Section>

      <Section n="7" title="Legal Basis for Processing">
        <p>Where applicable under UK GDPR, we process personal data on the basis of:</p>
        <ul>
          <li>Performance of a contract</li>
          <li>Legitimate business interests</li>
          <li>Compliance with legal obligations</li>
          <li>User consent where required</li>
        </ul>
      </Section>

      <Section n="8" title="Data Storage and Security">
        <p>
          We take reasonable technical and organisational measures to protect
          your information from unauthorised access, loss, misuse or disclosure.
        </p>
        <p>However, no online platform can guarantee absolute security.</p>
        <p>
          Users are responsible for maintaining the confidentiality of their
          account credentials.
        </p>
      </Section>

      <Section n="9" title="Data Retention">
        <p>We retain personal information only for as long as reasonably necessary to:</p>
        <ul>
          <li>Provide our services</li>
          <li>Maintain user accounts</li>
          <li>Comply with legal obligations</li>
          <li>Resolve disputes</li>
          <li>Enforce our agreements</li>
        </ul>
        <p>
          Users may request account deletion at any time by contacting{" "}
          <a href="mailto:support@tentraapp.com" className="text-pink underline-offset-4 hover:underline">
            support@tentraapp.com
          </a>
          .
        </p>
      </Section>

      <Section n="10" title="Sharing Information">
        <p>We do not sell personal information.</p>
        <p>
          We may share information with trusted service providers that help us
          operate Tentra, including:
        </p>
        <ul>
          <li>Authentication providers</li>
          <li>Hosting providers</li>
          <li>Analytics providers</li>
          <li>AI service providers</li>
          <li>Payment providers (if applicable)</li>
        </ul>
        <p>
          These providers are only permitted to process information as necessary
          to provide services to Tentra.
        </p>
      </Section>

      <Section n="11" title="International Transfers">
        <p>
          Some of our service providers may process data outside the United Kingdom.
        </p>
        <p>
          Where international transfers occur, we rely on appropriate safeguards
          such as Standard Contractual Clauses (SCCs) approved by the UK
          Information Commissioner's Office to ensure your data remains
          adequately protected.
        </p>
      </Section>

      <Section n="12" title="Your Rights">
        <p>Subject to applicable law, you may have the right to:</p>
        <ul>
          <li>Access your personal information</li>
          <li>Correct inaccurate information</li>
          <li>Request deletion of information</li>
          <li>Restrict certain processing activities</li>
          <li>Object to processing</li>
          <li>Request data portability</li>
          <li>Withdraw consent where processing is based on consent</li>
        </ul>
        <p>
          Requests may be sent to{" "}
          <a href="mailto:support@tentraapp.com" className="text-pink underline-offset-4 hover:underline">
            support@tentraapp.com
          </a>
          . We aim to respond to all requests within one calendar month of receipt.
        </p>
        <p>
          You also have the right to lodge a complaint with the Information
          Commissioner's Office (ICO) at{" "}
          <a
            href="https://ico.org.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink underline-offset-4 hover:underline"
          >
            ico.org.uk
          </a>{" "}
          if you are concerned about how your personal data is being handled.
        </p>
      </Section>

      <Section n="13" title="Age Requirement">
        <p>
          Tentra is intended for users aged 18 years and over. We do not knowingly
          collect personal information from individuals under 18 years of age.
        </p>
      </Section>

      <Section n="14" title="Changes to this Privacy Policy">
        <p>We may update this Privacy Policy from time to time.</p>
        <p>
          Material changes will be communicated through the website or platform
          where appropriate.
        </p>
        <p>The updated version will always display the most recent revision date.</p>
      </Section>
    </LegalShell>
  );
}
