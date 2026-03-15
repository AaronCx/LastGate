import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LastGate — AI Agent Commit Guardian",
  description:
    "Protect your repositories from AI agent mistakes. Automated security scanning, lint checks, build verification, and more.",
  keywords: ["AI", "GitHub", "security", "code review", "CI/CD", "agent"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
