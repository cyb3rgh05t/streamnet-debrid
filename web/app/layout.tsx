import type { Metadata, Viewport } from "next";
import { UpdateWatcher } from "@/components/shell/UpdateWatcher";
import { readPublicConfig, serializePublicConfig } from "@/lib/publicConfig";
import "./globals.css";
import "./tv-guide.css";

// The browser settings come from the server environment on every request, so a .env change needs no rebuild.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "StreamNet Web",
  description: "StreamNet media hub for web, desktop, and TV browsers",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    googleBot: {
      index: false,
      follow: false,
      noarchive: true,
      noimageindex: true,
    },
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: [{ url: "/streamnet-icon.svg", type: "image/svg+xml" }],
    // A brand-new FILENAME (not a ?v= query, which iOS Safari's icon cache can
    // ignore) forces the touch icon to be re-fetched — Safari cached a miss for
    // the old path and kept showing the "A" fallback on Add to Home Screen.
    apple: [{ url: "/streamnet-icon.svg" }],
  },
  appleWebApp: {
    capable: true,
    title: "StreamNet",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Cover the iOS status-bar area — without this the page top bleeds through
  // above fullscreen surfaces like the player.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__STREAMNET_CONFIG__=${serializePublicConfig(readPublicConfig(process.env))};`,
          }}
        />
        {/* iOS reads these raw links most reliably when adding to the home
            screen. `precomposed` is the legacy fallback older iOS honors; both
            carry the version bust. */}
        <link rel="icon" href="/streamnet-icon.svg" type="image/svg+xml" />
      </head>
      <body>
        <UpdateWatcher />
        {children}
      </body>
    </html>
  );
}
