"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/stock-market", label: "Stock Market" },
  { href: "/transactions", label: "Transactions" },
  { href: "/credits", label: "Credits" },
  { href: "/budgets", label: "Budgets" },
  { href: "/ai-planner", label: "AI Planner" },
  { href: "/profile", label: "Profile" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();

    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  return (
    <aside className="flex rounded-3xl bg-white p-4 shadow-sm lg:min-h-[calc(100vh-3rem)] lg:flex-col">
      <div className="mb-8">
        <Link href="/dashboard" className="flex justify-center">
          <>
            <Image
              src="/budgex-black.png"
              alt="BudgeX"
              width={1200}
              height={500}
              className="budgex-sidebar-logo budgex-sidebar-logo-light h-auto w-[250px] object-contain"
              priority
            />
            <Image
              src="/budgex-white.png"
              alt="BudgeX"
              width={1200}
              height={500}
              className="budgex-sidebar-logo budgex-sidebar-logo-dark h-auto w-[250px] object-contain"
              priority
            />
          </>
        </Link>
        <p className="app-sidebar-tagline -mt-1 text-center text-xs font-medium tracking-[0.14em] text-zinc-500 uppercase leading-none">
          Your finance, simplified
        </p>
      </div>

      <nav className="space-y-2">
        {links.map((link) => {
          const active = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                active
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={handleSignOut}
        className="mt-6 rounded-2xl bg-zinc-100 px-4 py-3 text-left text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-200 lg:mt-auto"
      >
        Sign Out
      </button>
    </aside>
  );
}
