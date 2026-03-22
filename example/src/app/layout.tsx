import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "hono-query-rpc Blog",
  description: "Blog example using Hono RPC + TanStack Query",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-gray-50 text-gray-900 antialiased`}>
        <Providers>
          <header className="border-b border-gray-200 bg-white">
            <div className="mx-auto max-w-4xl px-4 py-4 flex items-center gap-3">
              <span className="text-2xl font-bold tracking-tight">hono-query-rpc</span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                blog example
              </span>
            </div>
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
