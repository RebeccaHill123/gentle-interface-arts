import { useEffect } from "react";
import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { installRememberMeHandler } from "@/lib/remember-me";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Tentra — The Revision App for SQE & NY UBE Students" },
      {
        name: "description",
        content:
          "Tentra is the revision app for SQE1, SQE2 and the NY UBE — personalised study plans, MCQ practice, mock exams, AI coach and progress tracking for future lawyers.",
      },
      { name: "author", content: "Tentra" },
      { property: "og:site_name", content: "Tentra" },
      { property: "og:title", content: "Tentra — SQE & NY UBE Revision for Ambitious Law Students" },
      {
        property: "og:description",
        content:
          "Personalised study plans, MCQ practice and mock exams for SQE and NY UBE candidates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@tentraapp" },
      { name: "twitter:title", content: "Tentra — SQE & NY UBE Revision for Ambitious Law Students" },
      {
        name: "twitter:description",
        content:
          "Personalised study plans, MCQ practice and mock exams for SQE and NY UBE candidates.",
      },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a7ddf46a-3a4f-474c-85b6-c3f508c35fbc/id-preview-1c985e4a--c0d0fdd1-6a49-47d4-acb7-092208251a0f.lovable.app-1778503272714.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a7ddf46a-3a4f-474c-85b6-c3f508c35fbc/id-preview-1c985e4a--c0d0fdd1-6a49-47d4-acb7-092208251a0f.lovable.app-1778503272714.png" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/src/assets/tentra-t.png" },
      { rel: "apple-touch-icon", href: "/src/assets/tentra-t.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Tentra",
          url: "https://tentraapp.com",
          logo: "https://tentraapp.com/favicon.ico",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Tentra",
          url: "https://tentraapp.com",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    installRememberMeHandler();
  }, []);
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}
