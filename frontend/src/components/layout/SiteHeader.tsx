"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TOOLS } from "@/lib/nav";
import { SITE_NAME } from "@/lib/site";

export default function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-name">
          {SITE_NAME}
        </Link>
        <nav aria-label="主要メニュー">
          <ul className="site-nav">
            {TOOLS.map((t) => {
              const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
              return (
                <li key={t.href}>
                  <Link href={t.href} aria-current={active ? "page" : undefined}>
                    {t.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
