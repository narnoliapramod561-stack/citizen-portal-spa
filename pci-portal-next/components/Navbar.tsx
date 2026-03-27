"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map as MapIcon, Scan, User, BarChart3 } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Map", href: "/map", icon: MapIcon },
    { label: "Scan", href: "/scan", icon: Scan, primary: true },
    { label: "Stats", href: "/dashboard", icon: BarChart3 },
    { label: "Profile", href: "/profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-[32px] px-6 py-3 flex justify-between items-center shadow-2xl z-50">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        
        if (item.primary) {
            return (
                <Link key={item.href} href={item.href} className="relative -top-8 w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/40 active:scale-90 transition-transform">
                    <Icon className="w-7 h-7 text-slate-950" />
                </Link>
            )
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
