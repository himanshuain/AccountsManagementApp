import localFont from "next/font/local";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { MuiProvider } from "@/providers/MuiThemeProvider";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700"],
});

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "Shop Manager - Clothes Shop Accounting",
  description: "Manage your clothes shop suppliers, transactions, and bills",
  manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3b82f6" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <MuiProvider>
              <ServiceWorkerRegistration />
              {children}
              <Toaster position="bottom-center" theme="dark" />
            </MuiProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
