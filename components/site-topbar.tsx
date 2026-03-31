"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings", label: "Settings" },
];

type SiteTopbarProps = {
  showLogo?: boolean;
};

export function SiteTopbar({ showLogo = true }: SiteTopbarProps) {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex justify-end">
      <div className="flex items-center gap-2 rounded-full bg-white/85 p-2 shadow-sm backdrop-blur">
        {links.map((link) => {
          const active =
            pathname === link.href ||
            (link.href === "/dashboard" &&
              pathname !== "/" &&
              pathname !== "/auth" &&
              pathname !== "/settings") ||
            (link.href === "/settings" && pathname === "/settings");

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}

        {showLogo ? (
          <Link
            href="/"
            className="ml-1 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-zinc-200/80 transition-transform hover:scale-[1.03]"
          >
            <Image
              src="/budgex-bx-black-clean.png"
              alt="BudgeX BX logo"
              width={34}
              height={34}
              className="h-8 w-8 object-contain"
            />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
