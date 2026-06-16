"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, PlayCircle, Users2, FileBarChart2,
  Megaphone, Settings, Shield, LogOut, Menu, X,
} from "lucide-react";

const NAV = [
  { href: "/admin",            label: "Dashboard",       icon: LayoutDashboard },
  { href: "/admin/windows",    label: "Open a report",   icon: PlayCircle },
  { href: "/admin/teams",      label: "Teams & AMs",     icon: Users2 },
  { href: "/admin/reports",    label: "Reports history", icon: FileBarChart2 },
  { href: "/admin/campaigns",  label: "Campaigns",       icon: Megaphone },
  { href: "/admin/settings",   label: "Settings",        icon: Settings },
];

// Paths that should render WITHOUT the shell (full-screen flows).
const BARE_PATH_PREFIXES = ["/admin/onboarding", "/admin/retention/export"];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const bare = BARE_PATH_PREFIXES.some((p) => pathname.startsWith(p));
  if (bare) return <>{children}</>;

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const activeIdx = NAV.findIndex((n) =>
    n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href),
  );
  const activeLabel = NAV[activeIdx]?.label ?? "";

  return (
    <>
      {/* Global override: admin pages span the full viewport, not the 430px AM body. */}
      <style>{`
        body { max-width: 100vw !important; }
      `}</style>

      <div className="fixed inset-0 flex" style={{ background: "var(--color-bg)" }}>
        {/* Sidebar — desktop persistent, mobile drawer */}
        <aside
          className="flex-shrink-0 flex-col"
          style={{
            width: 240,
            background: "linear-gradient(180deg, #1F2937, #0F172A)",
            color: "white",
            display: drawerOpen ? "flex" : undefined,
            position: drawerOpen ? "fixed" : undefined,
            inset: drawerOpen ? 0 : undefined,
            zIndex: drawerOpen ? 100 : undefined,
          }}
          data-collapsed-on-mobile
        >
          <div className="px-5 pt-5 pb-4 flex items-center justify-between">
            <div className="font-black text-[22px]" style={{ letterSpacing: "-0.035em" }}>
              Log<span style={{ color: "var(--color-brand-gold)" }}>It</span>
            </div>
            {drawerOpen && (
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="px-5 mb-5">
            <span
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-black text-[10px]"
              style={{ background: "rgba(255,200,0,0.16)", color: "var(--color-brand-gold)", letterSpacing: "0.12em" }}
            >
              <Shield className="w-3.5 h-3.5" /> ADMIN
            </span>
          </div>

          <nav className="flex-1 px-3 flex flex-col gap-0.5">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-extrabold text-[13px] transition-colors"
                  style={{
                    background: active ? "rgba(206,17,38,0.18)" : "transparent",
                    color: active ? "white" : "rgba(255,255,255,0.65)",
                    letterSpacing: "-0.005em",
                    borderLeft: active ? "3px solid var(--color-brand-red)" : "3px solid transparent",
                    paddingLeft: active ? 10 : 13,
                  }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={2.25} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="px-3 pb-5 mt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 font-extrabold text-[13px] transition-colors"
              style={{
                background: "transparent",
                color: "rgba(255,255,255,0.65)",
                letterSpacing: "-0.005em",
              }}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" strokeWidth={2.25} />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* Backdrop for mobile drawer */}
        {drawerOpen && (
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 99,
            }}
          />
        )}

        {/* Main area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile top bar */}
          <div
            className="md:hidden flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: "white", borderBottom: "1px solid var(--color-line)" }}
          >
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "#F1F5F9", color: "var(--color-ink)" }}
            >
              <Menu className="w-[18px] h-[18px]" />
            </button>
            <div className="font-black text-[15px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.015em" }}>
              {activeLabel}
            </div>
            <div className="w-9" />
          </div>

          <main className="flex-1 overflow-y-auto" style={{ background: "var(--color-bg)" }}>
            <div className="mx-auto" style={{ maxWidth: 920, padding: "22px 20px 60px" }}>
              {children}
            </div>
          </main>
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          aside[data-collapsed-on-mobile] {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
