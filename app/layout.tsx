import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "BudgeX",
  title: {
    default: "BudgeX",
    template: "%s | BudgeX",
  },
  description:
    "BudgeX is a focused personal finance workspace for budgeting, transactions, credit tracking, and monthly clarity.",
  authors: [{ name: "Aryam Dwivedi" }],
  creator: "Aryam Dwivedi",
  keywords: [
    "budgeting",
    "personal finance",
    "expense tracking",
    "credit tracking",
    "financial planner",
    "BudgeX",
  ],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "BudgeX",
    description:
      "Budget with clarity. Track transactions, credit, and goals from one focused workspace.",
    siteName: "BudgeX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BudgeX",
    description:
      "Budget with clarity. Track transactions, credit, and goals from one focused workspace.",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
