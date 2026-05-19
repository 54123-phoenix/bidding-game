"use client";

import type { Metadata } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const NAV_ITEMS = [
  { href: "/", label: "职业博弈模拟", isBrand: true },
  { href: "/play", label: "开始体验" },
];

function NavLink({ href, label, isBrand, currentPath }: { href: string; label: string; isBrand?: boolean; currentPath: string }) {
  const isActive = currentPath === href || (href !== "/" && currentPath.startsWith(href));
  if (isBrand) {
    return (
      <Link href={href} className="font-bold text-lg text-cyan-400">
        {label}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className={`text-sm transition-colors font-medium ${
        isActive ? "text-cyan-400" : "text-slate-400 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <html lang="zh-CN" className={cn("font-sans", geist.variable)}>
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.href} {...item} currentPath={pathname} />
            ))}
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
