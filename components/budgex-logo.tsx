"use client";

import Image from "next/image";
import Link from "next/link";

type BudgeXLogoProps = {
  href?: string;
  imageClassName?: string;
  priority?: boolean;
  size?: number;
  subtitle?: string;
  textClassName?: string;
  titleClassName?: string;
};

export function BudgeXLogo({
  href = "/",
  imageClassName = "",
  priority = false,
  size = 58,
  subtitle,
  textClassName = "",
  titleClassName = "",
}: BudgeXLogoProps) {
  return (
    <Link href={href} className={`inline-flex items-center gap-3 ${textClassName}`}>
      <Image
        src="/budgex-logo-transparent.png"
        alt="BudgeX logo"
        width={size}
        height={size}
        priority={priority}
        className={`h-auto w-auto object-contain ${imageClassName}`.trim()}
      />
      <span className="min-w-0">
        <span className={`block text-lg font-semibold tracking-tight ${titleClassName}`.trim()}>
          BudgeX
        </span>
        {subtitle ? (
          <span className="block text-sm text-zinc-500">{subtitle}</span>
        ) : null}
      </span>
    </Link>
  );
}
