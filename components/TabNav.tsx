"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, BarChart3 } from "lucide-react";

const tabs = [
  { href: "/home",   label: "HOME",   icon: Home },
  { href: "/team",   label: "TEAM",   icon: Users },
  { href: "/report", label: "REPORT", icon: BarChart3 },
];

export function TabNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] grid grid-cols-3 z-[60]"
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(16px)",
        borderTop: "1px solid var(--color-line)",
        padding: "10px 0 18px",
      }}
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="relative flex flex-col items-center gap-1 py-1 font-black text-[10px] transition-colors"
            style={{
              color: active ? "var(--color-brand-red)" : "var(--color-muted)",
              letterSpacing: "0.06em",
            }}
          >
            {active && (
              <div
                className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-7 h-[3px]"
                style={{
                  background: "var(--color-brand-red)",
                  borderRadius: "0 0 4px 4px",
                }}
              />
            )}
            <Icon className="w-[22px] h-[22px]" strokeWidth={2} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
