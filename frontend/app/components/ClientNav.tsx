"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "职业博弈模拟", isBrand: true },
  { href: "/dashboard", label: "投递管理" },
  { href: "/play", label: "开始体验" },
];

function NavLink({ href, label, isBrand, currentPath }: { href: string; label: string; isBrand?: boolean; currentPath: string }) {
  const isActive = currentPath === href || (href !== "/" && currentPath.startsWith(href));
  if (isBrand) {
    return (
      <Link href={href} className="text-base font-black tracking-tight text-slate-100">
        {label}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className={`text-sm transition-colors font-medium ${
        isActive ? "text-cyan-300" : "text-slate-500 hover:text-slate-200"
      }`}
    >
      {label}
    </Link>
  );
}

export function ClientNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-slate-800/70 bg-slate-950/72 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-7 px-5">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} {...item} currentPath={pathname} />
        ))}
      </div>
    </nav>
  );
}
