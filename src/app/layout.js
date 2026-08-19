import "./globals.css";
import PWARegister from "@/components/PWARegister";

export const metadata = {
  title: "Boxing Center — Planning Coachs",
  description: "Plateforme interne de consultation et de gestion des plannings Boxing Center",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" />
        <link rel="icon" href="/favicon.svg?v=bc5" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico?v=bc5" sizes="any" />
        <link rel="icon" href="/favicon.png?v=bc5" type="image/png" sizes="48x48" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=bc5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BC Plannings" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#0F172A" />
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
